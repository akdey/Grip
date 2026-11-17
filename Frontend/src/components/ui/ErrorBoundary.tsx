import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Logo } from './Logo';
import { RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import { OfflineGame } from './OfflineGame';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isOfflineError: boolean;
}

function isNetworkOrChunkError(error: Error | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  return (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    msg.includes('dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('networkerror') ||
    name.includes('chunkloaderror')
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isOfflineError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const isOffline = isNetworkOrChunkError(error);
    return {
      hasError: true,
      error,
      isOfflineError: isOffline,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardReset = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // If the error occurred because the device is offline or chunks failed to download:
      // Gracefully render the full Grip Offline Experience instead of a blank white screen!
      if (this.state.isOfflineError || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        return <OfflineGame />;
      }

      // General JavaScript render crash fallback
      return (
        <div className="min-h-screen bg-[#07080c] text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
            <Logo size={32} />
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <AlertTriangle size={13} />
            <span>Application Paused</span>
          </div>

          <h1 className="text-xl font-black tracking-tight text-white heading-apple">
            Something went wrong
          </h1>
          <p className="text-xs text-text-muted mt-1 max-w-sm leading-relaxed">
            Grip encountered an unexpected issue while rendering this view. You can reload to resume.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-4 rounded-xl bg-white text-black font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={13} />
              <span>Reload Application</span>
            </button>

            <button
              onClick={this.handleHardReset}
              className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={12} />
              <span>Clear Cache & Reset</span>
            </button>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-left max-w-md w-full overflow-x-auto text-[11px] font-mono text-red-300">
              <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
