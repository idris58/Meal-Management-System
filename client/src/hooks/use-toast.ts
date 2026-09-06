// Re-export Sonner's toast for backwards-compatibility and consolidation
import { toast as sonnerToast } from "sonner";

export const toast = sonnerToast;

export function useToast() {
  return {
    toast: sonnerToast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
    toasts: [],
  };
}
