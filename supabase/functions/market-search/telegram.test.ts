import { describe, expect, it } from 'vitest';

import { parseTelegramHtml } from './telegram.ts';

const channel = 'devby';

function page(posts: string[]): string {
  return `<html><body><div class="tgme_channel_history">${posts.join('\n')}</div></body></html>`;
}

function post(
  id: number,
  text: string,
  datetime = '2026-11-01T10:00:00+00:00',
  channelName = channel,
): string {
  return `
    <div class="tgme_widget_message_wrap" data-post="${channelName}/${id}">
      <div class="tgme_widget_message_text js-message_text" dir="auto">${text}</div>
      <time datetime="${datetime}"></time>
    </div>`;
}

describe('parseTelegramHtml', () => {
  const vacancyText =
    'Ищем <b>Frontend-разработчика (React)</b> в Минске.<br/>' +
    'Требования: React, TypeScript, 2 года опыта.<br/>' +
    'Зарплата от 3000$. Отклик: @hr_devby. ' +
    'Офис в центре, гибкий график, дружная команда и интересные задачи.';

  it('достаёт пост-вакансию с датой и ссылкой', () => {
    const [vacancy] = parseTelegramHtml(page([post(123, vacancyText)]), channel);
    expect(vacancy).toMatchObject({
      source: 'telegram',
      url: 'https://t.me/devby/123',
      publishedAt: '2026-11-01T10:00:00.000Z',
    });
    expect(vacancy.description).toContain('Frontend-разработчика (React)');
    expect(vacancy.description).not.toContain('<b>');
  });

  it('пропускает короткие и нерелевантные посты', () => {
    const short = post(124, 'Спасибо всем, кто пришёл на встречу!');
    const notVacancy = post(
      125,
      'Мы провели большое собрание сообщества и обсудили планы на следующий год, ' +
        'подвели итоги конференции, поблагодарили волонтёров и организаторов площадки.',
    );
    expect(parseTelegramHtml(page([short, notVacancy]), channel)).toHaveLength(0);
  });

  it('игнорирует посты других каналов в разметке', () => {
    const foreign = post(1, vacancyText, undefined, 'other_channel');
    expect(parseTelegramHtml(page([foreign]), channel)).toHaveLength(0);
  });

  it('пропускает англоязычную подборку с jobs', () => {
    const digest = post(
      300,
      '10 remote jobs on JobRadar — November 1. Design, community, sales, product, ' +
        'and engineering roles across Europe and Americas, check the location rules ' +
        'before applying. Links inside and full descriptions below in this thread.',
    );
    const [vacancy] = parseTelegramHtml(page([post(300, digest)]), channel);
    expect(vacancy.source).toBe('telegram');
  });

  it('выбирает свежие посты в порядке превью (новые раньше)', () => {
    const older = post(100, vacancyText, '2026-10-01T10:00:00+00:00');
    const newer = post(200, vacancyText, '2026-11-01T10:00:00+00:00');
    const vacancies = parseTelegramHtml(page([newer, older]), channel);
    expect(vacancies).toHaveLength(2);
    expect(vacancies[0].publishedAt > vacancies[1].publishedAt).toBe(true);
  });
});
