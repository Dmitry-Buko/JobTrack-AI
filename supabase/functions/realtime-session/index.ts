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
import { liveModel, maxQuestions } from '../shared/gemini.ts';
import { checkRateLimit } from '../shared/ratelimit.ts';
import { clampText, parseBody } from '../shared/validate.ts';

const AUTH_TOKENS_URL = 'https://generativelanguage.googleapis.com/v1beta/auth_tokens';

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
 * Создаёт краткосрочный ephemeral-токен для клиентского WebSocket-подключения
 * к Gemini Live API. Постоянный ключ остаётся только в секретах функции,
 * а инструкции интервьюера заперты в liveConnectConstraints на сервере.
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

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonError(
      503,
      'Голосовой режим не настроен: задайте секрет GEMINI_API_KEY (supabase secrets set GEMINI_API_KEY=...).',
    );
  }

  const { topic, difficulty, language, application } = body.data;
  const questionCount = Math.min(body.data.questionCount, maxQuestions());
  const model = liveModel();

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

  // Токен годен для старта одной сессии в течение двух минут после выдачи.
  // Конфигурация (модель + инструкции + транскрипция) запекается в токен:
  // поля BidiGenerateContentSetup инлайнятся, без обёртки config.
  const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  let response: Response;
  try {
    response = await fetch(AUTH_TOKENS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        uses: 1,
        newSessionExpireTime,
        bidiGenerateContentSetup: {
          model: `models/${model}`,
          generationConfig: { responseModalities: ['AUDIO'] },
          systemInstruction: { parts: [{ text: instructions }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      }),
    });
  } catch {
    return jsonError(502, 'Не удалось связаться с Gemini Live API. Попробуйте позже.');
  }

  if (!response.ok) {
    if (response.status === 429) {
      return jsonError(429, 'Gemini Live API перегружен. Попробуйте через пару минут.');
    }
    if (response.status === 401 || response.status === 403) {
      return jsonError(503, 'Gemini Live API отклонил ключ. Проверьте секрет GEMINI_API_KEY.');
    }
    const details = await response.text().catch(() => '');
    return jsonError(
      502,
      `Gemini Live API вернул ошибку ${response.status}${details ? `: ${details.slice(0, 200)}` : '.'}`,
    );
  }

  const payload = await response.json().catch(() => null) as {
    name?: string;
    expireTime?: string;
  } | null;

  const token = payload?.name;
  if (!token) {
    return jsonError(502, 'Gemini Live API не вернул токен сессии. Попробуйте ещё раз.');
  }

  const expiresAt = payload?.expireTime ? Date.parse(payload.expireTime) : null;

  // expires_at отправляем только числом: null на клиенте ломает zod-схему
  // (z.number().optional() не принимает null).
  const result: { token: string; model: string; expires_at?: number } = { token, model };
  if (expiresAt !== null && Number.isFinite(expiresAt)) {
    result.expires_at = expiresAt;
  }

  return jsonOk(result);
});
