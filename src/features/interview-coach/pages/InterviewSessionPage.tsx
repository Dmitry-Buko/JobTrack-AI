import { useParams } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';

import { useGetSessionQuery } from '../api/sessionsApi';
import { SessionReportView } from '../components/SessionReportView';
import { TestResultsView } from '../components/TestResultsView';
import { TestSessionView } from '../components/TestSessionView';
import { TextSessionView } from '../components/TextSessionView';
import { VoiceSessionView } from '../components/VoiceSessionView';

export function InterviewSessionPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: session, isLoading, isError, error, refetch } = useGetSessionQuery(id);

  if (isLoading) return <PageLoader label="Открываем тренировку…" />;

  if (isError || !session) {
    return (
      <ErrorState
        title="Тренировка не найдена"
        message={
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: string }).message)
            : 'Возможно, ссылка устарела.'
        }
        onRetry={() => void refetch()}
      />
    );
  }

  // Завершённые тесты — экран результатов с разбором по вопросам.
  if (session.status !== 'active') {
    return session.format === 'test' ? (
      <TestResultsView session={session} />
    ) : (
      <SessionReportView session={session} />
    );
  }

  if (session.mode === 'voice') {
    return <VoiceSessionView session={session} onFinished={() => void refetch()} />;
  }

  // Старые текстовые сессии (format = null) открываются в прежнем диалоговом виде.
  return session.format === 'test' ? (
    <TestSessionView session={session} onFinished={() => void refetch()} />
  ) : (
    <TextSessionView session={session} onFinished={() => void refetch()} />
  );
}
