import { Globe2, Rss, Send } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { MarketVacancy } from '@/features/ai/lib/schemas';

export interface SourceMeta {
  label: string;
  icon: LucideIcon;
}

export const SOURCE_META: Record<MarketVacancy['source'], SourceMeta> = {
  telegram: { label: 'Telegram', icon: Send },
  remoteok: { label: 'RemoteOK', icon: Globe2 },
  wwr: { label: 'WWR', icon: Rss },
};

/** Подпись источника на карточке: для TG показываем конкретный канал. */
export function sourceLabel(vacancy: MarketVacancy): string {
  if (vacancy.source === 'telegram' && vacancy.channel) return `@${vacancy.channel}`;
  return SOURCE_META[vacancy.source].label;
}

/** Цвет процента совпадения: ≥70 — зелёный, ≥40 — жёлтый, ниже — нейтральный. */
export function percentStrokeClass(percent: number): string {
  if (percent >= 70) return 'stroke-success';
  if (percent >= 40) return 'stroke-warning';
  return 'stroke-muted';
}

export function percentTextClass(percent: number): string {
  if (percent >= 70) return 'text-success-strong';
  if (percent >= 40) return 'text-warning-strong';
  return 'text-muted';
}
