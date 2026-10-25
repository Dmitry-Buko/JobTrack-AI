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

const messageSchema = z.object({
  role: z.enum(['assistant', 'user']),
  content: z.string().max(4000),
  evaluation: z.unknown().optional(),
});

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
  messages: z.array(messageSchema).min(1).max(200),
});

const reportSchema = z.object({
  summary: z.string(),
  total_questions: z.number().int().nonnegative(),
  answered_questions: z.number().int().nonnegative(),
  skipped_questions: z.number().int().nonnegative(),
  strengths: z.array(z.string()),
  weak_topics: z.array(z.string()),
  weak_answers: z.array(z.object({ question: z.string(), issue: z.string() })),
  topics_to_review: z.array(z.string()),
  recommendations: z.array(z.string()),
  conclusion: z.string(),
});

/** Компактная выжимка диалога для промпта. */
function transcript(messages: z.infer<typeof messageSchema>[]): string {
  return messages
    .map((message) => {
      const prefix = message.role === 'assistant' ? 'Интервьюер' : 'Кандидат';
      let line = `${prefix}: ${clampText(message.content, 1500)}`;
      if (message.evaluation && typeof message.evaluation === 'object') {
        const scores = (message.evaluation as { scores?: Record<string, { score?: number }> })
          .scores;
        if (scores) {
          const numeric = Object.entries(scores)
            .filter(([, value]) => typeof value?.score === 'number')
            .map(([key, value]) => `${key}:${value.score}`)
            .join(', ');
          if (numeric) line += ` [оценки: ${numeric}]`;
        }
      }
      return line;
    })
    .join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Метод не поддерживается.');

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody(req, bodySchema);
  if ('error' in body) return body.error;

  const allowed = await checkRateLimit(auth.supabase, auth.userId, 'session-report');
  if (!allowed) {
    return jsonError(429, 'Достигнут лимит запросов за час. Отчёт можно будет сформировать чуть позже.');
  }

  const { topic, difficulty, language, messages } = body.data;

  try {
    const raw = await chatJson(
      INTERVIEWER_SYSTEM,
      `Составь итоговый отчёт по технической тренировке.\n\n` +
        `Тема: ${topicLabel(topic)}. Глубина: ${difficultyExpectations(difficulty)}.\n` +
        `Отчёт пиши на ${languageName(language)} языке.\n\n` +
        `Стенограмма диалога:\n${transcript(messages)}\n\n` +
        'В summary дай 2–3 предложения об общем впечатлении. ' +
        'В strengths — сильные стороны кандидата. В weak_topics — темы с пробелами. ' +
        'В weak_answers — 1–3 примера неточных ответов (question + короткое описание проблемы issue). ' +
        'В topics_to_review — конкретные темы для повторения. В recommendations — что делать дальше. ' +
        'В conclusion — честный вывод без гарантий результата: это тренировка, а не экзамен. ' +
        'Не выдумывай факты, которых нет в стенограмме.\n' +
        'Посчитай total_questions (всего вопросов), answered_questions (дано ответов) и ' +
        'skipped_questions (пропущено) по стенограмме.\n' +
        'Верни JSON с ключами: summary, total_questions, answered_questions, skipped_questions, ' +
        'strengths, weak_topics, weak_answers, topics_to_review, recommendations, conclusion.',
      3000,
    );

    const parsed = reportSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(502, 'AI вернул отчёт в неожиданном формате. Попробуйте ещё раз.');
    }
    return jsonOk(parsed.data);
  } catch (error) {
    const message = error instanceof OpenAIError ? error.message : 'AI-сервис недоступен. Попробуйте позже.';
    return jsonError(502, message);
  }
});
