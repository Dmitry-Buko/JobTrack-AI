import type { Application } from '@/types/application';
import type { InterviewSession } from '@/types/interview';

export interface DashboardStats {
  totalApplications: number;
  appliedCount: number;
  upcomingInterviews: number;
  offersCount: number;
}

/** Все метрики считаются по реальным данным пользователя. */
export function computeDashboardStats(applications: Application[]): DashboardStats {
  const today = new Date().toISOString().slice(0, 10);

  return {
    totalApplications: applications.length,
    appliedCount: applications.filter((item) => item.applied_at !== null).length,
    upcomingInterviews: applications.filter(
      (item) => item.status === 'interview' && (item.next_action_at ?? '') >= today,
    ).length,
    offersCount: applications.filter((item) => item.status === 'offer').length,
  };
}

export interface UpcomingEvent {
  application: Application;
  date: string;
}

/** Ближайшие события: будущие даты следующих действий, по возрастанию. */
export function getUpcomingEvents(applications: Application[], limit = 5): UpcomingEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return applications
    .filter((item) => item.next_action_at && item.next_action_at >= today)
    .sort((a, b) => (a.next_action_at ?? '').localeCompare(b.next_action_at ?? ''))
    .slice(0, limit)
    .map((item) => ({ application: item, date: item.next_action_at as string }));
}

/** Последние действия по вакансиям. */
export function getRecentActivity(applications: Application[], limit = 5): Application[] {
  return [...applications]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);
}

export interface WeakTopicStat {
  topic: string;
  count: number;
}

/**
 * Слабые темы по итогам завершённых тренировок: частота упоминания
 * в topics_to_review и weak_topics итоговых отчётов.
 */
export function getWeakTopics(sessions: InterviewSession[], limit = 4): WeakTopicStat[] {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    const report = session.report;
    if (!report) continue;
    const topics = [...report.topics_to_review, ...report.weak_topics];
    for (const topic of topics) {
      const normalized = topic.trim();
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Средний балл по всем завершённым тренировкам. */
export function getAverageScore(sessions: InterviewSession[]): number | null {
  const scores = sessions
    .map((session) => session.report?.overall_score)
    .filter((score): score is number => typeof score === 'number');
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
}
