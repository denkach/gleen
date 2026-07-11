'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

type ToastVariant = 'neutral' | 'success' | 'error';

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast(input: ToastInput): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantLabels: Record<ToastVariant, string> = {
  neutral: 'Notice',
  success: 'Success',
  error: 'Error',
};

const variantIcons: Record<ToastVariant, string> = {
  neutral: 'i',
  success: '✓',
  error: '!',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const nextId = useRef(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setToasts((current) => [
      ...current,
      { ...input, id, variant: input.variant ?? 'neutral' },
    ]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider duration={5000} swipeDirection="right">
        {children}
        {toasts.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            className="ui-toast"
            data-variant={item.variant}
            duration={item.duration}
            onOpenChange={(open) => {
              if (!open) removeToast(item.id);
            }}
          >
            <span
              className="ui-toast-state"
              aria-label={variantLabels[item.variant]}
            >
              <span className="ui-toast-icon" aria-hidden="true">
                {variantIcons[item.variant]}
              </span>
              <span>{variantLabels[item.variant]}</span>
            </span>
            <div className="ui-toast-copy">
              <ToastPrimitive.Title className="ui-toast-title">
                {item.title}
              </ToastPrimitive.Title>
              {item.description ? (
                <ToastPrimitive.Description className="ui-toast-description">
                  {item.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            {item.actionLabel && item.onAction ? (
              <ToastPrimitive.Action
                className="ui-toast-action"
                altText={item.actionLabel}
                onClick={item.onAction}
              >
                {item.actionLabel}
              </ToastPrimitive.Action>
            ) : null}
            <ToastPrimitive.Close
              className="ui-toast-close"
              aria-label="Dismiss notification"
            >
              <span aria-hidden="true">×</span>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport
          className="ui-toast-viewport"
          aria-label="Notifications"
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
