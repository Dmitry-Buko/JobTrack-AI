import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { SKILL_LEVELS, SKILL_LEVEL_LABELS, type ProfileSkill, type SkillLevel } from '@/types/profile';

import { useAddSkillMutation, useDeleteSkillMutation, useUpdateSkillMutation } from '../api/profileApi';
import { STARTER_SKILLS } from '../lib/constants';

interface DraftSkill {
  name: string;
  level: SkillLevel;
}

export function SkillsEditor({ skills }: { skills: ProfileSkill[] }) {
  const toast = useToast();
  const [addSkill, { isLoading: isAdding }] = useAddSkillMutation();
  const [updateSkill] = useUpdateSkillMutation();
  const [deleteSkill, { isLoading: isDeleting }] = useDeleteSkillMutation();
  const [draft, setDraft] = useState<DraftSkill>({ name: '', level: 3 });
  const [draftError, setDraftError] = useState<string | null>(null);

  const existingNames = new Set(skills.map((skill) => skill.name.trim().toLowerCase()));
  const missingStarters = STARTER_SKILLS.filter(
    (name) => !existingNames.has(name.toLowerCase()),
  );

  const handleAdd = async () => {
    const name = draft.name.trim();
    if (!name) {
      setDraftError('Укажите название технологии');
      return;
    }
    if (existingNames.has(name.toLowerCase())) {
      setDraftError('Такой навык уже добавлен');
      return;
    }
    setDraftError(null);
    try {
      await addSkill({ name, self_assessed_level: draft.level, notes: null }).unwrap();
      setDraft({ name: '', level: 3 });
      toast.success('Навык добавлен');
    } catch {
      toast.error('Не удалось добавить навык');
    }
  };

  const handleAddStarters = async () => {
    try {
      await Promise.all(
        missingStarters.map((name) =>
          addSkill({ name, self_assessed_level: 3, notes: null }).unwrap(),
        ),
      );
      toast.success('Базовые технологии добавлены');
    } catch {
      toast.error('Не удалось добавить технологии');
    }
  };

  const handleLevelChange = (skill: ProfileSkill, level: SkillLevel) => {
    void updateSkill({ id: skill.id, changes: { self_assessed_level: level } }).unwrap().catch(() => {
      toast.error('Не удалось сохранить уровень');
    });
  };

  const handleNameBlur = (skill: ProfileSkill, name: string) => {
    const trimmed = name.trim();
    if (trimmed === skill.name || trimmed === '') return;
    void updateSkill({ id: skill.id, changes: { name: trimmed } }).unwrap().catch(() => {
      toast.error('Не удалось переименовать навык');
    });
  };

  const handleDelete = (skill: ProfileSkill) => {
    void deleteSkill(skill.id)
      .unwrap()
      .then(() => toast.success('Навык удалён'))
      .catch(() => toast.error('Не удалось удалить навык'));
  };

  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
        Уровень владения — это самооценка, а не подтверждённый результат проверки. Профиль навыков
        используется для AI-анализа вакансий и персонализации тренировок.
      </p>

      {skills.length === 0 ? (
        <p className="text-sm text-muted">
          Навыки пока не добавлены. Начните с базового списка технологий для frontend-разработчика.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {skills.map((skill) => (
            <li key={skill.id} className="flex flex-wrap items-center gap-3 py-3">
              <Input
                aria-label={`Название навыка: ${skill.name}`}
                defaultValue={skill.name}
                className="min-w-40 flex-1"
                onBlur={(event) => handleNameBlur(skill, event.target.value)}
              />
              <Select
                aria-label={`Уровень владения: ${skill.name}`}
                value={skill.self_assessed_level}
                onChange={(event) => handleLevelChange(skill, Number(event.target.value) as SkillLevel)}
                className="w-40"
              >
                {SKILL_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level} — {SKILL_LEVEL_LABELS[level]}
                  </option>
                ))}
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-soft"
                aria-label={`Удалить навык ${skill.name}`}
                disabled={isDeleting}
                onClick={() => handleDelete(skill)}
                icon={<Trash2 className="size-4" aria-hidden />}
              >
                <span className="sr-only">Удалить</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Новый навык"
            placeholder="Например, Vite"
            value={draft.name}
            error={draftError ?? undefined}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleAdd();
              }
            }}
          />
        </div>
        <Select
          label="Уровень"
          value={draft.level}
          onChange={(event) =>
            setDraft((current) => ({ ...current, level: Number(event.target.value) as SkillLevel }))
          }
          className="sm:w-44"
        >
          {SKILL_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level} — {SKILL_LEVEL_LABELS[level]}
            </option>
          ))}
        </Select>
        <Button onClick={() => void handleAdd()} loading={isAdding} icon={<Plus className="size-4" aria-hidden />}>
          Добавить
        </Button>
      </div>

      {missingStarters.length > 0 && (
        <Button variant="secondary" size="sm" onClick={() => void handleAddStarters()}>
          Добавить базовые технологии ({missingStarters.length})
        </Button>
      )}
    </div>
  );
}
