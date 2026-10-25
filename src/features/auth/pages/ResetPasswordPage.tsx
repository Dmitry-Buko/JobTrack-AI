import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/PageLoader';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';

import { AuthCard } from '../components/AuthCard';
import { updatePassword } from '../lib/authService';

const resetSchema = z
  .object({
    password: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string().min(1, 'Повторите пароль'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type ResetForm = z.infer<typeof resetSchema>;

/**
 * Страница назначения нового пароля. Доступна только по ссылке из письма
 * (Supabase возвращает сессию восстановления через URL).
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    let settled = false;
    // detectSessionInUrl уже подхватил токен восстановления; ждём сессию.
    void supabase.auth.getSession().then(({ data }) => {
      settled = true;
      setHasRecoverySession(Boolean(data.session));
      setChecking(false);
    });
    const timer = window.setTimeout(() => {
      if (!settled) {
        setChecking(false);
      }
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const onSubmit = async (values: ResetForm) => {
    setServerError(null);
    const { error } = await updatePassword(values.password);
    if (error) {
      setServerError(getErrorMessage(error, 'Не удалось обновить пароль.'));
      return;
    }
    setDone(true);
    window.setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
  };

  if (checking) {
    return <PageLoader label="Проверяем ссылку восстановления…" />;
  }

  return (
    <AuthCard
      title="Новый пароль"
      subtitle={
        hasRecoverySession
          ? 'Придумайте новый пароль для вашего аккаунта'
          : 'Ссылка недействительна или устарела'
      }
      footer={
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          Перейти ко входу
        </Link>
      }
    >
      {done ? (
        <div className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success" role="status">
          Пароль обновлён. Перенаправляем на дашборд…
        </div>
      ) : hasRecoverySession ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Новый пароль"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Повторите пароль"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          {serverError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Сохранить пароль
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Запросите восстановление пароля заново — мы отправим новую ссылку на почту.
        </p>
      )}
    </AuthCard>
  );
}
