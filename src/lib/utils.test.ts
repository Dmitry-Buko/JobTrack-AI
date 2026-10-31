import { describe, expect, it } from 'vitest';

import { formatDate, formatRelativeDate, formatSalaryRange, pluralize, toDateInputValue } from './utils';

describe('formatDate', () => {
  it('форматирует ISO-дату в человеческий вид «5 мар»', () => {
    const year = new Date().getFullYear();
    expect(formatDate(`${year}-03-05`)).toBe('5 мар');
  });

  it('добавляет год, если он не текущий', () => {
    expect(formatDate('2020-03-05')).toBe('5 мар 2020');
  });

  it('возвращает тире для пустого значения', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('formatSalaryRange', () => {
  it('показывает диапазон', () => {
    expect(formatSalaryRange(100000, 150000)).toBe('100 000 – 150 000');
  });

  it('показывает «от» и «до» для одной границы', () => {
    expect(formatSalaryRange(100000, null)).toBe('от 100 000');
    expect(formatSalaryRange(null, 150000)).toBe('до 150 000');
  });

  it('возвращает тире без данных', () => {
    expect(formatSalaryRange(null, null)).toBe('—');
  });
});

describe('pluralize', () => {
  it('склоняет русские существительные', () => {
    expect(pluralize(1, ['вопрос', 'вопроса', 'вопросов'])).toBe('вопрос');
    expect(pluralize(3, ['вопрос', 'вопроса', 'вопросов'])).toBe('вопроса');
    expect(pluralize(5, ['вопрос', 'вопроса', 'вопросов'])).toBe('вопросов');
    expect(pluralize(11, ['вопрос', 'вопроса', 'вопросов'])).toBe('вопросов');
    expect(pluralize(21, ['вопрос', 'вопроса', 'вопросов'])).toBe('вопрос');
  });
});

describe('toDateInputValue', () => {
  it('превращает ISO-дату в значение для input[type=date]', () => {
    expect(toDateInputValue('2026-03-05T14:30:00')).toBe('2026-03-05');
  });

  it('возвращает пустую строку без даты', () => {
    expect(toDateInputValue(null)).toBe('');
  });
});

describe('formatRelativeDate', () => {
  it('узнаёт сегодня и завтра', () => {
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(formatRelativeDate(now)).toBe('Сегодня');
    expect(formatRelativeDate(tomorrow)).toBe('Завтра');
  });
});
