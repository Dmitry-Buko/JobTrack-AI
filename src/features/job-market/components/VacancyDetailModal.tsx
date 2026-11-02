import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { MarketVacancy } from '@/features/ai/lib/schemas';

import { MatchRing } from './MatchRing';
import { SOURCE_META, sourceLabel } from '../lib/source';

/** Детальный разбор вакансии: процент, совпадения/пробелы, пояснение AI и описание. */
export function VacancyDetailModal({
  vacancy,
  open,
  onClose,
}: {
  vacancy: MarketVacancy | null;
  open: boolean;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!vacancy) return null;
  const SourceIcon = SOURCE_META[vacancy.source].icon;
  const position = vacancy.position || 'Позиция уточняется в посте';
  const match = vacancy.match;

  return (
    <Modal open={open} onClose={onClose} title={position} size="md">
      <div className="flex items-start gap-4 pb-4">
        {match ? (
          <div className="flex flex-col items-center gap-1">
            <MatchRing percent={match.percent} size={64} />
            <span className="text-[12px] text-muted">совпадение</span>
          </div>
        ) : (
          <Badge className="bg-warning-soft text-warning-strong">Проценты недоступны</Badge>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[15px] font-semibold text-text">{vacancy.company || 'Компания не указана'}</p>
          <p className="text-[13px] text-muted">
            {[vacancy.location, vacancy.salary].filter(Boolean).join(' · ') || '—'}
          </p>
          <div className="flex items-center gap-2 pt-0.5">
            <Badge className="bg-surface-muted text-muted">
              <SourceIcon className="size-3" strokeWidth={1.75} aria-hidden />
              {sourceLabel(vacancy)}
            </Badge>
            {vacancy.publishedAt && (
              <span className="text-[12px] text-muted">{formatDateTime(vacancy.publishedAt)}</span>
            )}
          </div>
        </div>
      </div>

      {match && (
        <div className="space-y-3 border-t border-separator py-4">
          {match.summary && <p className="text-[14px] leading-relaxed text-text">{match.summary}</p>}
          {match.matched.length > 0 && (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-muted">Совпадает</p>
              <div className="flex flex-wrap gap-1.5">
                {match.matched.map((skill) => (
                  <Badge key={skill} className="bg-success-soft text-success-strong">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {match.missing.length > 0 && (
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-muted">Чего не хватает</p>
              <div className="flex flex-wrap gap-1.5">
                {match.missing.map((skill) => (
                  <Badge key={skill} className="bg-warning-soft text-warning-strong">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {vacancy.description && (
        <div className="border-t border-separator py-4">
          <p className="mb-1.5 text-[13px] font-medium text-muted">Описание</p>
          <p className={cn('whitespace-pre-line text-[14px] leading-relaxed text-text', !expanded && 'line-clamp-8')}>
            {vacancy.description}
          </p>
          {vacancy.description.length > 400 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-1 text-[13px] font-medium text-accent transition active:scale-[0.97]"
            >
              {expanded ? 'Свернуть' : 'Показать полностью'}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pb-1 pt-2 sm:flex-row sm:justify-end">
        <a
          href={vacancy.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-contrast transition duration-200 ease-[var(--ease-ios)] hover:bg-accent-hover active:scale-[0.97] active:brightness-95"
        >
          <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
          Открыть источник
        </a>
      </div>
    </Modal>
  );
}
