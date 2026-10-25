export const SKILL_LEVELS = [1, 2, 3, 4, 5] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  1: 'Начальный',
  2: 'Базовый',
  3: 'Средний',
  4: 'Уверенный',
  5: 'Продвинутый',
};

export interface Profile {
  id: string;
  full_name: string | null;
  target_role: string | null;
  experience_level: string | null;
  experience_summary: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<Profile, 'full_name' | 'target_role' | 'experience_level' | 'experience_summary'>
>;

export interface ProfileSkill {
  id: string;
  user_id: string;
  name: string;
  self_assessed_level: SkillLevel;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileSkillInsert = Omit<
  ProfileSkill,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;
