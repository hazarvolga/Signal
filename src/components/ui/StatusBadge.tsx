import { useLanguage } from "../../contexts/LanguageContext";

interface StatusBadgeProps {
  status: string;
  variant?: "campaign" | "default";
}

const statusStyles: Record<string, string> = {
  SENT: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  DRAFT: "bg-ink/5 text-ink/40 border-ink/10",
  SCHEDULED:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  ACTIVE:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
  PAUSED: "bg-ink/5 text-ink/40 border-ink/10",
  COMPLETED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  CONNECTED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  DISCONNECTED: "bg-ink/5 text-ink/40 border-ink/10",
  APPROVED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  PENDING:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  REJECTED:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  ERROR:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
};

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  const { t } = useLanguage();
  const style = statusStyles[status?.toUpperCase()] || "bg-ink/5 text-ink/40 border-ink/10";
  const translatedStatus =
    t(`status.${status?.toLowerCase()}`) !== `status.${status?.toLowerCase()}`
      ? t(`status.${status?.toLowerCase()}`)
      : status;

  return (
    <span className={`px-2 py-1 text-[9px] font-black uppercase border ${style}`}>
      {translatedStatus}
    </span>
  );
}
