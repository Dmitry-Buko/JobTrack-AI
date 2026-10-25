import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
  CRITERION_LABELS,
  EVALUATION_CRITERIA,
  type AnswerEvaluation,
  type CriterionScore,
} from '@/types/interview';

function scoreBadgeClass(score: number): string {
  if (score >= 4) return 'border-success/30 bg-success-soft text-success';
  if (score === 3) return 'border-warning/30 bg-warning-soft text-warning';
  return 'border-danger/30 bg-danger-soft text-danger';
}

function ScoreRow({ label, score }: { label: string; score: CriterionScore }) {
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text">{label}</span>
        {'score' in score ? (
          <Badge className={scoreBadgeClass(score.score)}>{score.score} / 5</Badge>
        ) : (
          <Badge className="border-border bg-surface-muted text-muted">Недостаточно данных</Badge>
        )}
      </div>
      {score.comment && <p className="mt-1.5 text-xs leading-relaxed text-muted">{score.comment}</p>}
    </li>
  );
}

export function EvaluationCard({ evaluation }: { evaluation: AnswerEvaluation }) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-muted/50 p-4">
      <h4 className="text-sm font-semibold text-text">Разбор ответа</h4>

      <ul className="grid gap-2 sm:grid-cols-2">
        {EVALUATION_CRITERIA.map((criterion) => (
          <ScoreRow key={criterion} label={CRITERION_LABELS[criterion]} score={evaluation.scores[criterion]} />
        ))}
      </ul>

      {(evaluation.strengths.length > 0 || evaluation.gaps.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {evaluation.strengths.length > 0 && (
            <div>
              <h5 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-success">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Что верно
              </h5>
              <ul className="space-y-1 text-xs leading-relaxed text-muted">
                {evaluation.strengths.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.gaps.length > 0 && (
            <div>
              <h5 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-warning">
                <AlertTriangle className="size-3.5" aria-hidden />
                Неточности и пробелы
              </h5>
              <ul className="space-y-1 text-xs leading-relaxed text-muted">
                {evaluation.gaps.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {evaluation.model_answer && (
        <details className="rounded-lg border border-border bg-surface">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-text">
            Эталонный ответ
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-3 text-xs leading-relaxed text-muted">
            {evaluation.model_answer}
          </p>
        </details>
      )}

      {evaluation.follow_up_question && (
        <p
          className={cn(
            'flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs leading-relaxed text-accent',
          )}
        >
          <HelpCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Уточняющий вопрос: {evaluation.follow_up_question}
        </p>
      )}
    </div>
  );
}
