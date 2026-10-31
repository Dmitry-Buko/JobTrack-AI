import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/errors';

import { AuthCard } from '../components/AuthCard';
import { signUp } from '../lib/authService';

const registerSchema = z
  .object({
    email: z.string().min(1, 'Укажите email').email('Некорректный email'),
    password: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string().min(1, 'Повторите пароль'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterForm) => {
    setServerError(null);
    const { error } = await signUp(values.email, values.password);
    if (error) {
      setServerError(
        getErrorMessage(error, 'Не удалось зарегистрироваться. Попробуйте ещё раз.'),
      );
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <AuthCard
      title="Регистрация"
      subtitle="Создайте аккаунт, чтобы вести вакансии и тренироваться с AI-интервьюером"
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
            Войти
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
          autoComplete="new-password"
          hint="Минимум 6 символов"
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
          <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-[15px] text-danger-strong">
            {serverError}
          </p>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Создать аккаунт
        </Button>
      </form>
    </AuthCard>
  );
}
