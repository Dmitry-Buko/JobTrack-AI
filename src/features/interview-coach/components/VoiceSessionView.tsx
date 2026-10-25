import { Info, Mic, MicOff, PhoneOff, Radio, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  useAddMessagesMutation,
  useFinishSessionMutation,
} from '../api/sessionsApi';
import { useGenerateReportMutation } from '@/features/ai/api/aiApi';
import { useGetApplicationsQuery } from '@/features/applications/api/applicationsApi';
import { assembleReport } from '@/features/ai/lib/report';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import {
  DIFFICULTY_LABELS,
  TOPIC_LABELS,
  type InterviewSession,
  type SessionReport,
} from '@/types/interview';
import { useRealtimeSession } from '@/services/realtime/useRealtimeSession';

const EMPTY_REPORT: SessionReport = {
  total_questions: 0,
  answered_questions: 0,
  skipped_questions: 0,
  overall_score: null,
  strengths: [],
  weak_topics: [],
  weak_answers: [],
  topics_to_review: [],
  recommendations: [],
  conclusion: '',
};

const STATUS_LABELS = {
  idle: 'Готово к запуску',
  connecting: 'Подключение…',
  listening: 'Слушаю вас',
  ai_speaking: 'ИИ отвечает',
  error: 'Ошибка',
} as const;

function StatusIndicator({ status }: { status: keyof typeof STATUS_LABELS }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium"
      role="status"
      aria-live="polite"
    >
      {status === 'connecting' && <Spinner className="size-4" />}
      {status === 'listening' && (
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-success" />
        </span>
      )}
      {status === 'ai_speaking' && (
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
        </span>
      )}
      {status === 'error' && <span className="size-2.5 rounded-full bg-danger" />}
      {status === 'idle' && <span className="size-2.5 rounded-full bg-muted" />}
      {STATUS_LABELS[status]}
    </div>
  );
}

export function VoiceSessionView({
  session,
  onFinished,
}: {
  session: InterviewSession;
  onFinished: () => void;
}) {
  const toast = useToast();
  const { data: applications = [] } = useGetApplicationsQuery();
  const [addMessages] = useAddMessagesMutation();
  const [generateReport] = useGenerateReportMutation();
  const [finishSession] = useFinishSessionMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const application = session.application_id
    ? (applications.find((item) => item.id === session.application_id) ?? null)
    : null;

  const realtime = useRealtimeSession({
    topic: session.topic,
    difficulty: session.difficulty,
    language: session.language,
    questionCount: session.question_count,
    application: application
      ? { company: application.company, position: application.position, description: application.description }
      : null,
  });

  const isActive = realtime.status !== 'idle' || realtime.transcript.length > 0;

  const finish = async () => {
    setFinishing(true);
    const lines = [...realtime.transcript];
    realtime.stop();

    try {
      if (lines.length === 0) {
        await finishSession({
          id: session.id,
          status: 'aborted',
          summary: 'Голосовая сессия завершена без диалога.',
          report: EMPTY_REPORT,
        }).unwrap();
      } else {
        await addMessages({
          sessionId: session.id,
          messages: lines.map((line, index) => ({
            session_id: session.id,
            role: line.role,
            content: line.text,
            turn_index: index,
            evaluation: null,
          })),
        }).unwrap();

        const aiReport = await generateReport({
          topic: session.topic,
          difficulty: session.difficulty,
          language: session.language,
          messages: lines.map((line) => ({ role: line.role, content: line.text })),
        }).unwrap();

        await finishSession({
          id: session.id,
          status: 'completed',
          summary: aiReport.summary,
          report: assembleReport(
            aiReport,
            lines.map((line) => ({ role: line.role, content: line.text, evaluation: null })),
          ),
        }).unwrap();
      }
      onFinished();
    } catch {
      toast.error('Не удалось сохранить результаты сессии. Попробуйте завершить ещё раз.');
      setFinishing(false);
    }
  };

  if (!isActive) {
    // Стартовый экран: микрофон запрашивается только после нажатия кнопки.
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Голосовое собеседование</h1>
          <p className="mt-1 text-sm text-muted">
            {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]} ·{' '}
            {session.question_count} вопросов
            {application ? ` · ${application.company} — ${application.position}` : ''}
          </p>
        </div>

        <Card className="p-6">
          <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-xs leading-relaxed text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Аудио обрабатывается внешним AI-сервисом OpenAI и не сохраняется. В историю тренировок
            попадает только текстовая расшифровка диалога и итоговая оценка.
          </p>

          <Button
            size="lg"
            className="mt-5 w-full"
            icon={<Mic className="size-5" aria-hidden />}
            onClick={() => void realtime.start()}
            loading={realtime.status === 'connecting'}
          >
            Начать голосовое собеседование
          </Button>

          <p className="mt-3 text-center text-xs text-muted">
            Нажимая кнопку, вы разрешаете доступ к микрофону этому сайту.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]}
          </h1>
          {application && (
            <p className="mt-0.5 text-sm text-muted">
              Подготовка к: {application.company} — {application.position}
            </p>
          )}
        </div>
        <StatusIndicator status={realtime.status} />
      </div>

      {realtime.status === 'error' && realtime.error && (
        <Card className="border-danger/40 bg-danger-soft p-4">
          <p role="alert" className="text-sm text-danger">
            {realtime.error}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void realtime.start()}
              icon={<RotateCcw className="size-4" aria-hidden />}
            >
              Повторить подключение
            </Button>
            <Link to="/interview-coach">
              <Button variant="ghost" size="sm">
                Перейти в текстовый режим
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Radio
            className={cn(
              'mt-0.5 size-5 shrink-0',
              realtime.status === 'listening' ? 'text-success' : 'text-muted',
            )}
            aria-hidden
          />
          <div>
            <p className="text-xs font-medium text-muted">
              {realtime.status === 'ai_speaking' ? 'ИИ сейчас говорит:' : 'Текущий вопрос:'}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed text-text">
              {realtime.currentQuestion?.text ?? 'ИИ готовит первый вопрос…'}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-3 text-sm font-semibold text-text">Расшифровка диалога</h2>
          {realtime.transcript.length === 0 ? (
            <p className="text-sm text-muted">
              Здесь появится текстовая расшифровка — она сохранится в историю тренировки.
            </p>
          ) : (
            <ul className="space-y-3">
              {realtime.transcript.map((line) => (
                <li
                  key={line.id}
                  className={cn(
                    'rounded-xl border p-3 text-sm leading-relaxed',
                    line.role === 'assistant'
                      ? 'border-accent/30 bg-accent-soft/60 text-text'
                      : 'border-border bg-surface text-text',
                  )}
                >
                  <p className="mb-1 text-xs font-medium text-muted">
                    {line.role === 'assistant' ? 'Интервьюер' : 'Вы'}
                  </p>
                  {line.text}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-3 pb-4">
        <Button
          size="lg"
          variant="secondary"
          onClick={realtime.toggleMute}
          icon={
            realtime.muted ? (
              <MicOff className="size-5 text-danger" aria-hidden />
            ) : (
              <Mic className="size-5" aria-hidden />
            )
          }
        >
          {realtime.muted ? 'Включить микрофон' : 'Выключить микрофон'}
        </Button>
        <Button
          size="lg"
          variant="danger"
          onClick={() => setConfirmOpen(true)}
          disabled={finishing}
          icon={<PhoneOff className="size-5" aria-hidden />}
        >
          Завершить сессию
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Завершить голосовую сессию?"
        message="Расшифровка диалога сохранится в историю, и ИИ подготовит итоговый разбор."
        confirmLabel="Завершить"
        loading={finishing}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void finish();
        }}
      />
    </div>
  );
}
