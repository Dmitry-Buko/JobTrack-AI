import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import { supabase } from '@/lib/supabase';
import type {
  InterviewMessage,
  InterviewMessageInsert,
  InterviewSession,
  InterviewSessionInsert,
  SessionReport,
  SessionStatus,
} from '@/types/interview';

interface RequestError {
  message: string;
}

export const sessionsApi = createApi({
  reducerPath: 'sessionsApi',
  baseQuery: fakeBaseQuery<RequestError>(),
  tagTypes: ['Session', 'SessionList', 'Messages'],
  endpoints: (builder) => ({
    getSessions: builder.query<InterviewSession[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('interview_sessions')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return { error: { message: error.message } };
        return { data: (data ?? []) as InterviewSession[] };
      },
      providesTags: ['SessionList'],
    }),

    getSession: builder.query<InterviewSession | null, string>({
      queryFn: async (id) => {
        const { data, error } = await supabase
          .from('interview_sessions')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) return { error: { message: error.message } };
        return { data: (data as InterviewSession | null) ?? null };
      },
      providesTags: (_result, _error, id) => [{ type: 'Session', id }],
    }),

    createSession: builder.mutation<InterviewSession, InterviewSessionInsert>({
      queryFn: async (input) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return { error: { message: 'Требуется вход в аккаунт' } };

        const { data, error } = await supabase
          .from('interview_sessions')
          .insert({ ...input, user_id: userData.user.id })
          .select()
          .single();
        if (error) return { error: { message: error.message } };
        return { data: data as InterviewSession };
      },
      invalidatesTags: ['SessionList'],
    }),

    /** Завершение тренировки: сохраняет отчёт и итоговый текст. */
    finishSession: builder.mutation<
      InterviewSession,
      { id: string; status: Extract<SessionStatus, 'completed' | 'aborted'>; report: SessionReport; summary: string }
    >({
      queryFn: async ({ id, status, report, summary }) => {
        const { data, error } = await supabase
          .from('interview_sessions')
          .update({ status, report, summary, completed_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) return { error: { message: error.message } };
        return { data: data as InterviewSession };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Session', id },
        'SessionList',
      ],
    }),

    getMessages: builder.query<InterviewMessage[], string>({
      queryFn: async (sessionId) => {
        const { data, error } = await supabase
          .from('interview_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('turn_index', { ascending: true });
        if (error) return { error: { message: error.message } };
        return { data: (data ?? []) as InterviewMessage[] };
      },
      providesTags: (_result, _error, sessionId) => [{ type: 'Messages', id: sessionId }],
    }),

    addMessages: builder.mutation<InterviewMessage[], { sessionId: string; messages: InterviewMessageInsert[] }>({
      queryFn: async ({ messages }) => {
        const { data, error } = await supabase
          .from('interview_messages')
          .insert(messages)
          .select();
        if (error) return { error: { message: error.message } };
        return { data: (data ?? []) as InterviewMessage[] };
      },
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'Messages', id: sessionId },
        { type: 'Session', id: sessionId },
      ],
    }),

    /**
     * Точечное обновление сообщения: фоновая оценка ответа теста
     * и флаг «подсказка использована» на вопросе.
     */
    updateMessage: builder.mutation<
      InterviewMessage,
      {
        id: string;
        sessionId: string;
        evaluation?: InterviewMessage['evaluation'];
        hintUsed?: boolean;
      }
    >({
      queryFn: async ({ id, evaluation, hintUsed }) => {
        const patch: Record<string, unknown> = {};
        if (evaluation !== undefined) patch.evaluation = evaluation;
        if (hintUsed !== undefined) patch.hint_used = hintUsed;
        const { data, error } = await supabase
          .from('interview_messages')
          .update(patch)
          .eq('id', id)
          .select()
          .single();
        if (error) return { error: { message: error.message } };
        return { data: data as InterviewMessage };
      },
      invalidatesTags: (_result, _error, { sessionId }) => [
        { type: 'Messages', id: sessionId },
      ],
    }),
  }),
});

export const {
  useGetSessionsQuery,
  useGetSessionQuery,
  useCreateSessionMutation,
  useFinishSessionMutation,
  useGetMessagesQuery,
  useAddMessagesMutation,
  useUpdateMessageMutation,
} = sessionsApi;
