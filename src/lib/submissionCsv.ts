export interface SubmissionCsvRow {
  id: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

function safeCell(value: unknown): string {
  const normalized = value == null
    ? ""
    : typeof value === "string"
      ? value
      : JSON.stringify(value);
  const formulaSafe = /^[=+\-@\t\r]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${formulaSafe.replace(/"/g, '""')}"`;
}

export function buildSubmissionCsv(rows: SubmissionCsvRow[]): string {
  const fieldIds = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.payload)))
  ).sort();
  const headers = ["submission_id", "submitted_at", ...fieldIds];
  const lines = [headers.map(safeCell).join(",")];

  for (const row of rows) {
    lines.push(
      [row.id, row.createdAt, ...fieldIds.map((fieldId) => row.payload[fieldId])]
        .map(safeCell)
        .join(",")
    );
  }

  return `\uFEFF${lines.join("\r\n")}`;
}
