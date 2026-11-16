import React, { useState, useEffect } from "react";
import { ShoppingBag, Key, Globe, ExternalLink, Shield, RefreshCw } from "lucide-react";
import { IntegrationLayout } from "../../components/integrations/IntegrationLayout";
import { api } from "../../services/api";

export default function WooCommerceIntegration() {
  const [status, setStatus] = useState("DISCONNECTED");
  const [config, setConfig] = useState({
    storeUrl: "",
    consumerKey: "",
    consumerSecret: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ count?: number; syncedAt?: string } | null>(null);

  useEffect(() => {
    api.getProviderIntegration("WOOCOMMERCE").then((res) => {
      setStatus(res.status || "DISCONNECTED");
      setConfig({
        storeUrl: res.config?.storeUrl || "",
        consumerKey: res.config?.consumerKey || "",
        consumerSecret: res.config?.consumerSecret || "",
      });
      if (res.config?.lastSyncCount !== undefined) {
        setSyncResult({ count: res.config.lastSyncCount, syncedAt: res.config.lastSyncTime });
      }
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setTestResult(null);
    try {
      await api.saveProviderIntegration("WOOCOMMERCE", { config });
      setSaveMessage("WooCommerce credentials saved securely.");
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
      const res = await api.testProviderIntegration("WOOCOMMERCE", config);
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

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncProviderIntegration("WOOCOMMERCE");
      if (res.success) {
        setSyncResult({ count: res.count, syncedAt: res.syncedAt });
      }
    } catch (err: any) {
      alert("Product sync error: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect WooCommerce?")) return;
    await api.disconnectProviderIntegration("WOOCOMMERCE");
    setStatus("DISCONNECTED");
  };

  return (
    <IntegrationLayout
      title="WooCommerce Integration"
      subtitle="Connect your self-hosted WordPress WooCommerce store via native REST API v3 to sync products and order revenue."
      providerType="WOOCOMMERCE"
      status={status}
      icon={<ShoppingBag size={32} />}
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
              REST API Credentials
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Store URL
                </label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={config.storeUrl}
                    onChange={(e) => setConfig({ ...config, storeUrl: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
                <p className="text-[10px] font-mono text-ink/40 mt-1">
                  Full WordPress address including https://
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Consumer Key
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="text"
                    placeholder="ck_••••••••••••••••••••••••••••••••••••••••"
                    value={config.consumerKey}
                    onChange={(e) => setConfig({ ...config, consumerKey: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Consumer Secret
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="password"
                    placeholder="cs_••••••••••••••••••••••••••••••••••••••••"
                    value={config.consumerSecret}
                    onChange={(e) => setConfig({ ...config, consumerSecret: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border-hairline p-8 space-y-4">
            <h2 className="text-xl font-serif font-bold text-ink">Catalog Synchronization</h2>
            <p className="text-xs font-editorial text-ink/70 leading-relaxed">
              Import products and stock from your WooCommerce store into SIGNAL campaigns.
            </p>

            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] font-mono text-ink/60">
                {syncResult ? (
                  <span>
                    Last sync: {syncResult.count || 0} products updated (
                    {new Date(syncResult.syncedAt || "").toLocaleTimeString()})
                  </span>
                ) : (
                  <span>No catalog sync performed yet.</span>
                )}
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing || status !== "CONNECTED"}
                className="btn-secondary py-2 px-4 text-[10px] font-mono uppercase tracking-widest inline-flex items-center gap-2"
              >
                <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Syncing..." : "Sync Products Now"}
              </button>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-surface border border-border-hairline p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center justify-between">
              <span>Setup Guide</span>
              <a
                href="https://woocommerce.com/document/woocommerce-rest-api/"
                target="_blank"
                rel="noreferrer"
                className="text-burgundy hover:underline inline-flex items-center gap-1 text-[10px] normal-case"
              >
                WooCommerce Docs <ExternalLink size={10} />
              </a>
            </h3>
            <ol className="text-xs text-ink/70 space-y-3 list-decimal list-inside font-sans leading-relaxed">
              <li>
                In your WordPress Dashboard, go to{" "}
                <strong>WooCommerce → Settings → Advanced → REST API</strong>.
              </li>
              <li>
                Click <strong>Add Key</strong>.
              </li>
              <li>
                Set Description to <em>SIGNAL Marketing</em> and Permissions to{" "}
                <strong>Read/Write</strong>.
              </li>
              <li>
                Click <strong>Generate API Key</strong>.
              </li>
              <li>
                Copy the <strong>Consumer Key</strong> and <strong>Consumer Secret</strong> and
                paste them into the form on the left.
              </li>
              <li>
                Click <strong>Test Connection</strong> to verify WooCommerce connectivity.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </IntegrationLayout>
  );
}
