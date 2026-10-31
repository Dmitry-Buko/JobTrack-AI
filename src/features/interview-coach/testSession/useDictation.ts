import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Диктовка ответа через Web Speech API: без зависимостей и без расхода
 * AI-лимита. Финальные куски распознанного текста возвращаются колбэком
 * (дописываются к ответу), промежуточные — показываются на live-строке.
 */

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
  length: number;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type DictationError = 'not-allowed' | 'no-speech' | 'network' | 'unknown';

export function useDictation(options: {
  /** Язык сессии: ru → ru-RU, en → en-US. */
  language: 'ru' | 'en';
  /** Вызывается с финальным куском текста — дописывается к ответу. */
  onFinalChunk: (chunk: string) => void;
  onError?: (error: DictationError) => void;
}) {
  const { language, onFinalChunk, onError } = options;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinalChunk);
  const onErrorRef = useRef(onError);
  onFinalRef.current = onFinalChunk;
  onErrorRef.current = onError;

  const supported = typeof window !== 'undefined' && getRecognitionCtor() !== null;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recognitionRef.current) return;

    const recognition = new Ctor();
    recognition.lang = language === 'en' ? 'en-US' : 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          const trimmed = transcript.trim();
          if (trimmed) onFinalRef.current(trimmed);
        } else {
          pending += transcript;
        }
      }
      setInterim(pending.trim());
    };

    recognition.onerror = (event) => {
      console.error('[dictation] Ошибка распознавания:', event.error);
      const mapped: DictationError =
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'not-allowed'
          : event.error === 'no-speech'
            ? 'no-speech'
            : event.error === 'network'
              ? 'network'
              : 'unknown';
      onErrorRef.current?.(mapped);
      stop();
    };

    // Chrome сам останавливает распознавание по паузе — перезапускаем,
    // пока пользователь не нажал кнопку повторно.
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          recognitionRef.current = null;
          setListening(false);
          setInterim('');
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setInterim('');
    } catch (error) {
      console.error('[dictation] Не удалось запустить распознавание:', error);
      recognitionRef.current = null;
      onErrorRef.current?.('unknown');
    }
  }, [language, stop]);

  // Останавливаем распознавание при размонтировании экрана.
  useEffect(() => stop, [stop]);

  return { supported, listening, interim, start, stop };
}
