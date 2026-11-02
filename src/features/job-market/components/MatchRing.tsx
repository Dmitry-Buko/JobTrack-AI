import { percentStrokeClass, percentTextClass } from '../lib/source';

/**
 * Компактное кольцо процента совпадения (0–100), как активность в iOS,
 * но меньше и без подписи — размер задан под строку вакансии.
 */
export function MatchRing({ percent, size = 44 }: { percent: number; size?: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, percent / 100));

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Совпадение ${percent}%`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="11"
          className="stroke-black/[0.06] dark:stroke-white/[0.1]"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={`${percentStrokeClass(percent)} transition-[stroke-dashoffset] duration-700 ease-[var(--ease-ios)]`}
        />
      </svg>
      <span className={`tabular absolute text-[13px] font-bold ${percentTextClass(percent)}`}>
        {percent}
      </span>
    </div>
  );
}
