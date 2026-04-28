// Module-level confirmation dialog — no React context needed.
// Usage: const ok = await dialog.confirm({ title: "Delete?", body: "This can't be undone." });

export type DialogState = {
  id: string;
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (value: boolean) => void;
};

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
};

type Listener = (state: DialogState | null) => void;

let current: DialogState | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l(current));
}

export const dialog = {
  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      current = { id: `${Date.now()}`, ...options, resolve };
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
