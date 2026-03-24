// Module-level confirmation dialog — no React context needed.
// Usage: const ok = await dialog.confirm("Delete this?"); if (!ok) return;

export type DialogState = {
  id: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (value: boolean) => void;
};

type Listener = (state: DialogState | null) => void;

let current: DialogState | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l(current));
}

export const dialog = {
  confirm(message: string, options?: { confirmLabel?: string; danger?: boolean }): Promise<boolean> {
    return new Promise((resolve) => {
      current = { id: `${Date.now()}`, message, ...options, resolve };
      notify();
    });
  },
  _resolve(value: boolean) {
    current?.resolve(value);
    current = null;
    notify();
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};
