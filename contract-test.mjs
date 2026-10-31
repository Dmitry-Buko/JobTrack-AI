// Контрактный тест: живые ответы Edge Functions против КЛИЕНТСКИХ zod-схем.
import { z } from 'zod';

const URL = 'https://qbrpteadnuzedljiaihm.supabase.co';
const ANON = process.env.SUPA_ANON;

// === Точные копии схем из src/features/ai/lib/schemas.ts ===
const scoreValue = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const criterionScoreSchema = z.union([
  z.object({ score: scoreValue, comment: z.string() }),
  z.object({ status: z.literal('insufficient_data'), comment: z.string() }),
]);
const evaluationResponseSchema = z.object({
  scores: z.object({
    correctness: criterionScoreSchema,
    completeness: criterionScoreSchema,
    understanding: criterionScoreSchema,
    practical_application: criterionScoreSchema,
    explanation_quality: criterionScoreSchema,
  }),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  model_answer: z.string(),
  follow_up_question: z.string().nullable(),
});
const questionsResponseSchema = z.object({ questions: z.array(z.string().min(1)).min(1) });
const hintResponseSchema = z.object({ hint: z.string().min(1) });
const reportResponseSchema = z.object({
  summary: z.string(),
  total_questions: z.number().int().nonnegative(),
  answered_questions: z.number().int().nonnegative(),
  skipped_questions: z.number().int().nonnegative(),
  strengths: z.array(z.string()),
  weak_topics: z.array(z.string()),
  weak_answers: z.array(z.object({ question: z.string(), issue: z.string() })),
  topics_to_review: z.array(z.string()),
  recommendations: z.array(z.string()),
  conclusion: z.string(),
});
const analysisResponseSchema = z.object({
  summary: z.string(),
  matched_skills: z.array(z.object({ name: z.string(), comment: z.string() })),
  unconfirmed_requirements: z.array(z.object({ requirement: z.string(), note: z.string() })),
  needs_verification: z.array(z.object({ requirement: z.string(), note: z.string() })),
  preparation_recommendations: z.array(z.string()),
  possible_interview_questions: z.array(z.string()),
});
const realtimeSessionResponseSchema = z.object({
  token: z.string().min(1),
  model: z.string().min(1),
  expires_at: z.number().nullable().optional(),
});

const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'dev.jobtrack.2026@gmail.com', password: 'test123456' }),
});
const { access_token: jwt } = await login.json();

async function call(name, body) {
  const r = await fetch(`${URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json().catch(() => null) };
}

function check(label, schema, { status, data }) {
  const res = schema.safeParse(data);
  console.log(`${res.success ? 'OK  ' : 'FAIL'} ${label} (HTTP ${status})`);
  if (!res.success) {
    console.log('     zod:', JSON.stringify(res.error.issues.slice(0, 3)));
    console.log('     data:', JSON.stringify(data).slice(0, 250));
  }
}

check('interview-questions', questionsResponseSchema, await call('interview-questions', {
  topic: 'react', difficulty: 'junior', language: 'ru', questionCount: 3, application: null,
}));

check('evaluate-answer (оценка)', evaluationResponseSchema, await call('evaluate-answer', {
  question: 'Что такое компонент в React?',
  answer: 'Компонент — это функция, возвращающая JSX-разметку. Он принимает props и может хранить внутреннее состояние через хуки, например useState.',
  topic: 'react', difficulty: 'junior', language: 'ru',
}));

check('evaluate-answer (подсказка)', hintResponseSchema, await call('evaluate-answer', {
  question: 'Расскажи, что такое виртуальный DOM', topic: 'react', difficulty: 'junior', language: 'ru', hint: true,
}));

check('session-report', reportResponseSchema, await call('session-report', {
  topic: 'react', difficulty: 'junior', language: 'ru',
  messages: [
    { role: 'assistant', content: 'Что такое props в React?' },
    { role: 'user', content: 'Props — это входные данные компонента, передаваемые от родителя, только для чтения.' },
    { role: 'assistant', content: 'Что такое useState?' },
    { role: 'user', content: 'Не знаю.' },
  ],
}));

check('analyze-job', analysisResponseSchema, await call('analyze-job', {
  company: 'Тест', position: 'Frontend', targetRole: null,
  description: 'Ищем frontend-разработчика: React, TypeScript, Git. Плюсом будет опыт с тестами.',
  skills: [{ name: 'React', level: 3 }],
}));

check('realtime-session', realtimeSessionResponseSchema, await call('realtime-session', {
  topic: 'javascript', difficulty: 'junior', language: 'ru', questionCount: 3, application: null,
}));
console.log('done');
