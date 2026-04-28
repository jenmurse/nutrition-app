// Lightweight module-level toast system — no React context needed.
// Import `toast` anywhere and call toast.success / toast.error / toast.info.

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  undo?: () => void;
  duration?: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  undo?: () => void;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export const toast = {
  success(message: string, opts?: ToastOptions) { add(message, "success", opts); },
  error(message: string, opts?: ToastOptions)   { add(message, "error", opts); },
  info(message: string, opts?: ToastOptions)    { add(message, "info", opts); },
  subscribe(fn: Listener) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};

function add(message: string, type: ToastType, opts?: ToastOptions) {
  const id = `${Date.now()}-${Math.random()}`;
  toasts = [...toasts, { id, message, type, undo: opts?.undo }];
  notify();
  const duration = opts?.duration ?? 4000;
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, duration);
}
