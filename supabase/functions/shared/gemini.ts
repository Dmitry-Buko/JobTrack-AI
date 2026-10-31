/**
 * Централизованная конфигурация моделей Gemini: названия моделей и лимиты
 * задаются только переменными окружения функции и не дублируются по коду.
 */

const GENERATE_CONTENT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function textModel(): string {
  return Deno.env.get('GEMINI_TEXT_MODEL') ?? 'gemini-3.8-flash';
}

export function liveModel(): string {
  return Deno.env.get('GEMINI_LIVE_MODEL') ?? 'gemini-3.8-live';
}

export function maxQuestions(): number {
  const raw = Number(Deno.env.get('MAX_QUESTIONS'));
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  return Math.min(Math.floor(raw), 20);
}

export class GeminiError extends Error {}

interface GenerateContentCandidate {
  content?: { parts?: { text?: string }[] };
}

interface GenerateContentResponse {
  candidates?: GenerateContentCandidate[];
  promptFeedback?: { blockReason?: string };
}

/**
 * Запрос к текстовой модели с обязательным JSON-ответом.
 * Бросает GeminiError с понятным сообщением — функция превратит его в HTTP-ошибку.
 */
export async function chatJson(
  system: string,
  user: string,
  maxTokens = 3000,
): Promise<unknown> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new GeminiError(
      'AI-сервис не настроен: задайте секрет GEMINI_API_KEY (supabase secrets set GEMINI_API_KEY=...).',
    );
  }

  let response: Response | null = null;
  try {
    for (let attempt = 0; attempt < 2 && !response; attempt += 1) {
      try {
        const current = await fetch(`${GENERATE_CONTENT_BASE}/${textModel()}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: 'application/json',
              maxOutputTokens: maxTokens,
            },
          }),
          // Бесплатный тариф Gemini бывает перегружен: без таймаута запрос может висеть минутами.
          signal: AbortSignal.timeout(60_000),
        });
        // Одна повторная попытка при перегрузке модели (503).
        if (current.status === 503 && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        response = current;
      } catch {
        // Сетевой сбой или таймаут — пробуем ещё раз.
      }
    }
  } catch {
    throw new GeminiError('Не удалось связаться с AI-сервисом. Проверьте подключение.');
  }

  if (!response) {
    throw new GeminiError('Не удалось связаться с AI-сервисом. Проверьте подключение.');
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new GeminiError(
        'Превышен лимит запросов к AI. Подождите немного и попробуйте снова.',
      );
    }
    if (response.status === 503) {
      throw new GeminiError(
        'Модель AI сейчас перегружена (бесплатный тариф Gemini). Попробуйте через минуту.',
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new GeminiError('AI-сервис отклонил ключ. Проверьте секрет GEMINI_API_KEY.');
    }
    const details = await response.text().catch(() => '');
    throw new GeminiError(
      `AI-сервис вернул ошибку ${response.status}${details ? `: ${details.slice(0, 200)}` : '.'}`,
    );
  }

  const payload = await response.json().catch(() => null) as
    | GenerateContentResponse
    | null;
  const content = (payload?.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!content) {
    if (payload?.promptFeedback?.blockReason) {
      throw new GeminiError(
        'AI-сервис отклонил запрос по соображениям безопасности. Переформулируйте и попробуйте снова.',
      );
    }
    throw new GeminiError('AI-сервис вернул пустой ответ.');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new GeminiError('AI-сервис вернул некорректный JSON.');
  }
}
