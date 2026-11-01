import { z } from 'npm:zod@3';

import { requireUser } from '../shared/auth.ts';
import { handleOptions, jsonError, jsonOk } from '../shared/cors.ts';
import { chatJson, GeminiError } from '../shared/gemini.ts';
import { checkRateLimit } from '../shared/ratelimit.ts';
import { clampedString, clampText, parseBody } from '../shared/validate.ts';

const ANALYST_SYSTEM =
  'Ты — карьерный консультант и технический рекрутёр по frontend-разработке. ' +
  'Ты аккуратен в формулировках и никогда не утверждаешь, что человек чем-то не владеет, ' +
  'если этого нет в данных: говоришь «не указано в профиле» или «необходимо проверить». ' +
  'Ты всегда отвечаешь строго валидным JSON без markdown-обёрток.';

const bodySchema = z.object({
  company: z.string().max(200),
  position: z.string().max(200),
  // Вставленное описание вакансии может быть длинным — обрезаем до валидации.
  description: clampedString(8000, { min: 1 }),
  targetRole: z.string().max(200).nullable(),
  skills: z
    .array(z.object({ name: z.string().max(120), level: z.number().int().min(1).max(5) }))
    .max(100),
});

const analysisSchema = z.object({
  summary: z.string(),
  matched_skills: z.array(z.object({ name: z.string(), comment: z.string() })),
  unconfirmed_requirements: z.array(z.object({ requirement: z.string(), note: z.string() })),
  needs_verification: z.array(z.object({ requirement: z.string(), note: z.string() })),
  preparation_recommendations: z.array(z.string()),
  possible_interview_questions: z.array(z.string()),
});

/**
 * Приводит ответ модели к строгой схеме: лёгкие модели пропускают массивы,
 * путают названия ключей или возвращают строки вместо объектов.
 */
function normalizeAnalysis(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const data = { ...(raw as Record<string, unknown>) };

  const objectArray = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : [];
  const stringArray = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      : [];
  const text = (value: unknown): string =>
    typeof value === 'string' ? value : value == null ? '' : String(value);

  if (typeof data.summary !== 'string') data.summary = text(data.summary);

  data.matched_skills = objectArray(data.matched_skills)
    .map((item) => ({ name: text(item.name), comment: text(item.comment ?? item.note) }))
    .filter((item) => item.name !== '');

  const requirementArray = (value: unknown) =>
    objectArray(value)
      .map((item) => ({ requirement: text(item.requirement ?? item.name), note: text(item.note ?? item.comment) }))
      .filter((item) => item.requirement !== '');

  data.unconfirmed_requirements = requirementArray(data.unconfirmed_requirements);
  data.needs_verification = requirementArray(data.needs_verification);
  data.preparation_recommendations = stringArray(data.preparation_recommendations);
  data.possible_interview_questions = stringArray(data.possible_interview_questions);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Метод не поддерживается.');

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody(req, bodySchema);
  if ('error' in body) return body.error;

  const allowed = await checkRateLimit(auth.supabase, auth.userId, 'analyze-job');
  if (!allowed) {
    return jsonError(429, 'Достигнут лимит анализов за час. Попробуйте позже.');
  }

  const { company, position, description, targetRole, skills } = body.data;

  const skillsBlock = skills.length
    ? skills.map((skill) => `${skill.name} (самооценка: ${skill.level}/5)`).join('\n')
    : 'Навыки не заполнены.';

  try {
    const raw = await chatJson(
      ANALYST_SYSTEM,
      `Проанализируй соответствие между вакансией и профилем кандидата.\n\n` +
        `Вакансия: ${position} в компании «${company}».\n` +
        `Описание вакансии:\n${clampText(description)}\n\n` +
        `Целевая должность кандидата: ${targetRole ?? 'не указана'}.\n` +
        `Профиль навыков (уровни — самооценка, не подтверждённый результат):\n${skillsBlock}\n\n` +
        'Правила:\n' +
        '- matched_skills: технологии и навыки из вакансии, которые совпадают с профилем, с коротким комментарием;\n' +
        '- unconfirmed_requirements: требования вакансии, которых нет в профиле — формулируй как «не указано в профиле», не как «не владеет»;\n' +
        '- needs_verification: требования, где самооценки недостаточно и стоит проверить знание на тренировке;\n' +
        '- preparation_recommendations: конкретные шаги по подготовке;\n' +
        '- possible_interview_questions: 5–8 вероятных вопросов интервьюера по этой вакансии.\n' +
        'Используй только требования из описания вакансии, ничего не выдумывай. Пиши по-русски.\n' +
        'Формат ответа (ключи и структура точно такие): {"summary":"...","matched_skills":[{"name":"...","comment":"..."}],' +
        '"unconfirmed_requirements":[{"requirement":"...","note":"..."}],"needs_verification":[{"requirement":"...","note":"..."}],' +
        '"preparation_recommendations":["..."],"possible_interview_questions":["..."]}',
      3000,
    );

    const parsed = analysisSchema.safeParse(normalizeAnalysis(raw));
    if (!parsed.success) {
      return jsonError(502, 'AI вернул анализ в неожиданном формате. Попробуйте ещё раз.');
    }
    return jsonOk(parsed.data);
  } catch (error) {
    const message = error instanceof GeminiError ? error.message : 'AI-сервис недоступен. Попробуйте позже.';
    return jsonError(502, message);
  }
});
