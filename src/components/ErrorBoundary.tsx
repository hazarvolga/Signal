import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SIGNAL Application Crash caught by ErrorBoundary:", error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-ink flex items-center justify-center p-6 font-sans">
          <div
            role="alert"
            aria-live="assertive"
            className="max-w-md w-full bg-surface border border-burgundy/30 p-8 shadow-2xl space-y-6 text-center"
          >
            <div className="w-16 h-16 bg-burgundy/10 text-burgundy rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold">SIGNAL Runtime Alert</h1>
              <p className="text-xs text-ink/60 leading-relaxed">
                An unexpected component error occurred. The application has safely halted to protect
                your state.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-bg border border-border-hairline p-4 text-left overflow-x-auto max-h-32">
                <p className="font-mono text-[10px] text-burgundy font-bold">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={this.handleReload}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest"
              >
                <RefreshCw size={14} /> Reload System
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
