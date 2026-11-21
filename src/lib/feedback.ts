export type FeedbackKind = 'success' | 'error' | 'info';

export interface ToastOptions {
  message: string;
  kind?: FeedbackKind;
}

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function notifyToast(options: ToastOptions): void {
  window.dispatchEvent(new CustomEvent<ToastOptions>('streamflow:toast', { detail: options }));
}

export function requestConfirmation(options: ConfirmationOptions): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('streamflow:confirm', {
      detail: { ...options, resolve },
    }));
  });
}
