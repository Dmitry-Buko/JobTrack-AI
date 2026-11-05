import { assertRejects } from '@std/assert';

import { chatJson, GeminiError } from './gemini.ts';

/**
 * Все проверки chatJson собраны в один Deno.test со step'ами:
 * кейсы подменяют globalThis.fetch и env-переменные, поэтому обязаны
 * выполняться строго последовательно (deno test по умолчанию параллелит).
 */

/** Подменяет globalThis.fetch последовательностью ответов/ошибок. */
function stubFetch(
  responses: (Response | Error)[],
): { calls: string[]; restore: () => void } {
  const original = globalThis.fetch;
  const calls: string[] = [];
  let index = 0;
  globalThis.fetch = ((_input: RequestInfo | URL, _init?: RequestInit) => {
    calls.push(String(_input));
    const next = responses[Math.min(index, responses.length - 1)];
    index += 1;
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next);
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

/** Устанавливает env-переменную и возвращает восстановитель прежнего значения. */
function stubEnv(name: string, value: string | undefined): () => void {
  const had = Deno.env.get(name);
  if (value === undefined) Deno.env.delete(name);
  else Deno.env.set(name, value);
  return () => {
    if (had === undefined) Deno.env.delete(name);
    else Deno.env.set(name, had);
  };
}

/** Ответ generateContent: 200 с текстом кандидата либо ошибкой с кодом. */
function geminiResponse(text: string, init?: { status?: number; blockReason?: string }): Response {
  const status = init?.status ?? 200;
  if (status !== 200) return new Response('api error', { status });
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] } }],
      promptFeedback: init?.blockReason ? { blockReason: init.blockReason } : undefined,
    }),
    { status },
  );
}

Deno.test('chatJson', async (t) => {
  await t.step('требует настроенный секрет GEMINI_API_KEY', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', undefined);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'GEMINI_API_KEY');
    } finally {
      restoreKey();
    }
  });

  await t.step('повторяет запрос один раз при 503 и возвращает JSON', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([
      geminiResponse('', { status: 503 }),
      geminiResponse('{"answer": 42}'),
    ]);
    try {
      const data = await chatJson('sys', 'user');
      if (JSON.stringify(data) !== JSON.stringify({ answer: 42 })) {
        throw new Error(`неожиданный ответ: ${JSON.stringify(data)}`);
      }
      if (fetchStub.calls.length !== 2) {
        throw new Error(`ожидалось 2 вызова fetch, было ${fetchStub.calls.length}`);
      }
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });

  await t.step('сдаётся после двух 503 подряд', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([geminiResponse('', { status: 503 })]);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'перегружена');
      if (fetchStub.calls.length !== 2) {
        throw new Error(`ожидалось 2 вызова fetch, было ${fetchStub.calls.length}`);
      }
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });

  await t.step('сетевой сбой обоих попыток даёт понятную ошибку', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([new TypeError('network down')]);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'Не удалось связаться');
      if (fetchStub.calls.length !== 2) {
        throw new Error(`ожидалось 2 вызова fetch, было ${fetchStub.calls.length}`);
      }
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });

  await t.step('таймаут (AbortError) обрабатывается как сетевой сбой', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([
      new DOMException('The operation was aborted', 'AbortError'),
    ]);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'Не удалось связаться');
      if (fetchStub.calls.length !== 2) {
        throw new Error(`ожидалось 2 вызова fetch, было ${fetchStub.calls.length}`);
      }
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });

  await t.step('429 от Gemini превращается в сообщение про лимит', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([geminiResponse('', { status: 429 })]);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'лимит');
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });

  await t.step('401 превращается в сообщение про ключ', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([geminiResponse('', { status: 401 })]);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'ключ');
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });

  await t.step('403 превращается в сообщение про ключ', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([geminiResponse('', { status: 403 })]);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'ключ');
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });

  await t.step('пустой ответ с blockReason даёт сообщение о безопасности', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([geminiResponse('', { blockReason: 'SAFETY' })]);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'безопасности');
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });

  await t.step('пустой ответ без blockReason даёт сообщение про пустой ответ', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([geminiResponse('   ')]);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'пустой ответ');
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });

  await t.step('не-JSON в ответе модели даёт понятную ошибку', async () => {
    const restoreKey = stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchStub = stubFetch([geminiResponse('это не JSON')]);
    try {
      await assertRejects(() => chatJson('sys', 'user'), GeminiError, 'некорректный JSON');
    } finally {
      fetchStub.restore();
      restoreKey();
    }
  });
});
