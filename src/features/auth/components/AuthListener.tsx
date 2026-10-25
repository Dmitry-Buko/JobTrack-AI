import { useEffect } from 'react';

import { useAppDispatch } from '@/app/hooks';
import { supabase } from '@/lib/supabase';

import { sessionCleared, sessionReady } from '../authSlice';

/**
 * Синхронизирует Redux с сессией Supabase: восстанавливает её после
 * перезагрузки страницы и реагирует на вход/выход в других вкладках.
 */
export function AuthListener() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) {
        dispatch(sessionReady({ id: user.id, email: user.email ?? null }));
      } else {
        dispatch(sessionCleared());
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        dispatch(sessionReady({ id: user.id, email: user.email ?? null }));
      } else {
        dispatch(sessionCleared());
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [dispatch]);

  return null;
}
