import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Lock,
  ShieldCheck,
  Mail,
  CheckCircle2,
  Download,
  ExternalLink,
} from "lucide-react";
import { useParams } from "react-router";
import { apiFetch } from "../services/api";
import { cn } from "../lib/utils";

interface PublicFormElement {
  id: string;
  type: "text" | "input" | "button" | "image" | "spacer" | "embedded_form";
  content?: string;
  placeholder?: string;
  style?: Record<string, string | number>;
}

interface PublicFormRecord {
  id: string;
  name: string;
  type: "popup" | "landing_page";
  elements: PublicFormElement[];
  welcomeCampaignId?: string | null;
  leadMagnetUrl?: string | null;
  redirectUrl?: string | null;
}

const ALLOWED_STYLE_KEYS = new Set([
  "alignItems",
  "backgroundColor",
  "border",
  "borderColor",
  "borderRadius",
  "borderStyle",
  "borderWidth",
  "color",
  "display",
  "fontFamily",
  "fontSize",
  "fontStyle",
  "fontWeight",
  "height",
  "justifyContent",
  "lineHeight",
  "margin",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginTop",
  "maxWidth",
  "minHeight",
  "padding",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "textAlign",
  "textDecoration",
  "width",
]);

function safeStyle(style?: Record<string, string | number>): React.CSSProperties {
  if (!style) return {};
  return Object.fromEntries(
    Object.entries(style).filter(
      ([key, value]) =>
        ALLOWED_STYLE_KEYS.has(key) &&
        (typeof value === "number" ||
          (typeof value === "string" && !/url\s*\(|expression\s*\(/i.test(value)))
    )
  ) as React.CSSProperties;
}

export default function PublicForm({ formId }: { formId?: string } = {}) {
  const params = useParams();
  const rawId =
    formId || params.id || window.location.pathname.replace(/^\/f\//, "").replace(/^\//, "") || "";
  const id = rawId.trim();
  const [form, setForm] = useState<PublicFormRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success" | "error">("idle");
  const [submissionResult, setSubmissionResult] = useState<{
    leadMagnetUrl?: string | null;
    redirectUrl?: string | null;
  } | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || submissionStatus === "success") return;

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const website = String(formData.get("website") || "");
    const signalHp = String(formData.get("_signal_hp") || "");
    const values = Object.fromEntries(
      Array.from(formData.entries())
        .filter(
          ([key, value]) =>
            key !== "website" &&
            key !== "_signal_hp" &&
            key !== "kvkk_consent" &&
            typeof value === "string"
        )
        .map(([key, value]) => [key, String(value)])
    );

    setIsSubmitting(true);
    setSubmissionStatus("idle");
    try {
      const response = await apiFetch(`/api/public/forms/${encodeURIComponent(id)}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, website, _signal_hp: signalHp }),
      });
      if (!response.ok) throw new Error("Submission failed");
      const data = await response.json().catch(() => ({}));
      formElement.reset();
      const finalLeadMagnet = data.leadMagnetUrl || form?.leadMagnetUrl || null;
      const finalRedirect = data.redirectUrl || form?.redirectUrl || null;
      setSubmissionResult({
        leadMagnetUrl: finalLeadMagnet,
        redirectUrl: finalRedirect,
      });
      setSubmissionStatus("success");

      if (finalRedirect) {
        setRedirectCountdown(3);
        const timer = setInterval(() => {
          setRedirectCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(timer);
              window.location.href = finalRedirect;
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch {
      setSubmissionStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const storageKey = `signal.form-view.${id}`;
    let viewId = window.sessionStorage.getItem(storageKey);
    if (!viewId) {
      viewId = window.crypto.randomUUID();
      window.sessionStorage.setItem(storageKey, viewId);
    }
    fetch(`/api/public/forms/${encodeURIComponent(id)}`, {
      signal: controller.signal,
      headers: { "x-form-view-id": viewId },
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404 ? "This form is unavailable." : "Unable to load form."
          );
        return response.json();
      })
      .then(setForm)
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "Unable to load form.");
      });
    return () => controller.abort();
  }, [id]);

  if (error) {
    return (
      <main className="fixed inset-0 z-[100] grid place-items-center bg-[#f4f0e8] p-6 text-[#171713]">
        <div
          role="alert"
          className="max-w-md border border-[#171713]/20 bg-white p-8 text-center shadow-xl"
        >
          <AlertCircle className="mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold">Form unavailable</h1>
          <p className="mt-2 text-sm text-[#171713]/70">{error}</p>
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="fixed inset-0 z-[100] grid place-items-center bg-[#f4f0e8] text-[#171713]">
        <Loader2 className="animate-spin" aria-label="Loading form" />
      </main>
    );
  }

  const isLandingPage = form.type === "landing_page";

  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-[#f4f0e8] text-black">
      {/* Corporate Header for Landing Pages */}
      {isLandingPage && (
        <header className="w-full bg-[#f4f0e8]/90 backdrop-blur-xs border-b border-[#d8d3c8] sticky top-0 z-20">
          <div className="max-w-4xl mx-auto py-4 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-[#800020] text-white flex items-center justify-center font-serif font-black text-xs tracking-wider shadow-xs">
                ABC
              </div>
              <div>
                <span className="font-serif font-black tracking-widest text-xs text-[#171713] uppercase block leading-none">
                  ABC COMPANY
                </span>
                <span className="text-[9px] text-[#706e68] font-mono tracking-wider">
                  SIGNAL SECURE HOSTED FORM
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 bg-white/80 border border-neutral-300/80 px-2.5 py-1 rounded-full shadow-2xs">
              <ShieldCheck size={13} className="text-emerald-700" />
              <span className="font-medium text-[11px] text-[#2c2b29]">
                256-Bit SSL Secure Connection
              </span>
            </div>
          </div>
        </header>
      )}

      <div className={cn("px-4 sm:px-8", isLandingPage ? "py-12" : "py-16")}>
        <form
          aria-label={form.name}
          onSubmit={handleSubmit}
          className={
            isLandingPage
              ? "mx-auto min-h-[580px] max-w-2xl bg-white p-8 sm:p-12 shadow-2xl border border-[#d8d3c8]/80 rounded-sm"
              : "mx-auto max-w-md rounded-lg bg-white p-8 sm:p-10 shadow-2xl border border-[#d8d3c8]"
          }
        >
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-px w-px overflow-hidden opacity-0 pointer-events-none"
          />
          <input
            type="text"
            name="_signal_hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute h-px w-px overflow-hidden opacity-0 pointer-events-none"
          />

          {form.elements.map((element, idx) => {
            const style = safeStyle(element.style);
            if (element.type === "text") {
              return (
                <div key={element.id} style={style}>
                  {element.content}
                </div>
              );
            }
            if (element.type === "input") {
              return (
                <input
                  key={element.id}
                  name={element.id}
                  aria-label={element.placeholder || "Form input"}
                  placeholder={element.placeholder}
                  style={style}
                  required
                  disabled={isSubmitting || submissionStatus === "success"}
                />
              );
            }
            if (element.type === "embedded_form") {
              const formTargetId = (element.content || "").trim();
              return (
                <div
                  key={element.id}
                  className="w-full my-6 overflow-hidden rounded-md border border-neutral-200 shadow-sm bg-white"
                  style={style}
                >
                  <iframe
                    src={`/f/${encodeURIComponent(formTargetId)}`}
                    title="Embedded Form"
                    className="w-full min-h-[480px] border-0 block"
                    loading="lazy"
                    sandbox="allow-forms allow-scripts allow-same-origin"
                  />
                </div>
              );
            }
            if (element.type === "image") {
              return (
                <div
                  key={element.id}
                  role="img"
                  aria-label={element.content || "Image placeholder"}
                  style={style}
                />
              );
            }
            if (element.type === "button") {
              return (
                <React.Fragment key={element.id}>
                  {/* KVKK & GDPR Consent Checkbox before submit button - defaultChecked={false} for strict opt-in compliance */}
                  {isLandingPage ? (
                    <div className="my-5 p-3.5 bg-[#faf8f5] border border-[#d8d3c8] rounded-xs text-left">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#2c2b29] leading-relaxed select-none">
                        <input
                          type="checkbox"
                          required
                          defaultChecked={false}
                          name="kvkk_consent"
                          className="mt-0.5 accent-[#800020] shrink-0 cursor-pointer"
                        />
                        <span>
                          I agree to the processing and storage of my data in accordance with the{" "}
                          <a
                            href="/privacy"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#800020] underline font-bold hover:text-[#800020]/80"
                          >
                            Privacy & Compliance Policy
                          </a>{" "}
                          and consent to receive digital communications.
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="mb-3 text-[11px] text-[#666660] text-center">
                      Protected under our{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#800020] underline font-medium"
                      >
                        Privacy & Compliance Policy
                      </a>
                      .
                    </div>
                  )}

                  <button
                    type="submit"
                    style={style}
                    disabled={isSubmitting || submissionStatus === "success"}
                    className="cursor-pointer transition-opacity hover:opacity-95"
                  >
                    {isSubmitting ? "Submitting..." : element.content}
                  </button>
                </React.Fragment>
              );
            }
            return <div key={element.id} aria-hidden="true" style={style} />;
          })}

          {submissionStatus === "success" && (
            <div
              role="status"
              className="mt-8 p-6 bg-emerald-50/90 border border-emerald-300 rounded-md text-center space-y-4 animate-in fade-in duration-300"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-950">
                  Submission Received Successfully!
                </h3>
                <p className="text-xs text-emerald-800 mt-1">
                  Your response has been secured via Signal's encryption infrastructure.
                </p>
              </div>

              {/* Spam & Email Delivery Notice Box */}
              <div className="p-3.5 bg-white border border-emerald-200/80 rounded text-left text-xs text-neutral-800 flex items-start gap-3 shadow-2xs">
                <Mail className="text-emerald-700 shrink-0 mt-0.5" size={16} />
                <div className="leading-relaxed">
                  <span className="font-bold block text-neutral-900 mb-0.5">
                    Please Check Your Email:
                  </span>
                  A confirmation and welcome message has been sent to your address. If you do not
                  see it shortly, please check your <strong>Spam or Promotions</strong> folder.
                </div>
              </div>

              {/* Direct Lead Magnet Download Action */}
              {submissionResult?.leadMagnetUrl && (
                <div className="pt-2">
                  <a
                    href={submissionResult.leadMagnetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#800020] text-white font-bold text-xs uppercase tracking-wider rounded shadow-md hover:bg-[#800020]/90 transition-all cursor-pointer"
                  >
                    <Download size={15} />
                    <span>Download Guide / Resource Now</span>
                  </a>
                </div>
              )}

              {/* Redirect Notice */}
              {redirectCountdown !== null && submissionResult?.redirectUrl && (
                <p className="text-[11px] text-neutral-500 font-mono pt-1">
                  {redirectCountdown > 0
                    ? `Redirecting in ${redirectCountdown} seconds... `
                    : "Redirecting... "}
                  <a
                    href={submissionResult.redirectUrl}
                    className="underline text-[#800020] font-bold"
                  >
                    Click here if not redirected automatically.
                  </a>
                </p>
              )}
            </div>
          )}
          {submissionStatus === "error" && (
            <p
              role="alert"
              className="mt-6 border border-red-700/30 bg-red-50 p-4 text-sm font-bold text-red-900 text-center"
            >
              Submission could not be completed. Please try again.
            </p>
          )}
        </form>
      </div>

      {/* Corporate Footer for Landing Pages */}
      {isLandingPage && (
        <footer className="w-full max-w-4xl mx-auto mt-8 pb-14 border-t border-[#d8d3c8] text-center text-xs text-[#666660] space-y-3 px-4">
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 pt-6 font-medium text-xs">
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#800020] transition-colors underline"
            >
              Privacy & Compliance Policy
            </a>
            <span className="text-neutral-300">•</span>
            <a
              href="/preferences"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#800020] transition-colors underline"
            >
              Notification Preferences
            </a>
            <span className="text-neutral-300">•</span>
            <a
              href="/unsubscribe"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#800020] transition-colors underline"
            >
              One-Click Unsubscribe
            </a>
          </div>
          <p className="text-[11px] text-[#706e68]">
            ABC Company Inc. • 100 Innovation Way, Suite 400, Tech District • Customer Support:
            support@abccompany.test
          </p>
          <p className="text-[10px] text-[#8c8980] font-mono">
            © {new Date().getFullYear()} ABC Company Inc. All rights reserved.
          </p>
        </footer>
      )}
    </main>
  );
}
