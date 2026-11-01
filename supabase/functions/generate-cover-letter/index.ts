import { z } from 'npm:zod@3';

import { requireUser } from '../shared/auth.ts';
import { handleOptions, jsonError, jsonOk } from '../shared/cors.ts';
import { chatJson, GeminiError } from '../shared/gemini.ts';
import { checkRateLimit } from '../shared/ratelimit.ts';
import { clampedString, clampText, parseBody } from '../shared/validate.ts';

const bodySchema = z.object({
  company: z.string().min(1).max(200),
  position: z.string().min(1).max(200),
  description: clampedString(8000).optional(),
  targetRole: z.string().max(200).optional(),
  experienceLevel: z.string().max(100).optional(),
  experienceSummary: clampedString(2000).optional(),
  skills: z
    .array(z.object({ name: z.string().min(1).max(100), level: z.number().min(1).max(5) }))
    .max(50),
});

const resultSchema = z.object({ cover_letter: z.string().min(1) });

const SKILL_LEVEL_NAMES = ['начальный', 'базовый', 'средний', 'уверенный', 'продвинутый'];

/** Приводит ответ модели к строгой схеме: лёгкие модели путают имя ключа. */
function normalizeCoverLetter(raw: unknown): unknown {
  if (typeof raw === 'string') return { cover_letter: raw };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const data = { ...(raw as Record<string, unknown>) };
    if (typeof data.cover_letter !== 'string') {
      for (const key of ['letter', 'coverLetter', 'text']) {
        if (typeof data[key] === 'string') {
          data.cover_letter = data[key];
          break;
        }
      }
    }
    return data;
  }
  return raw;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Метод не поддерживается.');

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody(req, bodySchema);
  if ('error' in body) return body.error;

  const allowed = await checkRateLimit(auth.supabase, auth.userId, 'generate-cover-letter');
  if (!allowed) {
    return jsonError(429, 'Достигнут лимит генераций за час. Немного подождите и попробуйте снова.');
  }

  const { company, position, skills } = body.data;
  const description = clampText(body.data.description ?? '');
  const hasDescription = description.trim().length > 0;

  const profileParts: string[] = [];
  if (body.data.targetRole) profileParts.push(`Целевая роль: ${body.data.targetRole}`);
  if (body.data.experienceLevel) profileParts.push(`Уровень: ${body.data.experienceLevel}`);
  if (body.data.experienceSummary) {
    profileParts.push(`Опыт кандидата: ${clampText(body.data.experienceSummary, 2000)}`);
  }
  profileParts.push(
    'Навыки кандидата (самооценка):\n' +
      (skills.length > 0
        ? skills.map((skill) => `- ${skill.name} (${SKILL_LEVEL_NAMES[skill.level - 1]})`).join('\n')
        : '- не указаны'),
  );

  try {
    const raw = await chatJson(
      'Ты — опытный карьерный консультант, который пишет сопроводительные письма, ' +
        'привлекающие внимание рекрутера за первые две строки. Ты пишешь конкретно и по делу, ' +
        'без канцелярита и штампов вроде «я командный игрок» и «готов обучаться».',
      `Напиши сопроводительное письмо для отклика на вакансию.\n\n` +
        `Компания: ${company}\nДолжность: ${position}\n\n` +
        (hasDescription
          ? `Описание вакансии:\n${description}\n\n`
          : 'Описание вакансии не приложено — опирайся на должность и компанию, не выдумывая требований.\n\n') +
        `Данные кандидата:\n${profileParts.join('\n')}\n\n` +
        'Требования к письму:\n' +
        '1. Объём 250–350 слов (не меньше 200), 4–5 абзацев: приветствие, почему компания, ' +
        'релевантный опыт с конкретикой, чем полезен, завершение.\n' +
        '2. Пиши на языке описания вакансии (если не определён — на русском).\n' +
        '3. Первые две строки объясняют, почему именно эта компания/вакансия — без лести и общих слов.\n' +
        '4. Опирайся только на перечисленные навыки кандидата; 2–3 навыта привяжи к требованиям вакансии конкретно. ' +
        'Не упоминай навыки, которых нет в профиле, и не выдумывай места работы.\n' +
        '5. Без markdown-разметки, списков и эмодзи — только готовый текст письма.\n' +
        '6. Уровень владения (самооценка) используй для выбора того, о чём писать уверенно, но не упоминай сами уровни.\n' +
        'Верни JSON вида {"cover_letter": "..."}',
      1200,
    );

    const parsed = resultSchema.safeParse(normalizeCoverLetter(raw));
    if (!parsed.success) {
      return jsonError(502, 'AI вернул письмо в неожиданном формате. Попробуйте ещё раз.');
    }
    return jsonOk(parsed.data);
  } catch (error) {
    const message = error instanceof GeminiError ? error.message : 'AI-сервис недоступен. Попробуйте позже.';
    return jsonError(502, message);
  }
});
