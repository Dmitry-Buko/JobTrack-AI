import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/errors';

import { AuthCard } from '../components/AuthCard';
import { signIn } from '../lib/authService';

const loginSchema = z.object({
  email: z.string().min(1, 'Укажите email').email('Некорректный email'),
  password: z.string().min(1, 'Укажите пароль'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setServerError(getErrorMessage(error, 'Не удалось войти. Проверьте email и пароль.'));
      return;
    }
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
  };

  return (
    <AuthCard
      title="Вход"
      subtitle="Войдите, чтобы продолжить поиск работы и тренировки"
      footer={
        <>
          Нет аккаунта?{' '}
          <Link to="/register" className="font-medium text-accent hover:text-accent-hover">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Пароль"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {serverError && (
          <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-[15px] text-danger-strong">
            {serverError}
          </p>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Войти
        </Button>
        <p className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Забыли пароль?
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
