import { CheckCircle, WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react';
import type { ToastItem } from '../types';

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onUndo: (bookingId: string) => void;
}

export default function ToastStack({ toasts, onDismiss, onUndo }: Props) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-line)',
            color: 'var(--color-ink)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
          }}
          role="status"
        >
          {toast.tone === 'success'
            ? <CheckCircle size={18} style={{ color: 'var(--color-accent)' }} />
            : <WarningCircle size={18} style={{ color: 'var(--color-danger)' }} />}
          <span className="flex-1">{toast.message}</span>
          {toast.undoId && (
            <button
              type="button"
              className="btn btn-quiet !px-2 !py-1 text-xs"
              onClick={() => onUndo(toast.undoId!)}
            >
              <ArrowCounterClockwise size={13} /> Undo
            </button>
          )}
          <button type="button" className="text-xs" style={{ color: 'var(--color-muted)' }} onClick={() => onDismiss(toast.id)}>
            Tutup
          </button>
        </div>
      ))}
    </div>
  );
}
