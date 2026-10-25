/**
 * Результат AI-анализа требований вакансии (ТЗ 5.6).
 * Хранится в application_analyses.result (jsonb), формат валидируется zod.
 */
export interface JobAnalysisResult {
  summary: string;
  matched_skills: { name: string; comment: string }[];
  /** Требования, которых нет в профиле («не указано в профиле»). */
  unconfirmed_requirements: { requirement: string; note: string }[];
  /** Требования, которые нужно проверить на тренировке. */
  needs_verification: { requirement: string; note: string }[];
  preparation_recommendations: string[];
  possible_interview_questions: string[];
}

export interface JobAnalysis {
  id: string;
  application_id: string;
  user_id: string;
  result: JobAnalysisResult;
  created_at: string;
}
