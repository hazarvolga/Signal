import React, { useState, useEffect } from "react";
import { Zap, Copy, Check, ExternalLink, Shield, Webhook } from "lucide-react";
import { IntegrationLayout } from "../../components/integrations/IntegrationLayout";
import { api } from "../../services/api";

export default function ZapierIntegration() {
  const [status, setStatus] = useState("DISCONNECTED");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    api.getProviderIntegration("ZAPIER").then((res) => {
      setStatus(res.status || "DISCONNECTED");
    });
  }, []);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      const res = await api.testProviderIntegration("ZAPIER", {});
      setTestResult(res);
      setStatus("CONNECTED");
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || "Failed to ping" });
    }
  };

  const handleDisconnect = async () => {
    await api.disconnectProviderIntegration("ZAPIER");
    setStatus("DISCONNECTED");
  };

  const webhookTriggerEndpoint = `${window.location.origin}/api/webhooks`;
  const samplePayload = JSON.stringify(
    {
      id: "evt_9f82ab71",
      event: "contact.created",
      organizationId: "org-your-tenant",
      timestamp: "2026-10-08T08:00:00.000Z",
      data: {
        contactId: "cnt_12345",
        email: "subscriber@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
      },
    },
    null,
    2
  );

  return (
    <IntegrationLayout
      title="Zapier Automation Hub"
      subtitle="Connect SIGNAL to 6,000+ business applications via Zapier webhooks and automated multi-step triggers."
      providerType="ZAPIER"
      status={status}
      icon={<Zap size={32} />}
      onTest={handleTest}
      onDisconnect={handleDisconnect}
      testResult={testResult}
    >
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Method 1: Webhook Trigger from SIGNAL */}
          <div className="bg-surface border border-border-hairline p-8 space-y-6">
            <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
              <Webhook size={18} className="text-burgundy" />
              1. Trigger Zaps from SIGNAL (Outbound)
            </h2>
            <p className="text-xs text-ink/70 leading-relaxed">
              When events happen in SIGNAL (like a new subscriber joins or an order is placed), send
              real-time data to your Zapier "Catch Hook" trigger.
            </p>

            <div className="space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70">
                Outbound Payload Example (JSON)
              </label>
              <div className="relative">
                <pre className="p-4 bg-bg border border-border-hairline font-mono text-[11px] text-ink overflow-x-auto">
                  {samplePayload}
                </pre>
                <button
                  onClick={() => handleCopy(samplePayload, "payload")}
                  className="absolute top-3 right-3 p-1.5 bg-surface border border-border-hairline text-ink/60 hover:text-ink transition-colors"
                  title="Copy sample JSON"
                >
                  {copiedField === "payload" ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Method 2: Inbound Webhook into SIGNAL */}
          <div className="bg-surface border border-border-hairline p-8 space-y-6">
            <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
              <Shield size={18} className="text-burgundy" />
              2. Perform Actions in SIGNAL from Zapier (Inbound)
            </h2>
            <p className="text-xs text-ink/70 leading-relaxed">
              Create new contacts or trigger marketing campaigns in SIGNAL from your external CRM,
              Google Forms, or Typeform.
            </p>

            <div className="space-y-3">
              <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70">
                SIGNAL API Base URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/contacts`}
                  className="flex-1 p-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink select-all outline-none"
                />
                <button
                  onClick={() => handleCopy(`${window.location.origin}/api/contacts`, "apiurl")}
                  className="p-2.5 bg-surface border border-border-hairline text-ink/70 hover:text-ink"
                >
                  {copiedField === "apiurl" ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
              <p className="text-[10px] font-mono text-ink/50">
                Authenticate your Zapier HTTP request with the header{" "}
                <code>x-api-key: sig_live_...</code> generated on the Integrations hub.
              </p>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-surface border border-border-hairline p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center justify-between">
              <span>Quick Start Recipes</span>
              <a
                href="https://zapier.com/apps/webhook/integrations"
                target="_blank"
                rel="noreferrer"
                className="text-burgundy hover:underline inline-flex items-center gap-1 text-[10px] normal-case"
              >
                Zapier Docs <ExternalLink size={10} />
              </a>
            </h3>

            <div className="space-y-4 text-xs text-ink/80 font-sans">
              <div className="p-3 bg-bg border border-border-hairline">
                <p className="font-bold text-ink">New Subscriber → Google Sheets</p>
                <p className="text-[11px] text-ink/60 mt-0.5">
                  Register your Zapier Catch Hook under <strong>Webhooks</strong> in SIGNAL with
                  event <code>contact.created</code>.
                </p>
              </div>

              <div className="p-3 bg-bg border border-border-hairline">
                <p className="font-bold text-ink">Calendly Booking → SIGNAL Welcome Campaign</p>
                <p className="text-[11px] text-ink/60 mt-0.5">
                  Configure Zapier to send a POST request to <code>/api/contacts</code> whenever a
                  new Calendly invitee books a call.
                </p>
              </div>

              <div className="p-3 bg-bg border border-border-hairline">
                <p className="font-bold text-ink">Stripe Charge → SIGNAL VIP Segment</p>
                <p className="text-[11px] text-ink/60 mt-0.5">
                  Tag subscribers with the VIP tag automatically when their lifetime value passes a
                  threshold.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </IntegrationLayout>
  );
}
