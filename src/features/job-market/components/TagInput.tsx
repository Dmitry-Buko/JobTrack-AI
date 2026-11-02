import { X } from 'lucide-react';
import { useRef, useState } from 'react';

import { parseListInput } from '../lib/profile';

/**
 * Ввод списка коротких значений чипами: Enter, запятая или потеря фокуса
 * фиксируют значение; Backspace на пустом поле удаляет последний чип.
 */
export function TagInput({
  label,
  placeholder,
  tags,
  onChange,
  max = 30,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}) {
  const [buffer, setBuffer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const parts = parseListInput(buffer).filter((part) => !tags.includes(part));
    if (parts.length === 0) {
      setBuffer('');
      return;
    }
    onChange([...tags, ...parts].slice(0, max));
    setBuffer('');
  };

  const remove = (tag: string) => onChange(tags.filter((item) => item !== tag));

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-muted">{label}</label>
      <div
        className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-control bg-surface-muted px-3 py-2"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-[3px] text-xs font-medium text-accent"
          >
            {tag}
            <button
              type="button"
              aria-label={`Убрать ${tag}`}
              onClick={(event) => {
                event.stopPropagation();
                remove(tag);
              }}
              className="-mr-0.5 flex size-4 items-center justify-center rounded-full transition active:scale-90 hover:bg-black/10"
            >
              <X className="size-3" strokeWidth={2} aria-hidden />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={buffer}
          onChange={(event) => setBuffer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              commit();
            } else if (event.key === 'Backspace' && buffer === '' && tags.length > 0) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={commit}
          disabled={tags.length >= max}
          placeholder={tags.length === 0 ? placeholder : ''}
          aria-label={label}
          className="min-w-[80px] flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-muted"
        />
      </div>
    </div>
  );
}
