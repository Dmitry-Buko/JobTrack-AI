import { useCallback, useEffect, useRef, useState } from 'react';

import { useCreateRealtimeSessionMutation } from '@/features/ai/api/aiApi';
import type { RealtimeSessionArgs } from '@/features/ai/api/aiApi';

export type RealtimeStatus = 'idle' | 'connecting' | 'listening' | 'ai_speaking' | 'error';

export interface TranscriptLine {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

interface RealtimeEvent {
  type: string;
  transcript?: string;
  item_id?: string;
  error?: { message?: string };
}

const PC_CONNECTION_URL = 'https://api.openai.com/v1/realtime';

function lineId(event: RealtimeEvent): string {
  if (event.item_id) return event.item_id;
  return `line-${Math.random().toString(36).slice(2)}`;
}

/**
 * Жизненный цикл голосовой сессии OpenAI Realtime API (WebRTC):
 * ephemeral-токен → SDP offer/answer → двунаправленный аудиопоток.
 * Ресурсы микрофона и соединение освобождаются в stop() и при размонтировании.
 */
export function useRealtimeSession(args: RealtimeSessionArgs) {
  const [createSession] = useCreateRealtimeSessionMutation();

  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [muted, setMuted] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stoppingRef = useRef(false);

  const pushLine = useCallback((line: TranscriptLine) => {
    setTranscript((current) => {
      if (current.some((item) => item.id === line.id)) return current;
      return [...current, line];
    });
  }, []);

  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      switch (event.type) {
        case 'conversation.item.input_audio_transcription.completed':
          if (event.transcript) {
            pushLine({ id: lineId(event), role: 'user', text: event.transcript });
          }
          break;
        case 'response.audio_transcript.done':
          if (event.transcript) {
            pushLine({ id: lineId(event), role: 'assistant', text: event.transcript });
          }
          setStatus((current) => (current === 'error' ? current : 'listening'));
          break;
        case 'response.audio.delta':
          setStatus((current) => (current === 'error' ? current : 'ai_speaking'));
          break;
        case 'response.done':
          setStatus((current) => (current === 'error' ? current : 'listening'));
          break;
        case 'input_audio_buffer.speech_started':
          // Пользователь начал говорить (возможность «перебить» ИИ).
          setStatus((current) => (current === 'error' ? current : 'listening'));
          break;
        case 'error':
          setError(event.error?.message ?? 'Realtime API сообщил об ошибке.');
          setStatus('error');
          break;
        default:
          break;
      }
    },
    [pushLine],
  );

  const releaseResources = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    releaseResources();
    setStatus('idle');
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

      // 3. Аудио-элемент для голоса интервьюера.
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', '');
      document.body.appendChild(audio);
      audioRef.current = audio;

      // 4. WebRTC-соединение и обмен SDP с ephemeral-токеном.
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        void audio.play().catch(() => {
          /* автозапуск может быть отклонён до первого пользовательского жеста */
        });
      };

      pc.onconnectionstatechange = () => {
        if (stoppingRef.current) return;
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Голосовое соединение прервано. Нажмите «Повторить подключение».');
          setStatus('error');
        }
      };

      const dataChannel = pc.createDataChannel('oai-events');
      dcRef.current = dataChannel;
      dataChannel.onmessage = (event) => {
        try {
          handleEvent(JSON.parse(event.data as string) as RealtimeEvent);
        } catch {
          /* игнорируем некорректные события сервера */
        }
      };

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(`${PC_CONNECTION_URL}?model=${encodeURIComponent(sessionInfo.model)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          Authorization: `Bearer ${sessionInfo.token}`,
        },
        body: offer.sdp ?? '',
      });

      if (!sdpResponse.ok) {
        const details = await sdpResponse.text().catch(() => '');
        if (sdpResponse.status === 401 || sdpResponse.status === 403) {
          throw new Error('Срок действия голосового токена истёк. Нажмите «Повторить подключение».');
        }
        throw new Error(
          `Realtime API отклонил подключение (код ${sdpResponse.status}). ${details.slice(0, 160)}`,
        );
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      if (!stoppingRef.current) setStatus('listening');
    } catch (startError) {
      releaseResources();
      setStatus('error');
      setError(
        startError instanceof Error && startError.message
          ? startError.message
          : 'Не удалось начать голосовую сессию. Попробуйте ещё раз.',
      );
    }
  }, [args, createSession, handleEvent, releaseResources]);

  const toggleMute = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  }, []);

  // Освобождаем микрофон и соединение при размонтировании.
  useEffect(() => stop, [stop]);

  const currentQuestion = [...transcript].reverse().find((line) => line.role === 'assistant') ?? null;

  return { status, error, transcript, muted, currentQuestion, start, stop, toggleMute };
}
