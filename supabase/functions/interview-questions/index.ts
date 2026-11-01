import { handleOptions, jsonError, jsonOk } from '../shared/cors.ts';
import { requireUser } from '../shared/auth.ts';
import { chatJson, GeminiError, maxQuestions } from '../shared/gemini.ts';
import { checkRateLimit } from '../shared/ratelimit.ts';
import { clampedString, clampText, parseBody } from '../shared/validate.ts';
import {
  applicationBlock,
  difficultyExpectations,
  INTERVIEWER_SYSTEM,
  languageName,
  topicLabel,
  type ApplicationContext,
} from '../shared/interview.ts';
import { JS_SUBTOPIC_KEYS, subtopicLabel } from '../shared/subtopics.ts';
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
      description: clampedString(8000).nullable(),
    })
    .nullable(),
  // Подтемы теста: только ключи allowlist, без свободного текста.
  subtopics: z.array(z.enum(JS_SUBTOPIC_KEYS as [string, ...string[]])).min(1).max(20).nullable().optional(),
});

const responseSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        subtopic: z.string().nullable(),
      }),
    )
    .min(1),
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
  const subtopics = body.data.subtopics ?? null;

  // Блок тем: только выбранные подтемы, равномерное распределение.
  let topicsBlock = '';
  if (subtopics && subtopics.length > 0) {
    const perTopic = Math.max(1, Math.ceil(questionCount / subtopics.length));
    topicsBlock =
      `\nПодтемы (используй только их, ничего сверх списка):\n` +
      subtopics.map((key) => `- ${subtopicLabel(key)}`).join('\n') +
      `\nРаспредели вопросы по этим подтемам равномерно (примерно по ${perTopic} на тему),` +
      ` и пометь каждый вопрос ключом подтемы из списка: ${subtopics.join(', ')}.\n` +
      'Не добавляй вопросы по темам вне списка.\n';
  }

  const userPrompt =
    `Сгенерируй ровно ${questionCount} вопросов для технического собеседования.\n` +
    `Тема: ${topicLabel(topic)}.\n` +
    `Ожидаемая глубина: ${difficultyExpectations(difficulty)}.\n` +
    `Вопросы задавай на ${languageName(language)} языке.\n` +
    topicsBlock +
    '\nТребования к вопросам:\n' +
    '- проверяй понимание, а не только заученные определения;\n' +
    '- используй практические сценарии, просьбы объяснить поведение кода, задачи на поиск ошибок — там, где это уместно уровню;\n' +
    '- каждый вопрос самодостаточен, без нумерации и вариантов ответа;\n' +
    '- не повторяй формулировки;\n' +
    (topic === 'mixed' && !subtopics
      ? '- распредели вопросы по разным темам примерно поровну, не концентрируй всё на одной.\n'
      : '') +
    `Верни JSON вида {"questions": [{"question": "...", "subtopic": "ключ или null"}]} ровно с ${questionCount} вопросами.` +
    applicationBlock(application ? { ...application, description: clampText(application.description ?? '') || null } : null);

  try {
    const raw = await chatJson(INTERVIEWER_SYSTEM, userPrompt, 4000);
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(502, 'AI вернул вопросы в неожиданном формате. Попробуйте ещё раз.');
    }

    let questions = parsed.data.questions.slice(0, questionCount);
    if (subtopics && subtopics.length > 0) {
      // Страховка от «выдуманных» подтем: неизвестный ключ — null, а не текст в данных.
      questions = questions.map((item) => ({
        question: item.question,
        subtopic: item.subtopic != null && JS_SUBTOPIC_KEYS.includes(item.subtopic)
          ? item.subtopic
          : null,
      }));
    }
    return jsonOk({ questions });
  } catch (error) {
    const message = error instanceof GeminiError ? error.message : 'AI-сервис недоступен. Попробуйте позже.';
    return jsonError(502, message);
  }
});
