'use client';

import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

type FeedbackTone = 'success' | 'danger';

type FeedbackDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description?: string | undefined;
  onCancel?: () => void;
  onConfirm: () => void;
  open: boolean;
  pending?: boolean;
  title: string;
  tone: FeedbackTone;
};

const toneClassName: Record<FeedbackTone, string> = {
  danger: 'bg-red-50 text-red-600',
  success: 'bg-emerald-50 text-emerald-600',
};

const buttonClassName: Record<FeedbackTone, string> = {
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-primary text-white hover:bg-primary/90',
};

export function FeedbackDialog({
  cancelLabel = 'Cancel',
  confirmLabel = 'OK',
  description,
  onCancel,
  onConfirm,
  open,
  pending = false,
  title,
  tone,
}: FeedbackDialogProps) {
  if (!open) {
    return null;
  }

  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6">
      <section
        className="w-full max-w-md rounded-md border border-border bg-panel shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex gap-3">
            <div
              className={[
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                toneClassName[tone],
              ].join(' ')}
            >
              <Icon size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="feedback-dialog-title" className="text-base font-semibold text-ink">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
              ) : null}
            </div>
          </div>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="h-10 rounded-md border border-border px-4 text-sm font-medium text-muted transition hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={[
              'h-10 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70',
              buttonClassName[tone],
            ].join(' ')}
          >
            {pending ? 'Please wait' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
