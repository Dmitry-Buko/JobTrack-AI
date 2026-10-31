import { setupListeners } from '@reduxjs/toolkit/query';
import { configureStore } from '@reduxjs/toolkit';

import { aiApi } from '@/features/ai/api/aiApi';
import { authReducer } from '@/features/auth/authSlice';
import { applicationsApi } from '@/features/applications/api/applicationsApi';
import { sessionsApi } from '@/features/interview-coach/api/sessionsApi';
import { testSessionReducer } from '@/features/interview-coach/testSession/testSessionSlice';
import { profileApi } from '@/features/profile/api/profileApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [applicationsApi.reducerPath]: applicationsApi.reducer,
    [profileApi.reducerPath]: profileApi.reducer,
    [sessionsApi.reducerPath]: sessionsApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
    testSession: testSessionReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      applicationsApi.middleware,
      profileApi.middleware,
      sessionsApi.middleware,
      aiApi.middleware,
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
