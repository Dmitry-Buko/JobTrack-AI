import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  CRITERION_LABELS,
  EVALUATION_CRITERIA,
  type AnswerEvaluation,
  type CriterionScore,
} from '@/types/interview';

function scoreBarClass(score: number): { bar: string; text: string } {
  if (score >= 4) return { bar: 'bg-success', text: 'text-success-strong' };
  if (score === 3) return { bar: 'bg-warning', text: 'text-warning-strong' };
  return { bar: 'bg-danger', text: 'text-danger-strong' };
}

/** Полоса-индикатор критерия, как кольца и полосы в приложении «Активность». */
function ScoreRow({ label, score }: { label: string; score: CriterionScore }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-text">{label}</span>
        {'score' in score ? (
          <span className={cn('tabular text-[13px] font-semibold', scoreBarClass(score.score).text)}>
            {score.score} из 5
          </span>
        ) : (
          <span className="text-[13px] text-muted">Недостаточно данных</span>
        )}
      </div>
      <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.1]">
        {'score' in score ? (
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-[var(--ease-ios)]',
              scoreBarClass(score.score).bar,
            )}
            style={{ width: `${(score.score / 5) * 100}%` }}
            aria-hidden
          />
        ) : (
          <div className="h-full w-0" aria-hidden />
        )}
      </div>
      {score.comment && <p className="mt-1 text-[12px] leading-relaxed text-muted">{score.comment}</p>}
    </li>
  );
}

export function EvaluationCard({ evaluation }: { evaluation: AnswerEvaluation }) {
  return (
    <div className="squircle space-y-4 rounded-[16px] bg-surface-muted/70 p-4">
      <h4 className="text-[13px] font-semibold tracking-[0.01em] text-muted uppercase">
        Разбор ответа
      </h4>

      <ul className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
        {EVALUATION_CRITERIA.map((criterion) => (
          <ScoreRow key={criterion} label={CRITERION_LABELS[criterion]} score={evaluation.scores[criterion]} />
        ))}
      </ul>

      {(evaluation.strengths.length > 0 || evaluation.gaps.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {evaluation.strengths.length > 0 && (
            <div>
              <h5 className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-success-strong">
                <CheckCircle2 className="size-3.5" strokeWidth={1.75} aria-hidden />
                Что верно
              </h5>
              <ul className="space-y-1 text-[13px] leading-relaxed text-muted">
                {evaluation.strengths.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.gaps.length > 0 && (
            <div>
              <h5 className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-warning-strong">
                <AlertTriangle className="size-3.5" strokeWidth={1.75} aria-hidden />
                Неточности и пробелы
              </h5>
              <ul className="space-y-1 text-[13px] leading-relaxed text-muted">
                {evaluation.gaps.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {evaluation.model_answer && (
        <details className="rounded-control bg-surface">
          <summary className="cursor-pointer px-3 py-2 text-[13px] font-medium text-accent">
            Эталонный ответ
          </summary>
          <p className="whitespace-pre-wrap px-3 pb-3 text-[13px] leading-relaxed text-muted">
            {evaluation.model_answer}
          </p>
        </details>
      )}

      {evaluation.follow_up_question && (
        <p
          className={cn(
            'flex items-start gap-2 rounded-control bg-accent-soft px-3 py-2 text-[13px] leading-relaxed text-accent',
          )}
        >
          <HelpCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Уточняющий вопрос: {evaluation.follow_up_question}
        </p>
      )}
    </div>
  );
}
