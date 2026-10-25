import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import { supabase } from '@/lib/supabase';
import type {
  Application,
  ApplicationInsert,
  ApplicationUpdate,
} from '@/types/application';
import type { JobAnalysis, JobAnalysisResult } from '@/types/job-analysis';

interface RequestError {
  message: string;
}

export const applicationsApi = createApi({
  reducerPath: 'applicationsApi',
  baseQuery: fakeBaseQuery<RequestError>(),
  tagTypes: ['Application', 'ApplicationList', 'Analysis'],
  endpoints: (builder) => ({
    getApplications: builder.query<Application[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .order('updated_at', { ascending: false });
        if (error) return { error: { message: error.message } };
        return { data: (data ?? []) as Application[] };
      },
      providesTags: ['ApplicationList'],
    }),

    getApplication: builder.query<Application | null, string>({
      queryFn: async (id) => {
        const { data, error } = await supabase
          .from('applications')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) return { error: { message: error.message } };
        return { data: (data as Application | null) ?? null };
      },
      providesTags: (_result, _error, id) => [{ type: 'Application', id }],
    }),

    createApplication: builder.mutation<Application, ApplicationInsert>({
      queryFn: async (input) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return { error: { message: 'Требуется вход в аккаунт' } };

        const { data, error } = await supabase
          .from('applications')
          .insert({ ...input, user_id: userData.user.id })
          .select()
          .single();
        if (error) return { error: { message: error.message } };
        return { data: data as Application };
      },
      invalidatesTags: ['ApplicationList'],
    }),

    updateApplication: builder.mutation<Application, { id: string; changes: ApplicationUpdate }>({
      queryFn: async ({ id, changes }) => {
        const { data, error } = await supabase
          .from('applications')
          .update(changes)
          .eq('id', id)
          .select()
          .single();
        if (error) return { error: { message: error.message } };
        return { data: data as Application };
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Application', id },
        'ApplicationList',
      ],
    }),

    deleteApplication: builder.mutation<void, string>({
      queryFn: async (id) => {
        const { error } = await supabase.from('applications').delete().eq('id', id);
        if (error) return { error: { message: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['ApplicationList'],
    }),

    getJobAnalyses: builder.query<JobAnalysis[], string>({
      queryFn: async (applicationId) => {
        const { data, error } = await supabase
          .from('application_analyses')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false });
        if (error) return { error: { message: error.message } };
        return { data: (data ?? []) as JobAnalysis[] };
      },
      providesTags: (_result, _error, applicationId) => [
        { type: 'Analysis', id: applicationId },
      ],
    }),

    addJobAnalysis: builder.mutation<
      JobAnalysis,
      { applicationId: string; result: JobAnalysisResult }
    >({
      queryFn: async ({ applicationId, result }) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return { error: { message: 'Требуется вход в аккаунт' } };

        const { data, error } = await supabase
          .from('application_analyses')
          .insert({ application_id: applicationId, user_id: userData.user.id, result })
          .select()
          .single();
        if (error) return { error: { message: error.message } };
        return { data: data as JobAnalysis };
      },
      invalidatesTags: (_result, _error, { applicationId }) => [
        { type: 'Analysis', id: applicationId },
      ],
    }),
  }),
});

export const {
  useGetApplicationsQuery,
  useGetApplicationQuery,
  useCreateApplicationMutation,
  useUpdateApplicationMutation,
  useDeleteApplicationMutation,
  useGetJobAnalysesQuery,
  useAddJobAnalysisMutation,
} = applicationsApi;
