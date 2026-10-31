import { zodResolver } from '@hookform/resolvers/zod';
import { Info, Mic, Play, Shuffle, Target, Type } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useGetApplicationsQuery } from '@/features/applications/api/applicationsApi';
import { useGetSessionsQuery } from '@/features/interview-coach/api/sessionsApi';
import { getWeakTopics } from '@/features/dashboard/stats';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import {
  DIFFICULTY_LABELS,
  INTERVIEW_DIFFICULTIES,
  INTERVIEW_LANGUAGES,
  INTERVIEW_MODE_LABELS,
  INTERVIEW_TOPICS,
  LANGUAGE_LABELS,
  TOPIC_LABELS,
} from '@/types/interview';

import { useCreateSessionMutation } from '../api/sessionsApi';
import {
  DEFAULT_SETUP_VALUES,
  TEST_QUESTION_COUNTS,
  interviewSetupSchema,
  testSetupSchema,
  type InterviewSetupValues,
  type TestSetupValues,
} from '../lib/schema';
import { JS_SUBTOPICS, matchWeakSubtopics, pickRandomSubtopics } from '../lib/subtopics';
import { resetTestSession } from '../testSession/testSessionSlice';
import { useAppDispatch } from '@/app/hooks';

interface RepeatSetupState {
  subtopics: string[];
  difficulty: TestSetupValues['difficulty'];
  questionCount: number;
}

export function InterviewSetupPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: applications = [] } = useGetApplicationsQuery();
  const { data: sessions = [] } = useGetSessionsQuery();
  const [createSession, { isLoading }] = useCreateSessionMutation();
  const [serverError, setServerError] = useState<string | null>(null);

  // Слабые темы из отчётов прошлых тренировок — подсвечиваем на чипах.
  const weakSubtopicKeys = useMemo(
    () => new Set(matchWeakSubtopics(getWeakTopics(sessions).map((topic) => topic.topic))),
    [sessions],
  );

  const repeatSetup = (location.state as { repeatSetup?: RepeatSetupState } | null)?.repeatSetup;

  // Текстовый режим — тест по темам JavaScript; подтемы — местный стейт (чипы).
  const [subtopics, setSubtopics] = useState<string[]>(repeatSetup?.subtopics ?? []);

  const preselectedApplicationId = searchParams.get('applicationId') ?? '';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InterviewSetupValues>({
    resolver: zodResolver(interviewSetupSchema),
    defaultValues: {
      ...DEFAULT_SETUP_VALUES,
      difficulty: repeatSetup?.difficulty ?? DEFAULT_SETUP_VALUES.difficulty,
      questionCount: repeatSetup?.questionCount ?? DEFAULT_SETUP_VALUES.questionCount,
      applicationId: preselectedApplicationId,
    },
  });

  const mode = watch('mode');
  const difficulty = watch('difficulty');
  const questionCount = watch('questionCount');

  // Предвыбор слабых тем («Повторить слабые темы») — один раз при монтировании.
  useEffect(() => {
    if (repeatSetup?.subtopics?.length) {
      setSubtopics(repeatSetup.subtopics);
    }
  }, [repeatSetup]);

  const toggleSubtopic = (key: string) => {
    setSubtopics((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const canStartTest = mode === 'voice' || subtopics.length > 0;

  const onSubmit = async (values: InterviewSetupValues) => {
    setServerError(null);
    if (values.mode === 'text') {
      const testValues = testSetupSchema.safeParse({
        ...values,
        subtopics,
        questionCount: TEST_QUESTION_COUNTS.includes(questionCount as (typeof TEST_QUESTION_COUNTS)[number])
          ? questionCount
          : TEST_QUESTION_COUNTS[0],
      });
      if (!testValues.success) {
        setServerError(testValues.error.errors[0]?.message ?? 'Выберите хотя бы одну тему');
        return;
      }
      try {
        const session = await createSession({
          mode: 'text',
          format: 'test',
          selected_topics: testValues.data.subtopics,
          topic: 'javascript',
          difficulty: testValues.data.difficulty,
          language: testValues.data.language,
          question_count: testValues.data.questionCount,
          application_id: testValues.data.applicationId === '' ? null : testValues.data.applicationId,
          status: 'active',
        }).unwrap();
        dispatch(resetTestSession());
        navigate(`/interview-coach/session/${session.id}`);
      } catch (error) {
        console.error('[interview-setup] Не удалось создать тестовую сессию:', error);
        setServerError('Не удалось начать тест. Подробности — в консоли браузера.');
      }
      return;
    }

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
    } catch (error) {
      console.error('[interview-setup] Не удалось создать голосовую сессию:', error);
      setServerError('Не удалось создать тренировку. Подробности — в консоли браузера.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1>Тренажёр собеседований</h1>
        <p className="mt-1 text-[15px] text-muted">
          {mode === 'text'
            ? 'Выберите темы и уровень — вопросы появятся по одному, разбор ждёт в конце.'
            : 'Голосовая тренировка с AI-интервьюером.'}
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-muted">Режим</span>
            <SegmentedControl
              aria-label="Режим тренировки"
              size="lg"
              value={mode}
              onChange={(next) => setValue('mode', next)}
              options={[
                { value: 'text', label: 'Тест', icon: Type },
                { value: 'voice', label: INTERVIEW_MODE_LABELS.voice, icon: Mic },
              ]}
            />
          </div>

          {mode === 'text' ? (
            <>
              {/* Темы: мультивыбор чипами, минимум одна */}
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-muted">
                    Темы{' '}
                    <span className="text-subtle">
                      {subtopics.length > 0
                        ? `· выбрано ${subtopics.length}`
                        : '· минимум одна'}
                    </span>
                    {weakSubtopicKeys.size > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-warning-strong">
                        <span className="size-1.5 rounded-full bg-warning" aria-hidden />
                        {weakSubtopicKeys.size} стоит повторить
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {weakSubtopicKeys.size > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Target className="size-4" strokeWidth={1.75} aria-hidden />}
                        onClick={() => setSubtopics([...weakSubtopicKeys])}
                      >
                        Слабые темы
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={<Shuffle className="size-4" strokeWidth={1.75} aria-hidden />}
                      onClick={() => setSubtopics(pickRandomSubtopics())}
                    >
                      Любые темы
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Темы теста">
                  {JS_SUBTOPICS.map((subtopic) => {
                    const active = subtopics.includes(subtopic.key);
                    const weak = weakSubtopicKeys.has(subtopic.key);
                    return (
                      <button
                        key={subtopic.key}
                        type="button"
                        aria-pressed={active}
                        title={weak ? 'Слабая тема по отчётам тренировок' : undefined}
                        onClick={() => toggleSubtopic(subtopic.key)}
                        className={cn(
                          'squircle inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium',
                          'transition duration-200 ease-[var(--ease-ios)] active:scale-[0.96]',
                          active
                            ? 'bg-accent text-accent-contrast'
                            : 'bg-surface-muted text-text hover:bg-black/[0.08] dark:hover:bg-white/[0.12]',
                        )}
                      >
                        {weak && (
                          <span
                            className={cn(
                              'size-1.5 shrink-0 rounded-full',
                              active ? 'bg-accent-contrast/80' : 'bg-warning',
                            )}
                            aria-hidden
                          />
                        )}
                        {subtopic.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Уровень */}
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-muted">Уровень</span>
                <SegmentedControl
                  aria-label="Уровень сложности"
                  value={difficulty}
                  onChange={(next) => setValue('difficulty', next)}
                  options={INTERVIEW_DIFFICULTIES.map((level) => ({
                    value: level,
                    label: DIFFICULTY_LABELS[level],
                  }))}
                />
              </div>

              {/* Количество вопросов: 5 или 10 */}
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-muted">
                  Количество вопросов
                </span>
                <SegmentedControl
                  aria-label="Количество вопросов"
                  value={String(questionCount) as '5' | '10'}
                  onChange={(next) => setValue('questionCount', Number(next))}
                  options={TEST_QUESTION_COUNTS.map((count) => ({
                    value: String(count) as '5' | '10',
                    label: `${count} вопросов`,
                  }))}
                />
              </div>
            </>
          ) : (
            <>
              <Select label="Тема" {...register('topic')}>
                {INTERVIEW_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {TOPIC_LABELS[topic]}
                  </option>
                ))}
              </Select>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Сложность" {...register('difficulty')}>
                  {INTERVIEW_DIFFICULTIES.map((level) => (
                    <option key={level} value={level}>
                      {DIFFICULTY_LABELS[level]}
                    </option>
                  ))}
                </Select>
                <Select label="Язык общения" {...register('language')}>
                  {INTERVIEW_LANGUAGES.map((language) => (
                    <option key={language} value={language}>
                      {LANGUAGE_LABELS[language]}
                    </option>
                  ))}
                </Select>
              </div>

              <p className="flex items-start gap-2 rounded-control bg-surface-muted px-3 py-2.5 text-[13px] leading-relaxed text-muted">
                <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Доступ к микрофону запрашивается после нажатия «Начать». Аудио обрабатывается внешним
                AI-сервисом Google (Gemini); записи не сохраняются — в историю попадает только
                текстовая расшифровка и результаты оценки.
              </p>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {mode === 'text' && (
              <Input
                label={`Количество вопросов (${TEST_QUESTION_COUNTS[0]}–${TEST_QUESTION_COUNTS[1]})`}
                type="number"
                min={TEST_QUESTION_COUNTS[0]}
                max={TEST_QUESTION_COUNTS[1]}
                error={errors.questionCount?.message}
                {...register('questionCount', { valueAsNumber: true })}
                className="hidden"
              />
            )}
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

          <p className="rounded-control bg-surface-muted px-3 py-2 text-[13px] text-muted">
            Тренировка — это подготовка, а не экзамен: оценки AI помогают увидеть пробелы, но не
            являются официальным результатом.
          </p>

          {serverError && (
            <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-[15px] text-danger-strong">
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={isLoading}
            disabled={!canStartTest}
            icon={<Play className="size-4" strokeWidth={1.75} aria-hidden />}
          >
            {mode === 'text' ? 'Начать тест' : 'Перейти к голосовой сессии'}
          </Button>
        </form>
      </Card>

      <p className="px-1 text-center text-[13px] text-muted">
        Подсказка расходует один запрос к AI — как и оценка ответа.
      </p>
    </div>
  );
}
