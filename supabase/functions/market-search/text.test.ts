import { describe, expect, it } from 'vitest';

import { decodeEntities, shortHash, stripHtml, truncate } from './text.ts';

describe('stripHtml', () => {
  it('вырезает теги, превращая <br> и блочные границы в переносы', () => {
    expect(stripHtml('<p>Привет</p><ul><li>React</li><li>CSS</li></ul>')).toBe(
      'Привет\n• React\n• CSS',
    );
  });

  it('декодирует именованные и числовые сущности', () => {
    expect(decodeEntities('a&amp;b &#8212; c&nbsp;')).toBe('a&b — c ');
  });

  it('чинит mojibake из RemoteOK (cp1252-прочтение UTF-8)', () => {
    // «$85,000â€“$100,000» — en-dash, пришедший тремя символами
    expect(decodeEntities('$85,000\u00e2\u20ac\u201c$100,000')).toBe('$85,000–$100,000');
    expect(decodeEntities('it\u00e2\u20ac\u2122s')).toBe('it’s');
  });
});

describe('truncate', () => {
  it('не трогает короткий текст и режет длинный по границе слова', () => {
    expect(truncate('short', 100)).toBe('short');
    const cut = truncate('word '.repeat(60), 100);
    expect(cut.length).toBeLessThanOrEqual(101);
    expect(cut.endsWith('…')).toBe(true);
  });
});

describe('shortHash', () => {
  it('детерминирован и различает ссылки', () => {
    expect(shortHash('https://a.com/1')).toBe(shortHash('https://a.com/1'));
    expect(shortHash('https://a.com/1')).not.toBe(shortHash('https://a.com/2'));
  });
});
