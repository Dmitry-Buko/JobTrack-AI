import { handleOptions, jsonError, jsonOk } from '../shared/cors.ts';
import { requireUser } from '../shared/auth.ts';
import { chatJson, GeminiError, maxQuestions } from '../shared/gemini.ts';
import { checkRateLimit } from '../shared/ratelimit.ts';
import { clampText, parseBody } from '../shared/validate.ts';
import {
  applicationBlock,
  difficultyExpectations,
  INTERVIEWER_SYSTEM,
  languageName,
  topicLabel,
  type ApplicationContext,
} from '../shared/interview.ts';
import { z } from 'npm:zod@3';

const bodySchema = z.object({
  topic: z.enum([
    'javascript',
    'typescript',
    'react',
    'redux_toolkit',
    'html_css',
    'browser_apis',
    'networking',
    'mixed',
  ]),
  difficulty: z.enum(['junior', 'junior_plus', 'middle']),
  language: z.enum(['ru', 'en']),
  questionCount: z.number().int().min(1).max(20),
  application: z
    .object({
      company: z.string().max(200),
      position: z.string().max(200),
      description: z.string().max(8000).nullable(),
    })
    .nullable(),
});

const responseSchema = z.object({
  questions: z.array(z.string().min(1)).min(1),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Метод не поддерживается.');

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody(req, bodySchema);
  if ('error' in body) return body.error;

  const allowed = await checkRateLimit(auth.supabase, auth.userId, 'interview-questions');
  if (!allowed) {
    return jsonError(429, 'Слишком много тренировок за последний час. Отдохните и вернитесь позже.');
  }

  const { topic, difficulty, language, application } = body.data;
  const questionCount = Math.min(body.data.questionCount, maxQuestions());

  const userPrompt =
    `Сгенерируй ровно ${questionCount} вопросов для технического собеседования.\n` +
    `Тема: ${topicLabel(topic)}.\n` +
    `Ожидаемая глубина: ${difficultyExpectations(difficulty)}.\n` +
    `Вопросы задавай на ${languageName(language)} языке.\n\n` +
    'Требования к вопросам:\n' +
    '- проверяй понимание, а не только заученные определения;\n' +
    '- используй практические сценарии, просьбы объяснить поведение кода, задачи на поиск ошибок — там, где это уместно уровню;\n' +
    '- каждый вопрос самодостаточен, без нумерации и вариантов ответа;\n' +
    '- не повторяй формулировки;\n' +
    (topic === 'mixed'
      ? '- распредели вопросы по разным темам примерно поровну, не концентрируй всё на одной.\n'
      : '') +
    `Верни JSON вида {"questions": ["вопрос 1", "вопрос 2", ...]} ровно с ${questionCount} вопросами.` +
    applicationBlock(application ? { ...application, description: clampText(application.description ?? '') || null } : null);

  try {
    const raw = await chatJson(INTERVIEWER_SYSTEM, userPrompt, 4000);
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(502, 'AI вернул вопросы в неожиданном формате. Попробуйте ещё раз.');
    }
    return jsonOk({ questions: parsed.data.questions.slice(0, questionCount) });
  } catch (error) {
    const message = error instanceof GeminiError ? error.message : 'AI-сервис недоступен. Попробуйте позже.';
    return jsonError(502, message);
  }
});
