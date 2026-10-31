import { useCallback, useEffect, useRef, useState } from 'react';

import type { LiveServerMessage, Session } from '@google/genai';

import { useCreateRealtimeSessionMutation } from '@/features/ai/api/aiApi';
import type { RealtimeSessionArgs } from '@/features/ai/api/aiApi';

export type RealtimeStatus = 'idle' | 'connecting' | 'listening' | 'ai_speaking' | 'error';

export interface TranscriptLine {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const INPUT_MIME_TYPE = `audio/pcm;rate=${INPUT_SAMPLE_RATE}`;

/**
 * AudioWorklet, преобразующий кадры микрофона (Float32) в PCM16 для Live API.
 * Код подключается как Blob URL — отдельный файл-ворклет не нужен.
 */
const PCM_WORKLET_CODE = `
class PcmRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) {
      const pcm = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i += 1) {
        const clamped = Math.max(-1, Math.min(1, channel[i]));
        pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-recorder', PcmRecorder);
`;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Base64 PCM16 (24 кГц, ответ модели) → Float32 для AudioBuffer. */
function base64PcmToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const pcm = new Int16Array(bytes.buffer);
  const floats = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i += 1) floats[i] = pcm[i] / 32768;
  return floats;
}

/**
 * Ответ Gemini Live о недоступном регионе — типично для пользователей
 * из Беларуси/России без системного VPN: браузерные расширения не помогают,
 * нужен VPN в режиме «глобальный/TUN», покрывающий все приложения.
 */
const GEO_BLOCK_MESSAGE =
  'Ваш регион не поддерживается Gemini API. Включите системный VPN (глобальный режим) и попробуйте снова.';

function isGeoBlocked(reason: string | undefined): boolean {
  return !!reason && reason.includes('User location is not supported');
}

/** Жизненный цикл голосовой сессии Gemini Live API (WebSocket):
 * ephemeral-токен от серверной функции → двунаправленный поток PCM.
 * Микрофон кодируется в PCM16/16 кГц через AudioWorklet, ответ модели
 * (PCM16/24 кГц) воспроизводится очередью AudioBufferSourceNode.
 * Ресурсы освобождаются в stop() и при размонтировании.
 */
export function useRealtimeSession(args: RealtimeSessionArgs) {
  const [createSession] = useCreateRealtimeSessionMutation();

  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [muted, setMuted] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletUrlRef = useRef<string | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlayTimeRef = useRef(0);
  const stoppingRef = useRef(false);
  const mutedRef = useRef(false);

  // Учёт реплик для транскрипта: строки дедуплицируются по id реплики.
  const userTurnRef = useRef(-1);
  const assistantTurnRef = useRef(0);
  const userTurnClosedRef = useRef(true);
  const userTextRef = useRef('');
  const assistantTextRef = useRef('');

  const upsertLine = useCallback((line: TranscriptLine) => {
    setTranscript((current) => {
      const index = current.findIndex((item) => item.id === line.id);
      if (index === -1) return [...current, line];
      if (current[index].text === line.text) return current;
      return current.map((item) => (item.id === line.id ? line : item));
    });
  }, []);

  const stopPlayback = useCallback(() => {
    playbackSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        /* источник уже остановлен */
      }
    });
    playbackSourcesRef.current.clear();
    nextPlayTimeRef.current = 0;
  }, []);

  /** Ставит чанк ответа модели в очередь воспроизведения. */
  const playChunk = useCallback((base64: string) => {
    const ctx = playbackCtxRef.current;
    if (!ctx) return;
    const samples = base64PcmToFloat32(base64);
    if (!samples.length) return;

    const buffer = ctx.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.onended = () => playbackSourcesRef.current.delete(source);
    const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
    playbackSourcesRef.current.add(source);
  }, []);

  const handleServerMessage = useCallback(
    (message: LiveServerMessage) => {
      const content = message.serverContent;
      if (!content) return;

      // Пользователь перебил модель — глушим очередь воспроизведения.
      if (content.interrupted) {
        stopPlayback();
        setStatus((current) => (current === 'error' ? current : 'listening'));
      }

      if (content.inputTranscription?.text) {
        if (userTurnClosedRef.current) {
          userTurnRef.current += 1;
          userTurnClosedRef.current = false;
          userTextRef.current = '';
        }
        userTextRef.current += content.inputTranscription.text;
        upsertLine({
          id: `user-${userTurnRef.current}`,
          role: 'user',
          text: userTextRef.current,
        });
      }

      if (content.outputTranscription?.text) {
        assistantTextRef.current += content.outputTranscription.text;
        upsertLine({
          id: `assistant-${assistantTurnRef.current}`,
          role: 'assistant',
          text: assistantTextRef.current,
        });
      }

      if (content.modelTurn?.parts) {
        let hasAudio = false;
        for (const part of content.modelTurn.parts) {
          if (part.inlineData?.data) {
            hasAudio = true;
            playChunk(part.inlineData.data);
          }
        }
        if (hasAudio) {
          setStatus((current) => (current === 'error' ? current : 'ai_speaking'));
        }
      }

      if (content.turnComplete) {
        assistantTurnRef.current += 1;
        assistantTextRef.current = '';
        userTurnClosedRef.current = true;
        setStatus((current) => (current === 'error' ? current : 'listening'));
      }
    },
    [playChunk, stopPlayback, upsertLine],
  );

  const releaseResources = useCallback(() => {
    try {
      sessionRef.current?.close();
    } catch {
      /* сессия уже закрыта */
    }
    sessionRef.current = null;

    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    void inputCtxRef.current?.close().catch(() => {});
    inputCtxRef.current = null;

    if (workletUrlRef.current) {
      URL.revokeObjectURL(workletUrlRef.current);
      workletUrlRef.current = null;
    }

    stopPlayback();
    void playbackCtxRef.current?.close().catch(() => {});
    playbackCtxRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, [stopPlayback]);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    releaseResources();
    setStatus('idle');
    mutedRef.current = false;
    setMuted(false);
  }, [releaseResources]);

  const start = useCallback(async () => {
    stoppingRef.current = false;
    setError(null);
    setStatus('connecting');

    try {
      // 1. Краткосрочный токен от серверной функции (постоянный ключ остаётся в секретах).
      const sessionInfo = await createSession(args).unwrap();

      // 2. Микрофон — строго после действия пользователя.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micError) {
        const name = micError instanceof DOMException ? micError.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          throw new Error(
            'Нет доступа к микрофону. Разрешите доступ в настройках браузера и попробуйте снова.',
          );
        }
        if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          throw new Error('Микрофон не найден. Подключите микрофон или выберите текстовый режим.');
        }
        throw new Error('Не удалось получить доступ к микрофону.');
      }
      streamRef.current = stream;

      // 3. Захват микрофона: AudioContext 16 кГц + AudioWorklet → PCM16 → base64.
      const inputCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      inputCtxRef.current = inputCtx;
      const workletUrl = URL.createObjectURL(
        new Blob([PCM_WORKLET_CODE], { type: 'application/javascript' }),
      );
      workletUrlRef.current = workletUrl;
      await inputCtx.audioWorklet.addModule(workletUrl);

      // 4. Контекст воспроизведения ответов модели (PCM16, 24 кГц).
      const playbackCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      playbackCtxRef.current = playbackCtx;
      void playbackCtx.resume().catch(() => {
        /* автозапуск может быть отклонён до первого пользовательского жеста */
      });

      // 5. WebSocket-сессия Live API с ephemeral-токеном вместо постоянного ключа.
      // SDK тяжёлый (~440 кБ), поэтому грузится динамически — только при старте голоса.
      // Ephemeral-токены работают только в v1alpha (требование @google/genai).
      const { GoogleGenAI, Modality } = await import('@google/genai');
      const ai = new GoogleGenAI({
        apiKey: sessionInfo.token,
        httpOptions: { apiVersion: 'v1alpha' },
      });
      const session = await ai.live.connect({
        model: sessionInfo.model,
        // Инструкции, транскрипция и пр. уже запечены в токен на сервере (realtime-session).
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onmessage: (message) => handleServerMessage(message),
          onerror: (event) => {
            if (stoppingRef.current) return;
            setError(
              isGeoBlocked(event?.message)
                ? GEO_BLOCK_MESSAGE
                : event.message || 'Голосовой сервис сообщил об ошибке.',
            );
            setStatus('error');
          },
          onclose: (event) => {
            if (stoppingRef.current) return;
            setError(
              isGeoBlocked(event?.reason)
                ? GEO_BLOCK_MESSAGE
                : 'Голосовое соединение прервано. Нажмите «Повторить подключение».',
            );
            setStatus('error');
          },
        },
      });
      sessionRef.current = session;

      // 6. Оборудуем конвейер отправки аудио после успешного подключения.
      const source = inputCtx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(inputCtx, 'pcm-recorder');
      workletNodeRef.current = workletNode;
      workletNode.port.onmessage = (event) => {
        if (mutedRef.current || !sessionRef.current) return;
        sessionRef.current.sendRealtimeInput({
          audio: { data: bufferToBase64(event.data as ArrayBuffer), mimeType: INPUT_MIME_TYPE },
        });
      };
      source.connect(workletNode);

      if (!stoppingRef.current) setStatus('listening');
    } catch (startError) {
      releaseResources();
      setStatus('error');
      // SDK может rejectsить не-Error объектами — вытаскиваем сообщение как можем.
      const rawMessage =
        startError instanceof Error && startError.message
          ? startError.message
          : typeof startError === 'object' && startError !== null
            ? String((startError as { message?: unknown }).message ?? JSON.stringify(startError)).slice(0, 200)
            : '';
      setError(
        isGeoBlocked(rawMessage)
          ? GEO_BLOCK_MESSAGE
          : rawMessage || 'Не удалось начать голосовую сессию. Попробуйте ещё раз.',
      );
    }
  }, [args, createSession, handleServerMessage, releaseResources]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    // Сбрасываем кэш аудио на сервере, чтобы VAD не ловил «повисшую» паузу.
    if (mutedRef.current) {
      try {
        sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        /* сессия могла уже закрыться */
      }
    }
  }, []);

  // Освобождаем микрофон и соединение при размонтировании.
  useEffect(() => stop, [stop]);

  const currentQuestion = [...transcript].reverse().find((line) => line.role === 'assistant') ?? null;

  return { status, error, transcript, muted, currentQuestion, start, stop, toggleMute };
}
