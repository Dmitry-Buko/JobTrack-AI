import { z } from 'zod';

/** Уровень — тот же набор, что в AI-тренажёре. */
export type MarketLevel = 'junior' | 'junior_plus' | 'middle';

export const MARKET_LEVELS: Array<{ value: MarketLevel; label: string }> = [
  { value: 'junior', label: 'Junior' },
  { value: 'junior_plus', label: 'Junior+' },
  { value: 'middle', label: 'Middle' },
];

export interface SearchProfile {
  role: string;
  skills: string[];
  level: MarketLevel;
  locations: string[];
}

export const DEFAULT_PROFILE: SearchProfile = {
  role: '',
  skills: [],
  level: 'junior',
  locations: [],
};

const MAX_SKILLS = 30;
const MAX_LOCATIONS = 10;

/** Свободный ввод («React, TS\nCSS») → чистый список навыков без дублей. */
export function parseListInput(raw: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of raw.split(/[,;\n]/)) {
    const value = part.trim().slice(0, 60);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(value);
    if (items.length >= MAX_SKILLS) break;
  }
  return items;
}

export const searchProfileSchema = z.object({
  role: z.string().trim().min(2, 'Укажите роль — например, «Frontend Developer»').max(200),
  skills: z.array(z.string().min(1).max(60)).max(MAX_SKILLS, 'Слишком много навыков'),
  level: z.enum(['junior', 'junior_plus', 'middle']),
  locations: z.array(z.string().min(1).max(60)).max(MAX_LOCATIONS, 'Слишком много локаций'),
});

const STORAGE_KEY = 'job-market:profile';

/** Профиль поиска живёт в localStorage — не гоняем пользователя по форме заново. */
export function loadProfile(): SearchProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = searchProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: SearchProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Приватный режим/переполнение — профиль просто не сохранится.
  }
}
