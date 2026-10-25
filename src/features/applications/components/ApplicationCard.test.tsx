import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { Application } from '@/types/application';

import { ApplicationCard } from './ApplicationCard';

const application: Application = {
  id: 'app-1',
  user_id: 'user-1',
  company: 'Яндекс',
  position: 'Frontend-разработчик',
  url: 'https://example.com/vacancy',
  description: 'Описание',
  location: 'Москва',
  work_format: 'hybrid',
  salary_min: 150000,
  salary_max: 250000,
  status: 'interview',
  priority: 'high',
  applied_at: '2026-03-01',
  next_action_at: null,
  notes: null,
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-02T10:00:00Z',
};

describe('ApplicationCard', () => {
  it('показывает компанию, должность, зарплату и статус', () => {
    render(
      <MemoryRouter>
        <ApplicationCard application={application} onStatusChange={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Frontend-разработчик')).toBeInTheDocument();
    expect(screen.getByText('Яндекс')).toBeInTheDocument();
    expect(screen.getByText(/150 000 – 250 000/)).toBeInTheDocument();
    expect(screen.getByText('Собеседование')).toBeInTheDocument();
    expect(screen.getByText('Высокий')).toBeInTheDocument();
  });

  it('содержит ссылку на детальную страницу', () => {
    render(
      <MemoryRouter>
        <ApplicationCard application={application} onStatusChange={vi.fn()} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Открыть вакансию: Яндекс/i });
    expect(link).toHaveAttribute('href', '/applications/app-1');
  });
});
