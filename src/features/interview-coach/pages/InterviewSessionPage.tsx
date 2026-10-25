import { useParams } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { PageLoader } from '@/components/ui/PageLoader';

import { useGetSessionQuery } from '../api/sessionsApi';
import { SessionReportView } from '../components/SessionReportView';
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

  if (session.status !== 'active') {
    return <SessionReportView session={session} />;
  }

  if (session.mode === 'voice') {
    return <VoiceSessionView session={session} onFinished={() => void refetch()} />;
  }

  return <TextSessionView session={session} onFinished={() => void refetch()} />;
}
