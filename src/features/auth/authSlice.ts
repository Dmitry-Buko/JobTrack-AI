import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  email: string | null;
}

export type AuthStatus = 'initializing' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

const initialState: AuthState = {
  status: 'initializing',
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionReady(state, action: PayloadAction<AuthUser>) {
      state.status = 'authenticated';
      state.user = action.payload;
    },
    sessionCleared(state) {
      state.status = 'anonymous';
      state.user = null;
    },
  },
});

export const { sessionReady, sessionCleared } = authSlice.actions;
export const authReducer = authSlice.reducer;
