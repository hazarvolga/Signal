import React, { useState, useEffect } from "react";
import { Smartphone, Key, Phone, ExternalLink, Shield } from "lucide-react";
import { IntegrationLayout } from "../../components/integrations/IntegrationLayout";
import { api } from "../../services/api";

export default function TwilioIntegration() {
  const [status, setStatus] = useState("DISCONNECTED");
  const [config, setConfig] = useState({
    accountSid: "",
    authToken: "",
    fromNumber: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getProviderIntegration("TWILIO").then((res) => {
      setStatus(res.status || "DISCONNECTED");
      setConfig({
        accountSid: res.config?.accountSid || "",
        authToken: res.config?.authToken || "",
        fromNumber: res.config?.fromNumber || "",
      });
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setTestResult(null);
    try {
      await api.saveProviderIntegration("TWILIO", { config });
      setSaveMessage("Twilio SMS credentials saved securely.");
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || "Failed to save configuration" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testProviderIntegration("TWILIO", config);
      setTestResult(res);
      if (res.success) {
        setStatus("CONNECTED");
      } else {
        setStatus("ERROR");
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || "Connection failed" });
      setStatus("ERROR");
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Twilio SMS?")) return;
    await api.disconnectProviderIntegration("TWILIO");
    setStatus("DISCONNECTED");
  };

  return (
    <IntegrationLayout
      title="Twilio SMS Channel"
      subtitle="Deliver transactional SMS notifications, 2-factor authentication codes, and time-sensitive broadcast alerts."
      providerType="TWILIO"
      status={status}
      icon={<Smartphone size={32} />}
      isSaving={isSaving}
      isTesting={isTesting}
      onSave={handleSave}
      onTest={handleTest}
      onDisconnect={handleDisconnect}
      testResult={testResult}
      saveMessage={saveMessage}
    >
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="bg-surface border border-border-hairline p-8 space-y-6">
            <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
              <Shield size={18} className="text-burgundy" />
              Twilio API Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Account SID
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="text"
                    placeholder="AC••••••••••••••••••••••••••••••••"
                    value={config.accountSid}
                    onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Auth Token
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••••••••••"
                    value={config.authToken}
                    onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Sender Phone Number / Messaging Service SID
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="text"
                    placeholder="+1234567890 or MG••••••••••••••••••••••••••••••••"
                    value={config.fromNumber}
                    onChange={(e) => setConfig({ ...config, fromNumber: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
                <p className="text-[10px] font-mono text-ink/40 mt-1">
                  E.164 formatted telephone number (e.g. +14155552671) or Twilio Messaging Service
                  SID.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-surface border border-border-hairline p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center justify-between">
              <span>Setup Guide</span>
              <a
                href="https://www.twilio.com/docs/sms"
                target="_blank"
                rel="noreferrer"
                className="text-burgundy hover:underline inline-flex items-center gap-1 text-[10px] normal-case"
              >
                Twilio Docs <ExternalLink size={10} />
              </a>
            </h3>
            <ol className="text-xs text-ink/70 space-y-3 list-decimal list-inside font-sans leading-relaxed">
              <li>
                Log in to your <strong>Twilio Console</strong>.
              </li>
              <li>
                Under <strong>Account Info</strong>, copy your <strong>Account SID</strong> and{" "}
                <strong>Auth Token</strong>.
              </li>
              <li>
                Under <strong>Phone Numbers → Manage → Active Numbers</strong>, copy an SMS-capable
                phone number.
              </li>
              <li>
                Paste the credentials on the left and click <strong>Test Connection</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </IntegrationLayout>
  );
}
