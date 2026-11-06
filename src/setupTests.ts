import '@testing-library/jest-dom/vitest';

/**
 * Node ≥ 26 объявляет экспериментальный нативный localStorage на globalThis
 * (геттер возвращает undefined без флага --localstorage-file). Из-за этого
 * vitest не копирует localStorage из jsdom-окна в глобал (populateGlobal
 * пропускает уже существующие ключи) — на Node 26 в тестах его просто нет.
 * Подменяем простым Storage в памяти: тестам нужна семантика, а не движок.
 */
class MemoryStorage implements Storage {
  #data = new Map<string, string>();

  get length(): number {
    return this.#data.size;
  }

  key(index: number): string | null {
    return [...this.#data.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.#data.get(String(key)) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#data.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.#data.delete(String(key));
  }

  clear(): void {
    this.#data.clear();
  }
}

// Отдельный тип без lib.dom-объявления localStorage, чтобы delete
// на опциональном свойстве проходил проверку типов.
const storageHost = globalThis as { localStorage?: Storage };

if (storageHost.localStorage === undefined) {
  // Убираем «пустой» нативный геттер Node ≥ 26, чтобы не сработал повторно.
  delete storageHost.localStorage;
  storageHost.localStorage = new MemoryStorage();
}
