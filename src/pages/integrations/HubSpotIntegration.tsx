import React, { useState, useEffect } from "react";
import { Users2, Key, ExternalLink, Shield } from "lucide-react";
import { IntegrationLayout } from "../../components/integrations/IntegrationLayout";
import { api } from "../../services/api";

export default function HubSpotIntegration() {
  const [status, setStatus] = useState("DISCONNECTED");
  const [config, setConfig] = useState({
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
    api.getProviderIntegration("HUBSPOT").then((res) => {
      setStatus(res.status || "DISCONNECTED");
      setConfig({
        accessToken: res.config?.accessToken || "",
      });
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setTestResult(null);
    try {
      await api.saveProviderIntegration("HUBSPOT", { config });
      setSaveMessage("HubSpot Private App credentials saved securely.");
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
      const res = await api.testProviderIntegration("HUBSPOT", config);
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
    if (!confirm("Are you sure you want to disconnect HubSpot?")) return;
    await api.disconnectProviderIntegration("HUBSPOT");
    setStatus("DISCONNECTED");
  };

  return (
    <IntegrationLayout
      title="HubSpot CRM Integration"
      subtitle="Connect your HubSpot account to sync customer lifecycle stages, contacts, and marketing lists."
      providerType="HUBSPOT"
      status={status}
      icon={<Users2 size={32} />}
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
              Private App Access Token
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  HubSpot Private App Access Token
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="password"
                    placeholder="pat-na1-••••••••••••••••••••••••"
                    value={config.accessToken}
                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
                <p className="text-[10px] font-mono text-ink/40 mt-1">
                  Format: pat-na1-xxxx... Created in your HubSpot account under Settings &gt;
                  Integrations &gt; Private Apps.
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
                href="https://developers.hubspot.com/docs/api/private-apps"
                target="_blank"
                rel="noreferrer"
                className="text-burgundy hover:underline inline-flex items-center gap-1 text-[10px] normal-case"
              >
                HubSpot Docs <ExternalLink size={10} />
              </a>
            </h3>
            <ol className="text-xs text-ink/70 space-y-3 list-decimal list-inside font-sans leading-relaxed">
              <li>
                In your HubSpot account, click the <strong>Settings icon</strong> in the main
                navigation bar.
              </li>
              <li>
                In the left sidebar, navigate to <strong>Integrations → Private Apps</strong>.
              </li>
              <li>
                Click <strong>Create a private app</strong>.
              </li>
              <li>
                Under the <strong>Scopes</strong> tab, grant permissions:
                <ul className="list-disc list-inside pl-4 pt-1 font-mono text-[11px] text-ink/80">
                  <li>
                    <code>crm.objects.contacts.read</code>
                  </li>
                  <li>
                    <code>crm.objects.contacts.write</code>
                  </li>
                </ul>
              </li>
              <li>
                Click <strong>Create app</strong> and confirm. Copy the generated Access Token.
              </li>
              <li>
                Paste the token into the field on the left and click{" "}
                <strong>Test Connection</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </IntegrationLayout>
  );
}
