import { z } from 'zod';

import { requireUser } from '../shared/auth.ts';
import { handleOptions, jsonError, jsonOk } from '../shared/cors.ts';
import { chatJson, GeminiError } from '../shared/gemini.ts';
import { checkRateLimit } from '../shared/ratelimit.ts';
import { clampedString, parseBody } from '../shared/validate.ts';

import type { MatchResult, Vacancy } from './types.ts';
import { MAX_PROMPT_VACANCIES } from './types.ts';
import { isBelarusVacancy } from './belarus.ts';
import { dedupeVacancies } from './dedupe.ts';
import {
  applyMatches,
  buildMatcherSystem,
  buildMatchPrompt,
  normalizeMatches,
} from './match.ts';
import { parseRemoteOkJson } from './remoteok.ts';
import { parseTelegramHtml } from './telegram.ts';
import { parseWwrRss } from './wwr.ts';

const bodySchema = z.object({
  profile: z.object({
    role: clampedString(200, { min: 2 }),
    skills: z.array(clampedString(60)).max(30).default([]),
    level: z.enum(['junior', 'junior_plus', 'middle']).default('junior'),
    locations: z.array(clampedString(60)).max(10).default([]),
  }),
  /** Telegram-каналы; по умолчанию — из секрета TG_CHANNELS (или devby). */
  channels: z.array(z.string().max(50)).max(5).optional(),
  sources: z.array(z.enum(['telegram', 'remoteok', 'wwr'])).max(3).optional(),
  limit: z.number().int().min(5).max(40).default(20),
});

/** Источники общаются с API охотнее, когда запрос похож на браузерный. */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) JobTrackAI/1.0';

const REMOTEOK_URL = 'https://remoteok.com/api';
// Категорийные фиды WWR обновляются с большими паузами; основной фид живой
// (проверено 2026-11-02: свежие вакансии того же дня).
const WWR_URL = 'https://weworkremotely.com/remote-jobs.rss';

const CACHE_TTL_MS = 8 * 60 * 1000;

interface CachedPayload {
  vacancies: (Vacancy & { match: MatchResult | null })[];
  meta: Record<string, unknown>;
}

const cache = new Map<string, { expires: number; payload: CachedPayload }>();

function cacheKey(data: z.infer<typeof bodySchema>): string {
  const { profile, channels, sources, limit } = data;
  return JSON.stringify({
    role: profile.role.toLowerCase(),
    skills: [...profile.skills].sort(),
    level: profile.level,
    locations: [...profile.locations].map((l) => l.toLowerCase()).sort(),
    channels: [...(channels ?? [])].sort(),
    sources: [...(sources ?? [])].sort(),
    limit,
  });
}

/**
 * Каналы по умолчанию проверены живыми (t.me/s отдаёт посты анонимно):
 * devby — IT-вакансии Беларуси (2026-11-02); vacancy_it_ulbitv — RU-подборки,
 * добавлен по просьбе пользователя 2026-11-04, гео-фильтром не отсекается
 * (см. GEO_TRUSTED_CHANNELS в belarus.ts).
 * Переопределяется секретом TG_CHANNELS или полем channels в запросе.
 */
function telegramChannels(requested?: string[]): string[] {
  if (requested && requested.length > 0) return requested;
  const fromEnv = (Deno.env.get('TG_CHANNELS') ?? 'devby,vacancy_it_ulbitv')
    .split(',')
    .map((name) => name.trim().replace(/^@/, ''))
    .filter(Boolean);
  return fromEnv;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json,application/xml' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchTelegram(channels: string[]): Promise<Vacancy[]> {
  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      const html = await fetchText(`https://t.me/s/${channel}`);
      return parseTelegramHtml(html, channel);
    }),
  );
  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed === channels.length && channels.length > 0) throw new Error('все каналы недоступны');
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

async function fetchRemoteOk(): Promise<Vacancy[]> {
  const text = await fetchText(REMOTEOK_URL);
  return parseRemoteOkJson(JSON.parse(text));
}

async function fetchWwr(): Promise<Vacancy[]> {
  return parseWwrRss(await fetchText(WWR_URL));
}

function byFreshness(a: Vacancy, b: Vacancy): number {
  if (a.publishedAt === b.publishedAt) return 0;
  if (!a.publishedAt) return 1;
  if (!b.publishedAt) return -1;
  return a.publishedAt < b.publishedAt ? 1 : -1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonError(405, 'Метод не поддерживается.');

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody(req, bodySchema);
  if ('error' in body) return body.error;

  const rate = await checkRateLimit(auth.supabase, 'market-search');
  if (rate === 'limited') {
    return jsonError(429, 'Достигнут лимит поисков за час. Немного подождите и повторите.');
  }
  if (rate === 'error') {
    return jsonError(503, 'Не удалось проверить лимит запросов. Попробуйте позже.');
  }

  const key = cacheKey(body.data);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return jsonOk({ ...cached.payload, meta: { ...cached.payload.meta, cached: true } });
  }
  if (cache.size > 40) cache.clear();

  const { profile, sources, limit } = body.data;
  const activeSources = sources && sources.length > 0 ? sources : ['telegram', 'remoteok', 'wwr'];
  const channels = telegramChannels(body.data.channels);

  const errors: string[] = [];
  const jobs: { name: string; run: () => Promise<Vacancy[]> }[] = [];
  if (activeSources.includes('telegram')) {
    jobs.push({ name: 'telegram', run: () => fetchTelegram(channels) });
  }
  if (activeSources.includes('remoteok')) jobs.push({ name: 'remoteok', run: fetchRemoteOk });
  if (activeSources.includes('wwr')) jobs.push({ name: 'wwr', run: fetchWwr });

  const settled = await Promise.allSettled(jobs.map((job) => job.run()));
  const fetched: Record<string, number> = {};
  const all: Vacancy[] = [];
  settled.forEach((result, index) => {
    const { name } = jobs[index];
    if (result.status === 'fulfilled') {
      fetched[name] = result.value.length;
      all.push(...result.value);
    } else {
      fetched[name] = 0;
      errors.push(`Источник ${name} недоступен`);
    }
  });

  // Поиск ограничен Республикой Беларусь: worldwide-remote и другие страны отсекаются.
  const unique = dedupeVacancies(all).filter(isBelarusVacancy);
  if (unique.length === 0) {
    return jsonOk({
      vacancies: [],
      meta: { fetched, errors, total: 0, aiUsed: false },
    });
  }

  // В промпт идут самые свежие — так батч не разбухает на старых дублях.
  const batch = unique.sort(byFreshness).slice(0, MAX_PROMPT_VACANCIES);

  try {
    const raw = await chatJson(
      buildMatcherSystem(),
      buildMatchPrompt(profile, batch),
      6000,
    );
    const matches = normalizeMatches(raw, batch.length);
    const vacancies = applyMatches(batch, matches, raw)
      .sort((a, b) => (b.match?.percent ?? -1) - (a.match?.percent ?? -1))
      .slice(0, limit);

    const payload: CachedPayload = { vacancies, meta: { fetched, errors, total: unique.length, aiUsed: true } };
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
    return jsonOk(payload);
  } catch (error) {
    const message = error instanceof GeminiError ? error.message : 'AI-сервис недоступен. Попробуйте позже.';
    // Вакансии всё равно полезны: отдаём их без процентов — фронт покажет список.
    return jsonOk({
      vacancies: batch.slice(0, limit).map((vacancy) => ({ ...vacancy, match: null })),
      meta: { fetched, errors, total: unique.length, aiUsed: false, aiError: message },
    });
  }
});
