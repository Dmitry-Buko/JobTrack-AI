import { Compass, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cn } from '@/lib/utils';
import { useSearchMarketMutation } from '@/features/ai/api/aiApi';
import type { MarketVacancy, MarketSearchResponse } from '@/features/ai/lib/schemas';

import { TagInput } from '../components/TagInput';
import { VacancyCard } from '../components/VacancyCard';
import { VacancyDetailModal } from '../components/VacancyDetailModal';
import {
  DEFAULT_PROFILE,
  MARKET_LEVELS,
  loadProfile,
  saveProfile,
  searchProfileSchema,
  type MarketLevel,
  type SearchProfile,
} from '../lib/profile';

function ResultsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="h-[104px] animate-pulse" />
      ))}
    </div>
  );
}

export function JobMarketPage() {
  const [searchMarket, { isLoading }] = useSearchMarketMutation();
  const [profile, setProfile] = useState<SearchProfile>(DEFAULT_PROFILE);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [results, setResults] = useState<MarketSearchResponse | null>(null);
  const [selected, setSelected] = useState<MarketVacancy | null>(null);

  // Сохранённый профиль подтягивается один раз при монтировании.
  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const updateProfile = (changes: Partial<SearchProfile>) =>
    setProfile((current) => ({ ...current, ...changes }));

  const handleSearch = async () => {
    setRoleError(null);
    setServerError(null);
    const parsed = searchProfileSchema.safeParse(profile);
    if (!parsed.success) {
      setRoleError(parsed.error.issues[0]?.message ?? 'Проверьте параметры поиска');
      return;
    }
    saveProfile(parsed.data);
    try {
      const response = await searchMarket({ profile: parsed.data }).unwrap();
      setResults(response);
    } catch (error) {
      console.error('[job-market] Поиск не удался:', error);
      setServerError(
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : 'Поиск не удался. Попробуйте позже.',
      );
    }
  };

  const hasResults = (results?.vacancies.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1>Поиск вакансий</h1>
        <p className="mt-1 text-[15px] text-muted">
          Только Республика Беларусь: Telegram, RemoteOK и WWR — AI сопоставит
          каждую вакансию с вашим профилем
        </p>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Input
              label="Кого ищете"
              placeholder="Например: Frontend Developer"
              value={profile.role}
              onChange={(event) => updateProfile({ role: event.target.value })}
              error={roleError ?? undefined}
            />
          </div>
          <TagInput
            label="Навыки"
            placeholder="React, TypeScript — Enter или запятая"
            tags={profile.skills}
            onChange={(skills) => updateProfile({ skills })}
          />
          <TagInput
            label="Локации"
            placeholder="Минск, Гомель, удалённо"
            tags={profile.locations}
            onChange={(locations) => updateProfile({ locations })}
            max={10}
          />
          <div className="lg:col-span-2">
            <p className="mb-1.5 text-[13px] font-medium text-muted">Уровень</p>
            <SegmentedControl
              options={MARKET_LEVELS}
              value={profile.level}
              onChange={(level: MarketLevel) => updateProfile({ level })}
              aria-label="Уровень"
              size="lg"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <Button
            onClick={() => void handleSearch()}
            loading={isLoading}
            icon={<Search className="size-4" strokeWidth={1.75} aria-hidden />}
            size="lg"
          >
            Найти вакансии
          </Button>
          {results && !isLoading && (
            <span className="text-[13px] text-muted">
              Найдено: {results.vacancies.length} из {results.meta.total}
              {results.meta.cached ? ' · из кэша' : ''}
            </span>
          )}
        </div>
        {serverError && (
          <p className="mt-3 text-[13px] text-danger-strong">{serverError}</p>
        )}
      </Card>

      {results && results.meta.errors.length > 0 && (
        <p className="rounded-control bg-warning-soft px-4 py-2.5 text-[13px] text-warning-strong">
          {results.meta.errors.join(', ')} — результаты могут быть неполными.
        </p>
      )}
      {results && results.meta.aiError && (
        <p className="rounded-control bg-warning-soft px-4 py-2.5 text-[13px] text-warning-strong">
          {results.meta.aiError} Вакансии показаны без процентов совпадения.
        </p>
      )}

      {isLoading ? (
        <ResultsSkeleton />
      ) : results && hasResults ? (
        <div className={cn('grid gap-3', 'xl:grid-cols-2')}>
          {results.vacancies.map((vacancy) => (
            <VacancyCard key={vacancy.id} vacancy={vacancy} onOpen={() => setSelected(vacancy)} />
          ))}
        </div>
      ) : results ? (
        <EmptyState
          icon={<Compass className="size-6" aria-hidden />}
          title="Ничего не нашлось"
          description="Поиск идёт только по Беларуси — попробуйте изменить роль или добавить навыки."
        />
      ) : null}

      <VacancyDetailModal
        vacancy={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
