import React from "react";
import { Link } from "react-router";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";
import { cn } from "../../lib/utils";

interface IntegrationLayoutProps {
  title: string;
  subtitle: string;
  providerType: string;
  status: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isSaving?: boolean;
  isTesting?: boolean;
  onSave?: () => void;
  onTest?: () => void;
  onDisconnect?: () => void;
  testResult?: { success: boolean; message?: string; error?: string } | null;
  saveMessage?: string | null;
}

export const IntegrationLayout: React.FC<IntegrationLayoutProps> = ({
  title,
  subtitle,
  providerType,
  status,
  icon,
  children,
  isSaving,
  isTesting,
  onSave,
  onTest,
  onDisconnect,
  testResult,
  saveMessage,
}) => {
  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between border-b border-border-hairline pb-4">
        <Link
          to="/integrations"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-ink/60 hover:text-burgundy transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Integrations Hub
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-ink/40 uppercase">Provider Status:</span>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-surface border border-border-hairline p-8">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-bg border border-border-hairline flex items-center justify-center text-ink shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink">{title}</h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-ink/5 border border-border-hairline text-ink/60">
                {providerType}
              </span>
            </div>
            <p className="text-sm font-editorial italic text-ink/60 max-w-xl">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onTest && (
            <button
              onClick={onTest}
              disabled={isTesting}
              className={cn(
                "btn-secondary py-2.5 px-4 text-[10px] inline-flex items-center gap-2 font-mono uppercase tracking-widest",
                isTesting && "opacity-50 cursor-wait"
              )}
            >
              <RefreshCw size={12} className={cn(isTesting && "animate-spin")} />
              {isTesting ? "Testing..." : "Test Connection"}
            </button>
          )}

          {status === "CONNECTED" && onDisconnect && (
            <button
              onClick={onDisconnect}
              className="py-2.5 px-4 text-[10px] font-mono uppercase tracking-widest border border-border-hairline text-ink/40 hover:text-rose-600 hover:border-rose-300 transition-colors"
            >
              Disconnect
            </button>
          )}

          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className={cn(
                "btn-primary py-2.5 px-6 text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2",
                isSaving && "opacity-50 cursor-wait"
              )}
            >
              <ShieldCheck size={12} />
              {isSaving ? "Saving..." : "Save Credentials"}
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alerts */}
      {saveMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {testResult && (
        <div
          className={cn(
            "p-4 border text-xs font-mono flex items-center gap-3",
            testResult.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}
        >
          {testResult.success ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{testResult.success ? testResult.message : testResult.error}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div>{children}</div>
    </div>
  );
};
