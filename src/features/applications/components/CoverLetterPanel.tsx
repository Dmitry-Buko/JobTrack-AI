import { Copy, Mail, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { useGenerateCoverLetterMutation } from '@/features/ai/api/aiApi';
import { useGetProfileQuery, useGetSkillsQuery } from '@/features/profile/api/profileApi';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type { Application } from '@/types/application';

/**
 * Панель «AI-сопроводительное письмо»: по клику на кнопку генерирует
 * письмо под вакансию из профиля и навыков, результат показывается
 * в модалке с копированием и перегенерацией.
 */
export function CoverLetterPanel({ application }: { application: Application }) {
  const toast = useToast();
  const { data: profile } = useGetProfileQuery();
  const { data: skills = [] } = useGetSkillsQuery();
  const [generateCoverLetter, { isLoading: isGenerating }] = useGenerateCoverLetterMutation();

  const [letter, setLetter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setError(null);
    try {
      const result = await generateCoverLetter({
        company: application.company,
        position: application.position,
        description: application.description ?? undefined,
        targetRole: profile?.target_role ?? null,
        experienceLevel: profile?.experience_level ?? null,
        experienceSummary: profile?.experience_summary ?? null,
        skills: skills.map((skill) => ({ name: skill.name, level: skill.self_assessed_level })),
      }).unwrap();
      setLetter(result);
      setModalOpen(true);
    } catch (generateError) {
      setError(
        typeof generateError === 'object' && generateError !== null && 'message' in generateError
          ? String((generateError as { message: string }).message)
          : 'AI-сервис недоступен. Попробуйте позже.',
      );
    }
  };

  const copyLetter = async () => {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter);
      toast.success('Письмо скопировано в буфер обмена');
    } catch {
      toast.error('Не удалось скопировать. Выделите текст и скопируйте вручную.');
    }
  };

  const hasDescription = Boolean(application.description && application.description.trim());
  const hasProfileData = Boolean(
    (profile?.target_role ?? profile?.experience_summary ?? profile?.experience_level) ||
      skills.length > 0,
  );

  return (
    <Card>
      <CardHeader
        title="AI-сопроводительное письмо"
        description="Письмо под вакансию по вашему профилю и навыкам"
        actions={
          <Button
            size="sm"
            onClick={() => void generate()}
            loading={isGenerating}
            icon={<Mail className="size-4" aria-hidden />}
          >
            Сгенерировать
          </Button>
        }
      />
      <CardContent>
        {error && (
          <p role="alert" className="mb-3 rounded-control bg-danger-soft px-3 py-2 text-[15px] text-danger-strong">
            {error}
          </p>
        )}

        {!hasDescription && (
          <p className="text-sm text-muted">
            Описание вакансии не добавлено — письмо будет опираться только на должность и компанию.
            Добавьте описание для более точного результата.
          </p>
        )}

        {hasDescription && !hasProfileData && (
          <p className="text-sm text-muted">
            Заполните профиль (целевая роль, опыт, навыки) — письмо получится заметно персональнее.
          </p>
        )}

        {hasDescription && hasProfileData && (
          <p className="text-sm text-muted">
            Нажмите «Сгенерировать» — ИИ напишет письмо на языке вакансии и привяжет ваши навыки
            к её требованиям. Результат можно скопировать одним нажатием.
          </p>
        )}
      </CardContent>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Сопроводительное письмо"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => void generate()} disabled={isGenerating}>
              <RefreshCw className="size-4" aria-hidden />
              {isGenerating ? 'Генерируем…' : 'Сгенерировать заново'}
            </Button>
            <Button onClick={() => void copyLetter()} icon={<Copy className="size-4" aria-hidden />}>
              Копировать
            </Button>
          </>
        }
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-text">{letter}</p>
      </Modal>
    </Card>
  );
}
