/**
 * Утилиты кодирования аудио для Gemini Live API.
 * Чистые функции без React — покрыты юнит-тестами (audio.test.ts).
 */

/** ArrayBuffer (PCM16 из AudioWorklet) → base64 для sendRealtimeInput. */
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Base64 PCM16 (24 кГц, ответ модели) → Float32 для AudioBuffer. */
export function base64PcmToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const pcm = new Int16Array(bytes.buffer);
  const floats = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i += 1) floats[i] = pcm[i] / 32768;
  return floats;
}
