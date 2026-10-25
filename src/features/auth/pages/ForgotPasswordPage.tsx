import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/errors';

import { AuthCard } from '../components/AuthCard';
import { requestPasswordReset } from '../lib/authService';

const forgotSchema = z.object({
  email: z.string().min(1, 'Укажите email').email('Некорректный email'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotForm) => {
    setServerError(null);
    const { error } = await requestPasswordReset(values.email);
    if (error) {
      setServerError(getErrorMessage(error, 'Не удалось отправить письмо.'));
      return;
    }
    setSent(true);
  };

  return (
    <AuthCard
      title="Восстановление пароля"
      subtitle="Отправим ссылку для сброса пароля на вашу почту"
      footer={
        <Link to="/login" className="font-medium text-accent hover:text-accent-hover">
          Вернуться ко входу
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success" role="status">
          Письмо отправлено. Откройте его и перейдите по ссылке сброса пароля.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          {serverError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Отправить письмо
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
