import { toast as sonnerToast } from "sonner";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
};

// Minimalist toasts: one short line, auto-dismissing, never stacking up.
export function toast({ title, description, variant, duration }: ToastInput) {
  const message = title ?? description ?? "";
  const id = `${variant === "destructive" ? "err" : "ok"}:${message}`;
  const options = {
    id,
    duration: duration ?? (variant === "destructive" ? 3600 : 2200),
    ...(description && title ? { description } : {}),
  };
  return variant === "destructive"
    ? sonnerToast.error(message, options)
    : sonnerToast.success(message, options);
}

export function useToast() {
  return { toast, dismiss: sonnerToast.dismiss };
}
