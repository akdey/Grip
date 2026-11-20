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
      className="fixed top-3 sm:top-5 inset-x-0 z-[9999] pointer-events-none flex flex-col items-center gap-2 px-4 pt-[env(safe-area-inset-top,0px)]"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface/95 border border-border-default shadow-2xl backdrop-blur-2xl max-w-sm w-full select-none cursor-pointer"
              onClick={() => removeToast(t.id)}
            >
              <div className={`p-1.5 rounded-xl shrink-0 flex items-center justify-center ${badgeClasses[t.type]} ${iconColors[t.type]}`}>
                <Icon size={16} />
              </div>
              <p className="text-xs font-semibold text-text-primary flex-1 leading-snug">
                {t.message}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
