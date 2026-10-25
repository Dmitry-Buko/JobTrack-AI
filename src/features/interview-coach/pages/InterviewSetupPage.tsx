import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Mic, Play, Type } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useGetApplicationsQuery } from '@/features/applications/api/applicationsApi';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import {
  DIFFICULTY_LABELS,
  INTERVIEW_DIFFICULTIES,
  INTERVIEW_LANGUAGES,
  INTERVIEW_TOPICS,
  INTERVIEW_MODE_LABELS,
  LANGUAGE_LABELS,
  TOPIC_LABELS,
} from '@/types/interview';

import { useCreateSessionMutation } from '../api/sessionsApi';
import { DEFAULT_SETUP_VALUES, MAX_QUESTIONS, MIN_QUESTIONS, interviewSetupSchema, type InterviewSetupValues } from '../lib/schema';

/** Переключатель формата тренировки: текстовый / голосовой. */
function ModeSwitch({
  value,
  onChange,
}: {
  value: InterviewSetupValues['mode'];
  onChange: (mode: InterviewSetupValues['mode']) => void;
}) {
  const options = [
    { value: 'text' as const, label: INTERVIEW_MODE_LABELS.text, icon: Type },
    { value: 'voice' as const, label: INTERVIEW_MODE_LABELS.voice, icon: Mic },
  ];
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Формат тренировки">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
            value === option.value
              ? 'border-accent bg-accent-soft text-accent'
              : 'border-border bg-surface text-muted hover:bg-surface-muted hover:text-text',
          )}
        >
          <option.icon className="size-4" aria-hidden />
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function InterviewSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: applications = [] } = useGetApplicationsQuery();
  const [createSession, { isLoading }] = useCreateSessionMutation();
  const [serverError, setServerError] = useState<string | null>(null);

  const preselectedApplicationId = searchParams.get('applicationId') ?? '';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InterviewSetupValues>({
    resolver: zodResolver(interviewSetupSchema),
    defaultValues: { ...DEFAULT_SETUP_VALUES, applicationId: preselectedApplicationId },
  });

  const mode = watch('mode');

  const onSubmit = async (values: InterviewSetupValues) => {
    setServerError(null);
    try {
      const session = await createSession({
        mode: values.mode,
        topic: values.topic,
        difficulty: values.difficulty,
        language: values.language,
        question_count: values.questionCount,
        application_id: values.applicationId === '' ? null : values.applicationId,
        status: 'active',
      }).unwrap();
      navigate(`/interview-coach/session/${session.id}`);
    } catch {
      setServerError('Не удалось создать тренировку. Проверьте подключение и попробуйте ещё раз.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Interview Coach</h1>
        <p className="mt-1 text-sm text-muted">
          Выберите формат, тему и сложность — ИИ проведёт тренировочное собеседование и разберёт
          ответы.
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-text">Формат</span>
            <ModeSwitch value={mode} onChange={(next) => setValue('mode', next)} />
          </div>

          {mode === 'voice' && (
            <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-xs leading-relaxed text-muted">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Голосовое собеседование: доступ к микрофону запрашивается после нажатия «Начать».
              Аудио обрабатывается внешним AI-сервисом OpenAI; сами записи не сохраняются — в
              историю попадает только текстовая расшифровка и результаты оценки.
            </p>
          )}

          <Select label="Тема" error={errors.topic?.message} {...register('topic')}>
            {INTERVIEW_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {TOPIC_LABELS[topic]}
              </option>
            ))}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Сложность" error={errors.difficulty?.message} {...register('difficulty')}>
              {INTERVIEW_DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {DIFFICULTY_LABELS[difficulty]}
                </option>
              ))}
            </Select>
            <Select label="Язык общения" error={errors.language?.message} {...register('language')}>
              {INTERVIEW_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {LANGUAGE_LABELS[language]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={`Количество вопросов (${MIN_QUESTIONS}–${MAX_QUESTIONS})`}
              type="number"
              min={MIN_QUESTIONS}
              max={MAX_QUESTIONS}
              error={errors.questionCount?.message}
              {...register('questionCount', { valueAsNumber: true })}
            />
            <Select
              label="Вакансия (необязательно)"
              hint="Вопросы учтут требования выбранной вакансии"
              {...register('applicationId')}
            >
              <option value="">Без привязки к вакансии</option>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.company} — {application.position}
                </option>
              ))}
            </Select>
          </div>

          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
            Режимы Junior, Junior+ и Middle задают сложность вопросов и глубину ожидаемых ответов, а
            не гарантируют оценку вашего реального уровня.
          </p>

          {serverError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={isLoading} icon={<Play className="size-4" aria-hidden />}>
            {mode === 'text' ? 'Начать текстовую тренировку' : 'Перейти к голосовой сессии'}
          </Button>
        </form>
      </Card>

      <CardContent className="px-1 text-xs text-muted">
        Тренировка — это подготовка, а не экзамен: оценки AI помогают увидеть пробелы, но не
        являются официальным результатом.
      </CardContent>
    </div>
  );
}
