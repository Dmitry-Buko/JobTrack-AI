import { z } from 'npm:zod@3';

import { requireUser } from '../shared/auth.ts';
import { handleOptions, jsonError, jsonOk } from '../shared/cors.ts';
import { chatJson, OpenAIError } from '../shared/openai.ts';
import { checkRateLimit } from '../shared/ratelimit.ts';
import { clampText, parseBody } from '../shared/validate.ts';

const ANALYST_SYSTEM =
  'Ты — карьерный консультант и технический рекрутёр по frontend-разработке. ' +
  'Ты аккуратен в формулировках и никогда не утверждаешь, что человек чем-то не владеет, ' +
  'если этого нет в данных: говоришь «не указано в профиле» или «необходимо проверить». ' +
  'Ты всегда отвечаешь строго валидным JSON без markdown-обёрток.';

const bodySchema = z.object({
  company: z.string().max(200),
  position: z.string().max(200),
  description: z.string().min(1).max(8000),
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
        'Верни JSON с ключами: summary, matched_skills, unconfirmed_requirements, needs_verification, ' +
        'preparation_recommendations, possible_interview_questions.',
      3000,
    );

    const parsed = analysisSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(502, 'AI вернул анализ в неожиданном формате. Попробуйте ещё раз.');
    }
    return jsonOk(parsed.data);
  } catch (error) {
    const message = error instanceof OpenAIError ? error.message : 'AI-сервис недоступен. Попробуйте позже.';
    return jsonError(502, message);
  }
});
