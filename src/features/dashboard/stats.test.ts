import { describe, expect, it } from 'vitest';

import type { Application } from '@/types/application';
import type { InterviewSession } from '@/types/interview';

import { computeDashboardStats, getAverageScore, getUpcomingEvents, getWeakTopics } from './stats';

function application(overrides: Partial<Application>): Application {
  return {
    id: 'id',
    user_id: 'user',
    company: 'Компания',
    position: 'Frontend',
    url: null,
    description: null,
    location: null,
    work_format: null,
    salary_min: null,
    salary_max: null,
    status: 'saved',
    priority: 'medium',
    applied_at: null,
    next_action_at: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

describe('computeDashboardStats', () => {
  it('считает вакансии, отклики, собеседования и офферы', () => {
    const stats = computeDashboardStats([
      application({ status: 'saved' }),
      application({ status: 'applied', applied_at: '2026-01-10' }),
      application({ status: 'interview', next_action_at: tomorrow }),
      application({ status: 'interview', next_action_at: '2020-01-01' }), // прошедшее — не считается
      application({ status: 'offer' }),
    ]);
    expect(stats.totalApplications).toBe(5);
    expect(stats.appliedCount).toBe(1);
    expect(stats.upcomingInterviews).toBe(1);
    expect(stats.offersCount).toBe(1);
  });

  it('сегодняшнее собеседование считается предстоящим', () => {
    const stats = computeDashboardStats([
      application({ status: 'interview', next_action_at: today }),
    ]);
    expect(stats.upcomingInterviews).toBe(1);
  });
});

describe('getUpcomingEvents', () => {
  it('возвращает только будущие события по возрастанию даты', () => {
    const events = getUpcomingEvents([
      application({ id: 'b', next_action_at: tomorrow }),
      application({ id: 'a', next_action_at: today }),
      application({ id: 'past', next_action_at: '2020-01-01' }),
    ]);
    expect(events.map((event) => event.application.id)).toEqual(['a', 'b']);
  });
});

function session(report: InterviewSession['report']): InterviewSession {
  return {
    id: 's1',
    user_id: 'user',
    application_id: null,
    mode: 'text',
    format: null,
    selected_topics: null,
    topic: 'javascript',
    difficulty: 'junior',
    language: 'ru',
    status: 'completed',
    question_count: 5,
    started_at: null,
    completed_at: null,
    summary: null,
    report,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('getWeakTopics', () => {
  it('агрегирует слабые темы из отчётов', () => {
    const weak = getWeakTopics([
      session({ ...baseReport, topics_to_review: ['Замыкания', 'Промисы'], weak_topics: ['Замыкания'] }),
      session({ ...baseReport, topics_to_review: ['Промисы'] }),
    ]);
    expect(weak[0]).toEqual({ topic: 'Замыкания', count: 2 });
    expect(weak[1]).toEqual({ topic: 'Промисы', count: 2 });
  });
});

const baseReport = {
  total_questions: 5,
  answered_questions: 4,
  skipped_questions: 1,
  overall_score: 4 as const,
  strengths: [],
  weak_topics: [],
  weak_answers: [],
  topics_to_review: [],
  recommendations: [],
  conclusion: '',
};

describe('getAverageScore', () => {
  it('усредняет баллы отчётов', () => {
    expect(
      getAverageScore([session({ ...baseReport, overall_score: 4 }), session({ ...baseReport, overall_score: 5 })]),
    ).toBe(4.5);
  });

  it('возвращает null без отчётов', () => {
    expect(getAverageScore([session(null)])).toBeNull();
  });
});
