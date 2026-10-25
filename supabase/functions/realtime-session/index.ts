import { z } from 'npm:zod@3';

import { requireUser } from '../shared/auth.ts';
import { handleOptions, jsonError, jsonOk } from '../shared/cors.ts';
import {
  applicationBlock,
  difficultyExpectations,
  languageName,
  topicLabel,
  type ApplicationContext,
} from '../shared/interview.ts';
import { maxQuestions, realtimeModel } from '../shared/openai.ts';
import { checkRateLimit } from '../shared/ratelimit.ts';
import { clampText, parseBody } from '../shared/validate.ts';

const REALTIME_SESSIONS_URL = 'https://api.openai.com/v1/realtime/sessions';

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

/**
 * Создаёт краткосрочный ephemeral-токен для клиентского WebRTC-подключения
 * к OpenAI Realtime API. Постоянный ключ остаётся только в секретах функции.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Метод не поддерживается.');

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody(req, bodySchema);
  if ('error' in body) return body.error;

  const allowed = await checkRateLimit(auth.supabase, auth.userId, 'realtime-session');
  if (!allowed) {
    return jsonError(429, 'Слишком много голосовых сессий за час. Попробуйте позже.');
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return jsonError(
      503,
      'Голосовой режим не настроен: задайте секрет OPENAI_API_KEY (supabase secrets set OPENAI_API_KEY=...).',
    );
  }

  const { topic, difficulty, language, application } = body.data;
  const questionCount = Math.min(body.data.questionCount, maxQuestions());
  const model = realtimeModel();

  const instructions =
    'Ты — доброжелательный технический интервьюер по frontend-разработке. ' +
    'Проведи голосовое собеседование.\n' +
    `Тема: ${topicLabel(topic)}. Глубина: ${difficultyExpectations(difficulty)}.\n` +
    `Говори на ${languageName(language)} языке. Задай ${questionCount} вопросов по одному: ` +
    'задал вопрос — выслушай ответ, коротко отреагируй (что верно, что стоит уточнить), ' +
    'при необходимости задай один уточняющий вопрос, затем переходи к следующему. ' +
    'Реплики держи короткими и живыми, как в настоящем разговоре. ' +
    'После последнего вопроса подведи короткий итог: сильные стороны и что повторить.' +
    applicationBlock(
      application
        ? { ...application, description: clampText(application.description ?? '') || null }
        : null,
    );

  let response: Response;
  try {
    response = await fetch(REALTIME_SESSIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice: 'alloy',
        instructions,
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: { type: 'server_vad' },
      }),
    });
  } catch {
    return jsonError(502, 'Не удалось связаться с Realtime API. Попробуйте позже.');
  }

  if (!response.ok) {
    if (response.status === 429) {
      return jsonError(429, 'Realtime API перегружен. Попробуйте через пару минут.');
    }
    if (response.status === 401) {
      return jsonError(503, 'Realtime API отклонил ключ. Проверьте секрет OPENAI_API_KEY.');
    }
    const details = await response.text().catch(() => '');
    return jsonError(
      502,
      `Realtime API вернул ошибку ${response.status}${details ? `: ${details.slice(0, 200)}` : '.'}`,
    );
  }

  const payload = await response.json().catch(() => null) as {
    client_secret?: { value?: string; expires_at?: number };
    model?: string;
  } | null;

  const token = payload?.client_secret?.value;
  if (!token) {
    return jsonError(502, 'Realtime API не вернул токен сессии. Попробуйте ещё раз.');
  }

  return jsonOk({
    token,
    model: payload?.model ?? model,
    expires_at: payload?.client_secret?.expires_at ?? null,
  });
});
