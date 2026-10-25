import { z } from 'npm:zod@3';

import { requireUser } from '../shared/auth.ts';
import { handleOptions, jsonError, jsonOk } from '../shared/cors.ts';
import {
  difficultyExpectations,
  INTERVIEWER_SYSTEM,
  languageName,
  topicLabel,
} from '../shared/interview.ts';
import { chatJson, OpenAIError } from '../shared/openai.ts';
import { checkRateLimit } from '../shared/ratelimit.ts';
import { clampText, parseBody } from '../shared/validate.ts';

const bodySchema = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().max(8000),
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
  hint: z.boolean().optional(),
});

const hintSchema = z.object({ hint: z.string().min(1) });

const evaluationSchema = z.object({
  scores: z.object({
    correctness: z.union([
      z.object({ score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]), comment: z.string() }),
      z.object({ status: z.literal('insufficient_data'), comment: z.string() }),
    ]),
    completeness: z.union([
      z.object({ score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]), comment: z.string() }),
      z.object({ status: z.literal('insufficient_data'), comment: z.string() }),
    ]),
    understanding: z.union([
      z.object({ score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]), comment: z.string() }),
      z.object({ status: z.literal('insufficient_data'), comment: z.string() }),
    ]),
    practical_application: z.union([
      z.object({ score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]), comment: z.string() }),
      z.object({ status: z.literal('insufficient_data'), comment: z.string() }),
    ]),
    explanation_quality: z.union([
      z.object({ score: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]), comment: z.string() }),
      z.object({ status: z.literal('insufficient_data'), comment: z.string() }),
    ]),
  }),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  model_answer: z.string(),
  follow_up_question: z.string().nullable(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Метод не поддерживается.');

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody(req, bodySchema);
  if ('error' in body) return body.error;

  const allowed = await checkRateLimit(auth.supabase, auth.userId, 'evaluate-answer');
  if (!allowed) {
    return jsonError(429, 'Достигнут лимит оценок за час. Немного подождите и продолжите.');
  }

  const { question, answer, topic, difficulty, language, hint } = body.data;
  const questionText = clampText(question, 2000);
  const answerText = clampText(answer);

  try {
    if (hint) {
      // Режим подсказки: направляем, но не раскрываем полный ответ.
      const raw = await chatJson(
        INTERVIEWER_SYSTEM,
        `Вопрос собеседования (${topicLabel(topic)}):\n${questionText}\n\n` +
          `Дай короткую подсказку, которая направит кандидата к ответу, но не раскрывает сам ответ. ` +
          `Подсказку пиши на ${languageName(language)} языке.\n` +
          'Верни JSON вида {"hint": "..."}',
        500,
      );
      const parsed = hintSchema.safeParse(raw);
      if (!parsed.success) {
        return jsonError(502, 'AI вернул подсказку в неожиданном формате.');
      }
      return jsonOk({ hint: parsed.data.hint });
    }

    if (answerText.trim().length < 2) {
      return jsonError(400, 'Ответ слишком короткий для оценки.');
    }

    const raw = await chatJson(
      INTERVIEWER_SYSTEM,
      `Оцени ответ кандидата на вопрос технического собеседования.\n\n` +
        `Тема: ${topicLabel(topic)}. Ожидаемая глубина: ${difficultyExpectations(difficulty)}.\n` +
        `Вопрос:\n${questionText}\n\nОтвет кандидата:\n${answerText}\n\n` +
        `Пояснения пиши на ${languageName(language)} языке. Оцени по пяти критериям ` +
        '(correctness — корректность, completeness — полность, understanding — понимание сути вопроса, ' +
        'practical_application — практическое применение, explanation_quality — качество объяснения). ' +
        'Каждому критерию поставь оценку от 1 до 5 с коротким пояснением; если ответ слишком короткий ' +
        'или критерий неприменим — используй {"status":"insufficient_data","comment":"..."} вместо оценки. ' +
        'В strengths перечисли, что кандидат сказал правильно; в gaps — неточности и пробелы. ' +
        'В model_answer дай эталонный ответ, уместный для указанного уровня. ' +
        'Если уместно задать один уточняющий вопрос — укажи его в follow_up_question, иначе null.\n' +
        'Верни JSON с ключами: scores, strengths, gaps, model_answer, follow_up_question.',
      3500,
    );

    const parsed = evaluationSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(502, 'AI вернул оценку в неожиданном формате. Попробуйте отправить ответ ещё раз.');
    }
    return jsonOk(parsed.data);
  } catch (error) {
    const message = error instanceof OpenAIError ? error.message : 'AI-сервис недоступен. Попробуйте позже.';
    return jsonError(502, message);
  }
});
