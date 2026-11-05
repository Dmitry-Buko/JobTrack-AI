import { describe, expect, it } from 'vitest';

import { base64PcmToFloat32, bufferToBase64 } from './audio';

describe('bufferToBase64', () => {
  it('кодирует пустой буфер в пустую строку', () => {
    expect(bufferToBase64(new ArrayBuffer(0))).toBe('');
  });

  it('кодирует байты в base64 (сравнение с btoa)', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255]);
    expect(bufferToBase64(bytes.buffer)).toBe(btoa(String.fromCharCode(...bytes)));
  });

  it('обрабатывает буферы больше чанка 0x8000 без потерь', () => {
    const bytes = new Uint8Array(0x8000 + 1234);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = i % 256;
    const base64 = bufferToBase64(bytes.buffer);
    const restored = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    expect(restored.length).toBe(bytes.length);
    expect(restored).toEqual(bytes);
  });
});

describe('base64PcmToFloat32', () => {
  it('нормализует PCM16 в диапазон [-1, 1)', () => {
    const pcm = new Int16Array([32767, -32768, 0, 16384]);
    const base64 = bufferToBase64(pcm.buffer);
    const floats = base64PcmToFloat32(base64);
    expect(floats).toBeInstanceOf(Float32Array);
    expect(floats.length).toBe(4);
    expect(floats[0]).toBeCloseTo(32767 / 32768, 7);
    expect(floats[1]).toBe(-1);
    expect(floats[2]).toBe(0);
    expect(floats[3]).toBeCloseTo(0.5, 4);
  });

  it('возвращает пустой массив для пустого чанка', () => {
    expect(base64PcmToFloat32('').length).toBe(0);
  });

  it('симметрична bufferToBase64 (roundtrip PCM16)', () => {
    const pcm = new Int16Array([-2, -1, 0, 1, 2, 300, -300, 12345]);
    const floats = base64PcmToFloat32(bufferToBase64(pcm.buffer));
    const restored = Float32Array.from(floats, (value) => Math.round(value * 32768));
    expect(Int16Array.from(restored)).toEqual(pcm);
  });
});
