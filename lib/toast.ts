// Lightweight module-level toast system — no React context needed.
// Import `toast` anywhere and call toast.success / toast.error / toast.info.

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export const toast = {
  success(message: string) { add(message, "success"); },
  error(message: string)   { add(message, "error"); },
  info(message: string)    { add(message, "info"); },
  subscribe(fn: Listener)  { listeners.add(fn); return () => { listeners.delete(fn); }; },
};

function add(message: string, type: ToastType) {
  const id = `${Date.now()}-${Math.random()}`;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, type === "error" ? 5000 : 3000);
}
