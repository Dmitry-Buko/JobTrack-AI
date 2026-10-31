/** Кольцевой индикатор балла, как кольца в приложении «Активность». */
export function ScoreRing({ score, size = 104 }: { score: number | null; size?: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = score != null ? Math.max(0, Math.min(1, score / 5)) : 0;
  const strokeClass =
    score == null ? 'stroke-muted' : score >= 4 ? 'stroke-success' : score >= 3 ? 'stroke-warning' : 'stroke-danger';

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={score != null ? `Средний балл ${score} из 5` : 'Оценки пока нет'}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          className="stroke-black/[0.06] dark:stroke-white/[0.1]"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={`${strokeClass} transition-[stroke-dashoffset] duration-700 ease-[var(--ease-ios)]`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score != null ? (
          <>
            <span className="tabular text-[28px] leading-none font-bold tracking-[-0.02em] text-text">
              {score}
            </span>
            <span className="text-[12px] text-muted">из 5</span>
          </>
        ) : (
          <span className="text-[15px] font-medium text-muted">—</span>
        )}
      </div>
    </div>
  );
}
