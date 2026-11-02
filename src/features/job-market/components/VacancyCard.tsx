import { ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatRelativeDate } from '@/lib/utils';
import type { MarketVacancy } from '@/features/ai/lib/schemas';

import { MatchRing } from './MatchRing';
import { SOURCE_META, sourceLabel } from '../lib/source';

/** Плейсхолдер процента, когда AI-матчинг недоступен. */
function NoMatchRing() {
  return (
    <div
      className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-surface-muted text-[13px] font-semibold text-muted"
      role="img"
      aria-label="Совпадение не рассчитано"
    >
      —
    </div>
  );
}

/** Строка результата поиска: кольцо процента + позиция + источник и дата. */
export function VacancyCard({ vacancy, onOpen }: { vacancy: MarketVacancy; onOpen: () => void }) {
  const SourceIcon = SOURCE_META[vacancy.source].icon;
  const position = vacancy.position || 'Позиция уточняется в посте';
  const companyLine = [vacancy.company, vacancy.location, vacancy.salary].filter(Boolean).join(' · ');

  return (
    <Card className="transition duration-200 ease-[var(--ease-ios)] active:scale-[0.97]">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        {vacancy.match ? <MatchRing percent={vacancy.match.percent} /> : <NoMatchRing />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-text">
            {position}
          </span>
          {companyLine && (
            <span className="mt-0.5 block truncate text-[13px] text-muted">{companyLine}</span>
          )}
          {vacancy.match?.summary && (
            <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-muted">
              {vacancy.match.summary}
            </span>
          )}
          <span className="mt-2 flex items-center gap-2">
            <Badge className="bg-surface-muted text-muted">
              <SourceIcon className="size-3" strokeWidth={1.75} aria-hidden />
              {sourceLabel(vacancy)}
            </Badge>
            {vacancy.publishedAt && (
              <span className="text-[12px] text-muted">
                {formatRelativeDate(vacancy.publishedAt)}
              </span>
            )}
          </span>
        </span>
        <ChevronRight className="size-[18px] shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
      </button>
    </Card>
  );
}
