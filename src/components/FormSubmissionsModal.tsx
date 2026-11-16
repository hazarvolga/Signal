import React, { useEffect, useMemo, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import type { PublishedForm } from "./FormBuilder";
import { buildSubmissionCsv, type SubmissionCsvRow } from "../lib/submissionCsv";

interface SubmissionResponse {
  data: SubmissionCsvRow[];
  total: number;
}

interface FormSubmissionsModalProps {
  form: PublishedForm;
  onClose: () => void;
}

function displayValue(value: unknown): string {
  if (value == null) return "-";
  return typeof value === "string" ? value : JSON.stringify(value);
}

export default function FormSubmissionsModal({ form, onClose }: FormSubmissionsModalProps) {
  const [response, setResponse] = useState<SubmissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/forms/${encodeURIComponent(form.id)}/submissions`, { signal: controller.signal })
      .then(async (result) => {
        if (!result.ok) throw new Error("Unable to load submissions.");
        return result.json();
      })
      .then(setResponse)
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load submissions.");
      });
    return () => controller.abort();
  }, [form.id]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const fields = useMemo(
    () => Array.from(new Set((response?.data || []).flatMap((item) => Object.keys(item.payload)))).sort(),
    [response]
  );

  const handleExport = () => {
    if (!response?.data.length) return;
    const blob = new Blob([buildSubmissionCsv(response.data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${form.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "form"}-submissions.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 sm:p-8">
      <section role="dialog" aria-modal="true" aria-labelledby="submissions-title" className="flex max-h-full w-full max-w-6xl flex-col border border-border-hairline bg-bg shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border-hairline p-5">
          <div>
            <h2 id="submissions-title" className="text-xl font-bold text-ink">{form.name} submissions</h2>
            <p className="mt-1 text-sm text-ink/60">{response ? `${response.total} total responses` : "Loading responses..."}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleExport} disabled={!response?.data.length} className="flex items-center gap-2 bg-burgundy px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              <Download size={16} aria-hidden="true" /> Export CSV
            </button>
            <button type="button" onClick={onClose} aria-label="Close submissions" className="p-2 text-ink/60 hover:bg-surface hover:text-ink">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="overflow-auto p-5">
          {!response && !error && <Loader2 className="mx-auto my-12 animate-spin text-ink" aria-label="Loading submissions" />}
          {error && <p role="alert" className="border border-red-700/30 bg-red-50 p-4 text-sm font-bold text-red-900">{error}</p>}
          {response?.data.length === 0 && <p className="border border-border-hairline bg-surface p-8 text-center text-sm text-ink/60">No submissions received yet.</p>}
          {response && response.data.length > 0 && (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-hairline text-xs uppercase tracking-wider text-ink/60">
                  <th scope="col" className="px-3 py-3">Submitted</th>
                  {fields.map((field) => <th scope="col" key={field} className="px-3 py-3">{field}</th>)}
                </tr>
              </thead>
              <tbody>
                {response.data.map((submission) => (
                  <tr key={submission.id} className="border-b border-border-hairline align-top">
                    <td className="whitespace-nowrap px-3 py-4 text-ink/70">{new Date(submission.createdAt).toLocaleString()}</td>
                    {fields.map((field) => <td key={field} className="max-w-sm break-words px-3 py-4 text-ink">{displayValue(submission.payload[field])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
