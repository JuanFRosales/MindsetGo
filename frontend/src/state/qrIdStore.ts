const KEY = "app.qrId";

export const qrIdStore = {
  get(): string | null {
    try {
      const v = localStorage.getItem(KEY);
      return v && v.trim() ? v : null;
    } catch {
      return null;
    }
  },
  set(v: string) {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      // ignore
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
  ensure(): string {
    const existing = this.get();
    if (existing) return existing;
    const id = crypto.randomUUID();
    this.set(id);
    return id;
  },
};
