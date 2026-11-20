import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, type ToastType } from '../../lib/toast';

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconColors: Record<ToastType, string> = {
  success: 'text-status-success',
  error: 'text-status-danger',
  warning: 'text-status-warning',
  info: 'text-text-primary',
};

const badgeClasses: Record<ToastType, string> = {
  success: 'badge-success',
  error: 'badge-danger',
  warning: 'badge-warning',
  info: 'badge-neutral',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[9999] pointer-events-none flex flex-col items-center gap-2 px-4 pt-[max(14px,calc(env(safe-area-inset-top,0px)+10px))]"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.8, bottom: 0.05 }}
              onDragEnd={(_, info) => {
                if (info.offset.y < -15 || info.velocity.y < -200) {
                  removeToast(t.id);
                }
              }}
              initial={{ opacity: 0, y: -28, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-surface/95 border border-border-default/80 shadow-2xl shadow-black/20 backdrop-blur-2xl max-w-[92vw] sm:max-w-md w-fit select-none cursor-grab active:cursor-grabbing"
              onClick={() => removeToast(t.id)}
            >
              <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${badgeClasses[t.type]} ${iconColors[t.type]}`}>
                <Icon size={12} strokeWidth={2.5} />
              </div>
              <p className="text-xs font-semibold text-text-primary leading-tight truncate max-w-[70vw] sm:max-w-xs">
                {t.message}
              </p>
              {(t.type === 'error' || t.type === 'warning') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeToast(t.id);
                  }}
                  className="p-1 -mr-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X size={12} />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
