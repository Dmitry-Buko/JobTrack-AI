import { describe, expect, it } from 'vitest';

import { JS_SUBTOPICS, matchWeakSubtopics, pickRandomSubtopics } from './subtopics';

describe('matchWeakSubtopics', () => {
  it('сопоставляет свободный текст отчётов с ключами тем', () => {
    const matched = matchWeakSubtopics(['Замыкания', 'Промисы', 'Event Loop']);
    expect(matched).toContain('functions_closures');
    expect(matched).toContain('promises_async');
    expect(matched).toContain('event_loop');
  });

  it('находит тему по частичному названию', () => {
    const matched = matchWeakSubtopics(['Массивы', 'деструктуризация']);
    expect(matched).toContain('arrays_methods');
    expect(matched).toContain('objects_destructuring');
  });

  it('игнорирует короткий мусор и незнакомый текст', () => {
    expect(matchWeakSubtopics(['js', '', 'Квантовая физика'])).toEqual([]);
  });

  it('не матчит всё подряд от одного символа', () => {
    expect(matchWeakSubtopics(['map'])).not.toContain('arrays_methods');
    expect(matchWeakSubtopics(['map'])).toContain('map_set');
  });
});

describe('pickRandomSubtopics', () => {
  it('выбирает 5 уникальных тем без повторов', () => {
    const picked = pickRandomSubtopics();
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
    for (const key of picked) {
      expect(JS_SUBTOPICS.some((subtopic) => subtopic.key === key)).toBe(true);
    }
  });
});
