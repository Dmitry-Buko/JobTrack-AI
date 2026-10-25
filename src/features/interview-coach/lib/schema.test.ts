import { describe, expect, it } from 'vitest';

import { DEFAULT_SETUP_VALUES, MAX_QUESTIONS, interviewSetupSchema } from './schema';

describe('interviewSetupSchema', () => {
  it('принимает значения по умолчанию', () => {
    expect(interviewSetupSchema.safeParse(DEFAULT_SETUP_VALUES).success).toBe(true);
  });

  it('ограничивает количество вопросов сверху', () => {
    const result = interviewSetupSchema.safeParse({
      ...DEFAULT_SETUP_VALUES,
      questionCount: MAX_QUESTIONS + 1,
    });
    expect(result.success).toBe(false);
  });

  it('ограничивает количество вопросов снизу', () => {
    const result = interviewSetupSchema.safeParse({
      ...DEFAULT_SETUP_VALUES,
      questionCount: 1,
    });
    expect(result.success).toBe(false);
  });

  it('отклоняет неизвестную тему', () => {
    const result = interviewSetupSchema.safeParse({
      ...DEFAULT_SETUP_VALUES,
      topic: 'python',
    });
    expect(result.success).toBe(false);
  });
});
