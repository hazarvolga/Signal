import React, { useState, useEffect } from "react";
import { MessageSquare, Key, Phone, ExternalLink, Shield } from "lucide-react";
import { IntegrationLayout } from "../../components/integrations/IntegrationLayout";
import { api } from "../../services/api";

export default function WhatsAppIntegration() {
  const [status, setStatus] = useState("DISCONNECTED");
  const [config, setConfig] = useState({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
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
    api.getProviderIntegration("WHATSAPP").then((res) => {
      setStatus(res.status || "DISCONNECTED");
      setConfig({
        wabaId: res.config?.wabaId || "",
        phoneNumberId: res.config?.phoneNumberId || "",
        accessToken: res.config?.accessToken || "",
      });
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setTestResult(null);
    try {
      await api.saveProviderIntegration("WHATSAPP", { config });
      setSaveMessage("Meta WhatsApp Cloud API credentials saved securely.");
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
      const res = await api.testProviderIntegration("WHATSAPP", config);
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
    if (!confirm("Are you sure you want to disconnect WhatsApp Meta Cloud API?")) return;
    await api.disconnectProviderIntegration("WHATSAPP");
    setStatus("DISCONNECTED");
  };

  return (
    <IntegrationLayout
      title="WhatsApp (Meta Cloud API)"
      subtitle="Send automated order confirmations, shipping alerts, and verified template messages via official WhatsApp Business API."
      providerType="WHATSAPP"
      status={status}
      icon={<MessageSquare size={32} />}
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
              Meta Cloud API Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="text"
                    placeholder="104829104829104"
                    value={config.wabaId}
                    onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Phone Number ID
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="text"
                    placeholder="109283746592834"
                    value={config.phoneNumberId}
                    onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
                <p className="text-[10px] font-mono text-ink/40 mt-1">
                  Located in Meta Developers &gt; WhatsApp &gt; API Setup &gt; Phone Number ID.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Permanent System User Access Token
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="password"
                    placeholder="EAAB••••••••••••••••••••••••••••••••"
                    value={config.accessToken}
                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
                <p className="text-[10px] font-mono text-ink/40 mt-1">
                  Generated in Meta Business Suite &gt; System Users with{" "}
                  <code>whatsapp_business_messaging</code> permission.
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
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noreferrer"
                className="text-burgundy hover:underline inline-flex items-center gap-1 text-[10px] normal-case"
              >
                Meta Docs <ExternalLink size={10} />
              </a>
            </h3>
            <ol className="text-xs text-ink/70 space-y-3 list-decimal list-inside font-sans leading-relaxed">
              <li>
                In your <strong>Meta for Developers</strong> console, add the{" "}
                <strong>WhatsApp</strong> product to your App.
              </li>
              <li>
                Go to <strong>API Setup</strong> to retrieve your <strong>Phone Number ID</strong>{" "}
                and <strong>WABA ID</strong>.
              </li>
              <li>
                In <strong>Meta Business Manager</strong>, navigate to{" "}
                <strong>Users → System Users</strong>.
              </li>
              <li>
                Create a System User with Admin access and generate an access token with scope{" "}
                <code>whatsapp_business_messaging</code>.
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
