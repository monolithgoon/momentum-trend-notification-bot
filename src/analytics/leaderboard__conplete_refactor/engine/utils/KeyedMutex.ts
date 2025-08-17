/** KeyedMutex — per-key async critical section */
export class KeyedMutex {
  private locks = new Map<string, Promise<void>>();
  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>(res => (release = res));
    this.locks.set(key, prev.then(() => gate));
    try {
      await prev;
      return await fn();
    } finally {
      release();
      if (this.locks.get(key) === gate) this.locks.delete(key);
    }
  }
}
