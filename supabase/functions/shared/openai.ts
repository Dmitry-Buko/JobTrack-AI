/**
 * Централизованная конфигурация моделей OpenAI: названия моделей и лимиты
 * задаются только переменными окружения функции и не дублируются по коду.
 */

const CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

export function textModel(): string {
  return Deno.env.get('OPENAI_TEXT_MODEL') ?? 'gpt-4o-mini';
}

export function realtimeModel(): string {
  return Deno.env.get('OPENAI_REALTIME_MODEL') ?? 'gpt-4o-realtime-preview';
}

export function maxQuestions(): number {
  const raw = Number(Deno.env.get('MAX_QUESTIONS'));
  if (!Number.isFinite(raw) || raw <= 0) return 10;
  return Math.min(Math.floor(raw), 20);
}

export class OpenAIError extends Error {}

interface ChatChoice {
  message?: { content?: unknown };
}

/**
 * Запрос к текстовой модели с обязательным JSON-ответом.
 * Бросает OpenAIError с понятным сообщением — функция превратит его в HTTP-ошибку.
 */
export async function chatJson(
  system: string,
  user: string,
  maxTokens = 3000,
): Promise<unknown> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new OpenAIError(
      'AI-сервис не настроен: задайте секрет OPENAI_API_KEY (supabase secrets set OPENAI_API_KEY=...).',
    );
  }

  let response: Response;
  try {
    response = await fetch(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: textModel(),
        temperature: 0.4,
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
  } catch {
    throw new OpenAIError('Не удалось связаться с AI-сервисом. Проверьте подключение.');
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new OpenAIError(
        'Превышен лимит запросов к AI. Подождите немного и попробуйте снова.',
      );
    }
    if (response.status === 401) {
      throw new OpenAIError('AI-сервис отклонил ключ. Проверьте секрет OPENAI_API_KEY.');
    }
    const details = await response.text().catch(() => '');
    throw new OpenAIError(
      `AI-сервис вернул ошибку ${response.status}${details ? `: ${details.slice(0, 200)}` : '.'}`,
    );
  }

  const payload = await response.json().catch(() => null) as
    | { choices?: ChatChoice[] }
    | null;
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new OpenAIError('AI-сервис вернул пустой ответ.');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new OpenAIError('AI-сервис вернул некорректный JSON.');
  }
}
