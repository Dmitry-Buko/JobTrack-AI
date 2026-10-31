# Миграция JobTrack AI с OpenAI на Gemini (голос + весь текстовый AI)

Полная замена OpenAI на Gemini одним бесплатным ключом AI Studio. Архитектура сохраняется: ключ только в Supabase secrets, клиент получает ephemeral-токен через edge-функцию. Контракты `{token, model, expires_at}` и ответы текстовых функций не меняются — фронтенд-типы, zod-схемы, БД и UI остаются как есть.

## Backend (supabase/functions)

**1. `shared/openai.ts` → новый `shared/gemini.ts`** (импорт меняется в 4 текстовых функциях, их логика/промпты/схемы не трогаются)
- `chatJson(system, user, maxTokens)` → POST `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` с заголовком `x-goog-api-key`; тело: `systemInstruction`, `contents`, `generationConfig: {temperature: 0.4, responseMimeType: 'application/json', maxOutputTokens}`. Ответ: `candidates[0].content.parts[*].text` → `JSON.parse`.
- `GeminiError` с теми же русскими сообщениями (429 → лимит, 401/403 → ключ отклонён, блокировка по safety/MAX_TOKENS → понятная ошибка).
- Переменные: `GEMINI_API_KEY` (обязателен), `GEMINI_TEXT_MODEL` (дефолт — актуальный flash, уточню в доках при реализации), `GEMINI_LIVE_MODEL` (дефолт `gemini-3.8-live`). `maxQuestions()` переносится без изменений.

**2. `realtime-session/index.ts`** — вместо `api.openai.com/v1/realtime/sessions`:
- POST `https://generativelanguage.googleapis.com/v1beta/auth_tokens` с `x-goog-api-key`, тело: `{uses: 1, newSessionExpireTime: +2 мин, liveConnectConstraints: {model, config: {responseModalities: ['AUDIO'], systemInstruction: инструкции}}}`. Инструкции интервьюера (topic/difficulty/language/application) и весь auth/ratelimit — без изменений.
- Возврат: `{token: <name>, model, expires_at}` — тот же контракт с клиентом. Преимущество: инструкции заперты на сервере в constraints.

## Frontend (src)

**3. `package.json`** — добавить зависимость `@google/genai`.

**4. `src/services/realtime/useRealtimeSession.ts`** (227 строк) — переписать внутренности, публичный API хука (`start/stop/toggleMute/status/transcript`) сохранить, чтобы `VoiceSessionView.tsx` не менялся:
- Подключение: `new GoogleGenAI({apiKey: token})` → `ai.live.connect({model, config: {responseModalities: AUDIO}, callbacks})` вместо RTCPeerConnection+SDP.
- Захват микрофона: `getUserMedia` → AudioContext 16 кГц → AudioWorklet → PCM16 → base64 → `session.sendRealtimeInput({audio: ...})` (браузерный WebRTC-стек больше не кодирует сам — раньше это делал он).
- Воспроизведение: входящие аудио-чанки `serverContent.modelTurn` → декод через AudioContext в очередь; `serverContent.interrupted` → очистка очереди (перебивания работают).
- Транскрипт: включить input/output transcription в конфиге, смэпить на текущую модель строк с дедупликацией по реплике.
- Мут: перестать отправлять чанки. Ошибки/`goAway` → русские сообщения, как сейчас.

**5. `VoiceSessionView.tsx`** — только текст дисклеймера: «OpenAI» → «Google (Gemini)».

**6. `README.md`** — раздел «Настройка AI»: бесплатный ключ из Google AI Studio → `supabase secrets set GEMINI_API_KEY=...`, таблица переменных `GEMINI_TEXT_MODEL`/`GEMINI_LIVE_MODEL`, обновить security-заметку и упоминание лимитов бесплатного тарифа.

`aiApi.ts`, `schemas.ts`, типы, БД, миграции, остальные компоненты — без изменений (контракты сохранены).

## Проверка

- `npm run check` должен остаться зелёным (существующие 42 теста realtime/OpenAI не затрагивают).
- Точные ID моделей и поля transcription сверю с актуальными доками в момент реализации — env-переменные позволяют поменять модель без правки кода.

## Что нужно от тебя (после моей части)

1. Создать бесплатный ключ: https://aistudio.google.com → «Get API key».
2. Поставить Supabase CLI и залогиниться: `npm i -g supabase` → `supabase login`.
3. `supabase link --project-ref qbrpteadnuzedljiaihm`
4. `supabase secrets set GEMINI_API_KEY=<твой ключ>`
5. Задеплоить 5 функций: `supabase functions deploy`
6. Дальше я сам прогоняю живые проверки в браузере: текстовая тренировка, анализ вакансии, отчёт и голосовая сессия на русском.

## Риски

- Бесплатные лимиты Gemini динамические и урезались в 2025 (десятки запросов/день на Flash) — для демо достаточно; при 429 функции уже возвращают понятную русскую ошибку.
- Если free tier не пустит в Live API — меняется модель через `GEMINI_LIVE_MODEL` либо включается биллинг (решение за тобой).
- Старый код OpenAI остаётся в git-истории; переключателя провайдеров не делаю (лишняя сложность для портфолио-проекта).