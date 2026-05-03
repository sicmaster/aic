'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

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
  danger: 'bg-red-500/10 text-red-400',
  success: 'bg-emerald-500/10 text-emerald-400',
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
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && onCancel && !pending) {
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex gap-3">
            <div
              className={[
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                toneClassName[tone],
              ].join(' ')}
            >
              <Icon size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle>{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mt-2 leading-6">{description}</DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          {onCancel ? (
            <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={tone === 'danger' ? 'destructive' : 'default'}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Please wait' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
