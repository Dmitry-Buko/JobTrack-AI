import { Info, Mic, MicOff, PhoneOff, RotateCcw } from 'lucide-react';
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
import { Card } from '@/components/ui/Card';
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

type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'ai_speaking' | 'error';

/**
 * Индикатор состояния в духе «Dynamic Island»: тёмная капсула с подписью
 * и живой волной. Это только представление уже существующего статуса сессии.
 */
function VoiceStatusIsland({ status, muted }: { status: VoiceStatus; muted: boolean }) {
  const label =
    status === 'connecting'
      ? 'Подключение…'
      : status === 'listening' && muted
        ? 'Микрофон выключен'
        : status === 'listening'
          ? 'Слушаю'
          : status === 'ai_speaking'
            ? 'Отвечаю'
            : status === 'error'
              ? 'Ошибка'
              : 'Готово к запуску';

  const dotClass =
    status === 'listening'
      ? muted
        ? 'bg-white/40'
        : 'bg-success'
      : status === 'ai_speaking'
        ? 'bg-[#0a84ff]'
        : status === 'error'
          ? 'bg-danger'
          : 'bg-white/40';

  const waveActive = (status === 'listening' && !muted) || status === 'ai_speaking';

  return (
    <div
      className={cn(
        'sticky top-[64px] z-20 mx-auto flex w-fit items-center gap-2.5 rounded-full bg-black px-4 py-2',
        'text-[13px] font-medium text-white shadow-raised lg:top-3',
      )}
      role="status"
      aria-live="polite"
    >
      {status === 'connecting' ? <Spinner className="size-3.5" /> : (
        <span className={cn('size-2 shrink-0 rounded-full transition-colors', dotClass)} aria-hidden />
      )}
      {label}
      <span className="flex h-3.5 items-center gap-[3px]" aria-hidden>
        {[0, 1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={cn(
              'w-[3px] rounded-full transition-colors',
              waveActive ? 'bg-white animate-wave' : 'bg-white/25',
            )}
            style={{
              height: waveActive ? '100%' : '40%',
              animationDelay: `${bar * 110}ms`,
            }}
          />
        ))}
      </span>
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
        <VoiceStatusIsland status={realtime.status} muted={realtime.muted} />

        <div className="pt-2">
          <h1>Голосовое собеседование</h1>
          <p className="mt-1 text-[15px] text-muted">
            {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]} ·{' '}
            {session.question_count} вопросов
            {application ? ` · ${application.company} — ${application.position}` : ''}
          </p>
        </div>

        <Card className="p-6">
          <p className="flex items-start gap-2 rounded-control bg-surface-muted px-3 py-2.5 text-[13px] leading-relaxed text-muted">
            <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Аудио обрабатывается внешним AI-сервисом Google (Gemini) и не сохраняется. В историю тренировок
            попадает только текстовая расшифровка диалога и итоговая оценка.
          </p>

          <Button
            size="lg"
            className="mt-5 w-full"
            icon={<Mic className="size-5" strokeWidth={1.75} aria-hidden />}
            onClick={() => void realtime.start()}
            loading={realtime.status === 'connecting'}
          >
            Начать голосовое собеседование
          </Button>

          <p className="mt-3 text-center text-[13px] text-muted">
            Нажимая кнопку, вы разрешаете доступ к микрофону этому сайту.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <VoiceStatusIsland status={realtime.status} muted={realtime.muted} />

      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
        <div>
          <p className="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-text">
            {TOPIC_LABELS[session.topic]} · {DIFFICULTY_LABELS[session.difficulty]}
          </p>
          {application && (
            <p className="mt-0.5 text-[15px] text-muted">
              Подготовка к: {application.company} — {application.position}
            </p>
          )}
        </div>
      </div>

      {realtime.status === 'error' && realtime.error && (
        <Card className="bg-danger-soft p-4 shadow-card">
          <p role="alert" className="text-[15px] text-danger-strong">
            {realtime.error}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void realtime.start()}
              icon={<RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />}
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

      {/* Текущий вопрос: спокойно и крупно */}
      <section className="squircle rounded-card bg-surface p-5 shadow-card">
        <p className="text-[13px] font-semibold tracking-[0.01em] text-accent uppercase">
          {realtime.status === 'ai_speaking' ? 'ИИ сейчас говорит' : 'Текущий вопрос'}
        </p>
        <p className="mt-2 text-[20px] leading-snug font-semibold tracking-[-0.01em] text-text">
          {realtime.currentQuestion?.text ?? 'ИИ готовит первый вопрос…'}
        </p>
      </section>

      <section>
        <p className="mb-1.5 px-1 text-[13px] font-medium tracking-[0.02em] text-muted uppercase">
          Расшифровка диалога
        </p>
        {realtime.transcript.length === 0 ? (
          <p className="px-1 text-[15px] text-muted">
            Здесь появится текстовая расшифровка — она сохранится в историю тренировки.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {realtime.transcript.map((line) => (
              <div
                key={line.id}
                className={cn(
                  'max-w-[85%] animate-appear sm:max-w-[75%]',
                  line.role === 'user' && 'ml-auto',
                )}
              >
                <div
                  className={cn(
                    'squircle px-4 py-3 text-[15px] leading-relaxed',
                    line.role === 'assistant'
                      ? 'rounded-[20px] rounded-tl-[8px] bg-surface-muted text-text shadow-card'
                      : 'rounded-[20px] rounded-tr-[8px] bg-accent text-accent-contrast',
                  )}
                >
                  <p className="mb-0.5 text-[12px] font-medium opacity-60">
                    {line.role === 'assistant' ? 'Интервьюер' : 'Вы'}
                  </p>
                  {line.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3 pb-4">
        <Button
          size="lg"
          variant="secondary"
          onClick={realtime.toggleMute}
          icon={
            realtime.muted ? (
              <MicOff className="size-5 text-danger-strong" strokeWidth={1.75} aria-hidden />
            ) : (
              <Mic className="size-5" strokeWidth={1.75} aria-hidden />
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
          icon={<PhoneOff className="size-5" strokeWidth={1.75} aria-hidden />}
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
