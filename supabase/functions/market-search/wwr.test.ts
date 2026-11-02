import { describe, expect, it } from 'vitest';

import { parseWwrRss } from './wwr.ts';

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>We Work Remotely: Programming jobs</title>
  <item>
    <title><![CDATA[Acme: Senior Frontend Engineer (Anywhere)]]></title>
    <link>https://weworkremotely.com/remote-jobs/123-acme-senior-frontend</link>
    <guid isPermaLink="true">https://weworkremotely.com/remote-jobs/123</guid>
    <description><![CDATA[<p>We need a <b>React</b> engineer. React, TypeScript, CSS.</p><p>Fully remote team.</p>]]></description>
    <pubDate>Sat, 01 Nov 2026 10:00:00 +0000</pubDate>
  </item>
  <item>
    <title>Initech: Backend Developer</title>
    <link>https://weworkremotely.com/remote-jobs/456</link>
    <description>Node.js and PostgreSQL stack.</description>
    <pubDate>Thu, 29 Oct 2026 09:30:00 +0000</pubDate>
  </item>
  <item>
    <title><![CDATA[]]></title>
    <link></link>
    <description>битая запись</description>
  </item>
</channel></rss>`;

describe('parseWwrRss', () => {
  it('разбирает заголовок «Компания: Позиция (Регион)» и CDATA', () => {
    const [vacancy] = parseWwrRss(feed);
    expect(vacancy).toMatchObject({
      source: 'wwr',
      company: 'Acme',
      position: 'Senior Frontend Engineer',
      location: 'Anywhere',
      url: 'https://weworkremotely.com/remote-jobs/123-acme-senior-frontend',
      description: expect.stringContaining('React engineer'),
      publishedAt: '2026-11-01T10:00:00.000Z',
    });
    expect(vacancy.description).not.toContain('<p>');
  });

  it('работает с записями без CDATA и региона', () => {
    const [, vacancy] = parseWwrRss(feed);
    expect(vacancy.company).toBe('Initech');
    expect(vacancy.position).toBe('Backend Developer');
    expect(vacancy.location).toBe('Remote');
  });

  it('пропускает записи без ссылки или заголовка', () => {
    expect(parseWwrRss(feed)).toHaveLength(2);
  });
});
