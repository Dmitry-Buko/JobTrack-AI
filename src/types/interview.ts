export const INTERVIEW_MODES = ['text', 'voice'] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  text: 'Текстовый',
  voice: 'Голосовой',
};

/** Формат текстовой сессии: chat — старый диалог, test — тест по одному вопросу. */
export type InterviewFormat = 'chat' | 'test';

export const INTERVIEW_TOPICS = [
  'javascript',
  'typescript',
  'react',
  'redux_toolkit',
  'html_css',
  'browser_apis',
  'networking',
  'mixed',
] as const;
export type InterviewTopic = (typeof INTERVIEW_TOPICS)[number];

export const TOPIC_LABELS: Record<InterviewTopic, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  react: 'React',
  redux_toolkit: 'Redux Toolkit',
  html_css: 'HTML/CSS',
  browser_apis: 'Браузерные API',
  networking: 'Работа с сетью',
  mixed: 'Смешанная тренировка',
};

export const INTERVIEW_DIFFICULTIES = ['junior', 'junior_plus', 'middle'] as const;
export type InterviewDifficulty = (typeof INTERVIEW_DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<InterviewDifficulty, string> = {
  junior: 'Junior',
  junior_plus: 'Junior+',
  middle: 'Middle',
};

export const INTERVIEW_LANGUAGES = ['ru', 'en'] as const;
export type InterviewLanguage = (typeof INTERVIEW_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<InterviewLanguage, string> = {
  ru: 'Русский',
  en: 'English',
};

export const SESSION_STATUSES = ['active', 'completed', 'aborted'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  active: 'Активна',
  completed: 'Завершена',
  aborted: 'Прервана',
};

export type MessageRole = 'assistant' | 'user';

/** Критерии оценки ответа (ТЗ 5.4): оценка 1–5 или «Недостаточно данных». */
export const EVALUATION_CRITERIA = [
  'correctness',
  'completeness',
  'understanding',
  'practical_application',
  'explanation_quality',
] as const;
export type EvaluationCriterion = (typeof EVALUATION_CRITERIA)[number];

export const CRITERION_LABELS: Record<EvaluationCriterion, string> = {
  correctness: 'Корректность',
  completeness: 'Полнота',
  understanding: 'Понимание сути вопроса',
  practical_application: 'Практическое применение',
  explanation_quality: 'Качество объяснения',
};

export type CriterionScore =
  | { score: 1 | 2 | 3 | 4 | 5; comment: string }
  | { status: 'insufficient_data'; comment: string };

export type CriterionScores = Record<EvaluationCriterion, CriterionScore>;

/**
 * Оценка одного ответа. Сохраняется в interview_messages.evaluation (jsonb).
 * Формат документирован и валидируется zod-схемой в features/ai.
 */
export interface AnswerEvaluation {
  scores: CriterionScores;
  strengths: string[];
  gaps: string[];
  model_answer: string;
  follow_up_question: string | null;
}

/** Маркер пропущенного вопроса (тоже хранится в evaluation). */
export interface SkippedAnswerMark {
  skipped: true;
}

export interface InterviewMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  turn_index: number;
  evaluation: AnswerEvaluation | SkippedAnswerMark | null;
  /** Подтема вопроса (ключ allowlist) — только для сообщений-вопросов теста. */
  subtopic: string | null;
  /** Использовалась ли подсказка при ответе на этот вопрос. */
  hint_used: boolean | null;
  created_at: string;
}

/** Вставка сообщения: подтема и флаг подсказки — опциональны (БД даёт дефолты). */
export type InterviewMessageInsert = Omit<
  InterviewMessage,
  'id' | 'created_at' | 'subtopic' | 'hint_used'
> &
  Partial<Pick<InterviewMessage, 'subtopic' | 'hint_used'>>;

/** Итоговый отчёт тренировки. Хранится в interview_sessions.report (jsonb). */
export interface SessionReport {
  total_questions: number;
  answered_questions: number;
  skipped_questions: number;
  /** Средний балл по оценённым критериям (1–5) или null, если оценок нет. */
  overall_score: number | null;
  strengths: string[];
  weak_topics: string[];
  weak_answers: { question: string; issue: string }[];
  topics_to_review: string[];
  recommendations: string[];
  conclusion: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  application_id: string | null;
  mode: InterviewMode;
  /** Формат текстовой сессии. NULL у сессий, созданных до миграции 0005. */
  format: InterviewFormat | null;
  /** Выбранные подтемы теста (ключи allowlist). NULL у голосовых и старых сессий. */
  selected_topics: string[] | null;
  topic: InterviewTopic;
  difficulty: InterviewDifficulty;
  language: InterviewLanguage;
  status: SessionStatus;
  question_count: number;
  started_at: string | null;
  completed_at: string | null;
  summary: string | null;
  report: SessionReport | null;
  created_at: string;
}

/** Вставка сессии: формат и выбранные темы — опциональны (старые клиенты их не шлют). */
export type InterviewSessionInsert = Omit<
  InterviewSession,
  'id' | 'user_id' | 'started_at' | 'completed_at' | 'summary' | 'report' | 'created_at' | 'format' | 'selected_topics'
> &
  Partial<Pick<InterviewSession, 'format' | 'selected_topics'>>;

/** Настройки новой тренировки, которые выбирает пользователь. */
export interface InterviewSettings {
  mode: InterviewMode;
  topic: InterviewTopic;
  difficulty: InterviewDifficulty;
  language: InterviewLanguage;
  questionCount: number;
  applicationId: string | null;
}
