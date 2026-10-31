import { FunctionsHttpError } from '@supabase/supabase-js';
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ZodType } from 'zod';

import { supabase } from '@/lib/supabase';
import type { JobAnalysisResult } from '@/types/job-analysis';
import type {
  AnswerEvaluation,
  InterviewDifficulty,
  InterviewLanguage,
  InterviewTopic,
} from '@/types/interview';

import {
  analysisResponseSchema,
  evaluationResponseSchema,
  hintResponseSchema,
  parseAiResponse,
  questionsResponseSchema,
  realtimeSessionResponseSchema,
  reportResponseSchema,
} from '../lib/schemas';

interface RequestError {
  message: string;
  /** HTTP-статус Edge Function: нужен очереди оценок для решения о повторе. */
  status?: number;
}

/** Контекст вакансии, передаваемый в AI-функции. */
export interface ApplicationContext {
  company: string;
  position: string;
  description: string | null;
}

export interface QuestionGenerationArgs {
  topic: InterviewTopic;
  difficulty: InterviewDifficulty;
  language: InterviewLanguage;
  questionCount: number;
  application: ApplicationContext | null;
  /** Подтемы теста (ключи allowlist). Отсутствует — сессия без выбора тем. */
  subtopics?: string[] | null;
}

export interface GeneratedQuestion {
  question: string;
  subtopic: string | null;
}

export interface AnswerEvaluationArgs {
  question: string;
  answer: string;
  topic: InterviewTopic;
  difficulty: InterviewDifficulty;
  language: InterviewLanguage;
  /** Подтема вопроса, если известна — уточняет промпт оценки. */
  subtopic?: string | null;
}

export interface HintArgs {
  question: string;
  topic: InterviewTopic;
  difficulty: InterviewDifficulty;
  language: InterviewLanguage;
  subtopic?: string | null;
}

export interface ReportArgs {
  topic: InterviewTopic;
  difficulty: InterviewDifficulty;
  language: InterviewLanguage;
  messages: Array<{
    role: 'assistant' | 'user';
    content: string;
    evaluation?: unknown;
  }>;
}

export interface JobAnalysisArgs {
  company: string;
  position: string;
  description: string;
  targetRole: string | null;
  skills: Array<{ name: string; level: number }>;
}

export interface RealtimeSessionArgs {
  topic: InterviewTopic;
  difficulty: InterviewDifficulty;
  language: InterviewLanguage;
  questionCount: number;
  application: ApplicationContext | null;
}

export interface RealtimeSessionInfo {
  token: string;
  model: string;
  expiresAt: number | null;
}

/**
 * Вызов Edge Function с JWT пользователя (supabase-js добавляет его сам),
 * валидацией ответа по zod-схеме и понятными сообщениями об ошибках.
 */
async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  schema: ZodType<T>,
): Promise<{ data?: T; error?: RequestError }> {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = (await error.context.json().catch(() => null)) as
        | { error?: string }
        | null;
      return {
        error: {
          message:
            payload?.error ?? `AI-сервис вернул ошибку (код ${error.context.status}).`,
          status: error.context.status,
        },
      };
    }
    return { error: { message: 'AI-сервис недоступен. Проверьте подключение и попробуйте позже.', status: 0 } };
  }

  const parsed = parseAiResponse(schema, data);
  if (!parsed.ok) {
    return { error: { message: parsed.message } };
  }
  return { data: parsed.data };
}

export const aiApi = createApi({
  reducerPath: 'aiApi',
  baseQuery: fakeBaseQuery<RequestError>(),
  tagTypes: [],
  endpoints: (builder) => ({
    generateQuestions: builder.mutation<GeneratedQuestion[], QuestionGenerationArgs>({
      queryFn: async (args) => {
        const result = await invokeFunction('interview-questions', { ...args }, questionsResponseSchema);
        return result.data
          ? { data: result.data.questions }
          : { error: result.error ?? { message: 'Не удалось сгенерировать вопросы.' } };
      },
    }),

    evaluateAnswer: builder.mutation<AnswerEvaluation, AnswerEvaluationArgs>({
      queryFn: async (args) => {
        const result = await invokeFunction('evaluate-answer', { ...args }, evaluationResponseSchema);
        return result.data
          ? { data: result.data }
          : { error: result.error ?? { message: 'Не удалось оценить ответ.' } };
      },
    }),

    getHint: builder.mutation<string, HintArgs>({
      queryFn: async (args) => {
        const result = await invokeFunction('evaluate-answer', { ...args, hint: true }, hintResponseSchema);
        return result.data
          ? { data: result.data.hint }
          : { error: result.error ?? { message: 'Не удалось получить подсказку.' } };
      },
    }),

    generateReport: builder.mutation<ReturnType<typeof reportResponseSchema.parse>, ReportArgs>({
      queryFn: async (args) => {
        const result = await invokeFunction('session-report', { ...args }, reportResponseSchema);
        return result.data
          ? { data: result.data }
          : { error: result.error ?? { message: 'Не удалось сформировать отчёт.' } };
      },
    }),

    analyzeJob: builder.mutation<JobAnalysisResult, JobAnalysisArgs>({
      queryFn: async (args) => {
        const result = await invokeFunction('analyze-job', { ...args }, analysisResponseSchema);
        return result.data
          ? { data: result.data }
          : { error: result.error ?? { message: 'Не удалось проанализировать вакансию.' } };
      },
    }),

    createRealtimeSession: builder.mutation<RealtimeSessionInfo, RealtimeSessionArgs>({
      queryFn: async (args) => {
        const result = await invokeFunction('realtime-session', { ...args }, realtimeSessionResponseSchema);
        return result.data
          ? { data: { token: result.data.token, model: result.data.model, expiresAt: result.data.expires_at ?? null } }
          : { error: result.error ?? { message: 'Не удалось создать голосовую сессию.' } };
      },
    }),
  }),
});

export const {
  useGenerateQuestionsMutation,
  useEvaluateAnswerMutation,
  useGetHintMutation,
  useGenerateReportMutation,
  useAnalyzeJobMutation,
  useCreateRealtimeSessionMutation,
} = aiApi;
