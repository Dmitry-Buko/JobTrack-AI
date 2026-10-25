import { BrainCircuit, CheckCircle2, CircleAlert, Clock, HelpCircle } from 'lucide-react';
import { useState } from 'react';

import { useAnalyzeJobMutation } from '@/features/ai/api/aiApi';
import { useGetProfileQuery, useGetSkillsQuery } from '@/features/profile/api/profileApi';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/utils';
import type { Application } from '@/types/application';
import type { JobAnalysisResult } from '@/types/job-analysis';

import { useAddJobAnalysisMutation, useGetJobAnalysesQuery } from '../api/applicationsApi';

function AnalysisResult({ result }: { result: JobAnalysisResult }) {
  return (
    <div className="space-y-5 text-sm">
      <p className="text-text">{result.summary}</p>

      <section>
        <h4 className="mb-2 font-medium text-text">Совпадения с вашим профилем</h4>
        <ul className="space-y-1.5">
          {result.matched_skills.map((item) => (
            <li key={item.name} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <span>
                <span className="font-medium">{item.name}</span>
                {item.comment && <span className="text-muted"> — {item.comment}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 font-medium text-text">Не указано в профиле</h4>
        <ul className="space-y-1.5">
          {result.unconfirmed_requirements.map((item) => (
            <li key={item.requirement} className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <span>
                <span className="font-medium">{item.requirement}</span>
                {item.note && <span className="text-muted"> — {item.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 font-medium text-text">Требует проверки</h4>
        <ul className="space-y-1.5">
          {result.needs_verification.map((item) => (
            <li key={item.requirement} className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="font-medium">{item.requirement}</span>
                {item.note && <span className="text-muted"> — {item.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 font-medium text-text">Рекомендации по подготовке</h4>
        <ul className="list-inside list-disc space-y-1 text-muted">
          {result.preparation_recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 font-medium text-text">Возможные вопросы на собеседовании</h4>
        <ul className="list-inside list-disc space-y-1 text-muted">
          {result.possible_interview_questions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function JobAnalysisPanel({ application }: { application: Application }) {
  const toast = useToast();
  const { data: analyses = [] } = useGetJobAnalysesQuery(application.id);
  const [analyzeJob, { isLoading: isAnalyzing }] = useAnalyzeJobMutation();
  const [addJobAnalysis] = useAddJobAnalysisMutation();
  const { data: profile } = useGetProfileQuery();
  const { data: skills = [] } = useGetSkillsQuery();

  const [selected, setSelected] = useState<JobAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setError(null);
    try {
      const result = await analyzeJob({
        company: application.company,
        position: application.position,
        description: application.description ?? '',
        targetRole: profile?.target_role ?? null,
        skills: skills.map((skill) => ({ name: skill.name, level: skill.self_assessed_level })),
      }).unwrap();
      setSelected(result);
      // Сохраняем результат с датой, чтобы вернуться к нему позже.
      await addJobAnalysis({ applicationId: application.id, result });
      toast.success('Анализ готов и сохранён в историю');
    } catch (analysisError) {
      setError(
        typeof analysisError === 'object' && analysisError !== null && 'message' in analysisError
          ? String((analysisError as { message: string }).message)
          : 'AI-анализ недоступен. Попробуйте позже.',
      );
    }
  };

  const hasDescription = Boolean(application.description && application.description.trim());
  const latest = selected ?? analyses[0]?.result ?? null;

  return (
    <Card>
      <CardHeader
        title="AI-анализ требований"
        description="Сопоставление вакансии с вашим профилем навыков"
        actions={
          <Button
            size="sm"
            onClick={() => void runAnalysis()}
            loading={isAnalyzing}
            disabled={!hasDescription}
            icon={<BrainCircuit className="size-4" aria-hidden />}
          >
            Анализировать
          </Button>
        }
      />
      <CardContent>
        <p className="mb-4 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
          Уровни владения технологиями — самооценка из профиля. Отсутствие технологии в профиле
          означает «не указано в профиле», а не отсутствие навыка.
        </p>

        {isAnalyzing && <Skeleton className="h-40" />}

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {!isAnalyzing && latest && <AnalysisResult result={latest} />}

        {!isAnalyzing && !latest && !hasDescription && (
          <p className="text-sm text-muted">
            Добавьте описание вакансии, чтобы запустить анализ требований.
          </p>
        )}

        {!isAnalyzing && !latest && hasDescription && (
          <p className="text-sm text-muted">
            Нажмите «Анализировать» — ИИ сопоставит требования вакансии с вашим профилем и
            подготовит вопросы для собеседования.
          </p>
        )}

        {analyses.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text">
              <Clock className="size-4 text-muted" aria-hidden />
              Предыдущие анализы
            </h4>
            <ul className="space-y-1">
              {analyses.map((analysis) => (
                <li key={analysis.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(analysis.result)}
                    className="text-sm text-accent hover:text-accent-hover hover:underline"
                  >
                    {formatDateTime(analysis.created_at)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
