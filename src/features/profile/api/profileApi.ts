import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import { supabase } from '@/lib/supabase';
import type { Profile, ProfileSkill, ProfileSkillInsert, ProfileUpdate } from '@/types/profile';

interface RequestError {
  message: string;
}

export const profileApi = createApi({
  reducerPath: 'profileApi',
  baseQuery: fakeBaseQuery<RequestError>(),
  tagTypes: ['Profile', 'SkillList'],
  endpoints: (builder) => ({
    getProfile: builder.query<Profile | null, void>({
      queryFn: async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return { error: { message: 'Требуется вход в аккаунт' } };

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .maybeSingle();
        if (error) return { error: { message: error.message } };
        return { data: (data as Profile | null) ?? null };
      },
      providesTags: ['Profile'],
    }),

    updateProfile: builder.mutation<Profile, ProfileUpdate>({
      queryFn: async (changes) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return { error: { message: 'Требуется вход в аккаунт' } };

        const { data, error } = await supabase
          .from('profiles')
          .update(changes)
          .eq('id', userData.user.id)
          .select()
          .single();
        if (error) return { error: { message: error.message } };
        return { data: data as Profile };
      },
      invalidatesTags: ['Profile'],
    }),

    getSkills: builder.query<ProfileSkill[], void>({
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profile_skills')
          .select('*')
          .order('name', { ascending: true });
        if (error) return { error: { message: error.message } };
        return { data: (data ?? []) as ProfileSkill[] };
      },
      providesTags: ['SkillList'],
    }),

    addSkill: builder.mutation<ProfileSkill, ProfileSkillInsert>({
      queryFn: async (input) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return { error: { message: 'Требуется вход в аккаунт' } };

        const { data, error } = await supabase
          .from('profile_skills')
          .insert({ ...input, user_id: userData.user.id })
          .select()
          .single();
        if (error) return { error: { message: error.message } };
        return { data: data as ProfileSkill };
      },
      invalidatesTags: ['SkillList'],
    }),

    updateSkill: builder.mutation<void, { id: string; changes: Partial<ProfileSkillInsert> }>({
      queryFn: async ({ id, changes }) => {
        const { error } = await supabase.from('profile_skills').update(changes).eq('id', id);
        if (error) return { error: { message: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['SkillList'],
    }),

    deleteSkill: builder.mutation<void, string>({
      queryFn: async (id) => {
        const { error } = await supabase.from('profile_skills').delete().eq('id', id);
        if (error) return { error: { message: error.message } };
        return { data: undefined };
      },
      invalidatesTags: ['SkillList'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetSkillsQuery,
  useAddSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
} = profileApi;
