import { toast as sonnerToast } from "sonner";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function toast({ title, description, variant }: ToastInput) {
  const message = title ?? description ?? "";
  const options = description && title ? { description } : undefined;
  return variant === "destructive"
    ? sonnerToast.error(message, options)
    : sonnerToast.success(message, options);
}

export function useToast() {
  return { toast, dismiss: sonnerToast.dismiss };
}
