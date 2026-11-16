import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  Key,
  Globe,
  Webhook,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Shield,
} from "lucide-react";
import { IntegrationLayout } from "../../components/integrations/IntegrationLayout";
import { api } from "../../services/api";

export default function ShopifyIntegration() {
  const [status, setStatus] = useState("DISCONNECTED");
  const [config, setConfig] = useState({
    shopDomain: "",
    accessToken: "",
    webhookSecret: "",
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
    api.getProviderIntegration("SHOPIFY").then((res) => {
      setStatus(res.status || "DISCONNECTED");
      setConfig({
        shopDomain: res.config?.shopDomain || "",
        accessToken: res.config?.accessToken || "",
        webhookSecret: res.config?.webhookSecret || "",
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
      await api.saveProviderIntegration("SHOPIFY", { config });
      setSaveMessage("Shopify credentials saved securely.");
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
      const res = await api.testProviderIntegration("SHOPIFY", config);
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
      const res = await api.syncProviderIntegration("SHOPIFY");
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
    if (!confirm("Are you sure you want to disconnect Shopify? Webhooks and syncing will pause."))
      return;
    await api.disconnectProviderIntegration("SHOPIFY");
    setStatus("DISCONNECTED");
  };

  const webhookEndpoint = `${window.location.origin}/api/webhooks/shopify`;

  return (
    <IntegrationLayout
      title="Shopify Integration"
      subtitle="Synchronize ecommerce products, customer orders, and real-time inventory updates directly into your marketing workflows."
      providerType="SHOPIFY"
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
        {/* Credentials Form */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="bg-surface border border-border-hairline p-8 space-y-6">
            <h2 className="text-xl font-serif font-bold text-ink flex items-center gap-2">
              <Shield size={18} className="text-burgundy" />
              API Credentials
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Shopify Store Domain
                </label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value={config.shopDomain}
                    onChange={(e) => setConfig({ ...config, shopDomain: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
                <p className="text-[10px] font-mono text-ink/40 mt-1">
                  Format: store-name.myshopify.com (do not include https://)
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Admin API Access Token
                </label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="password"
                    placeholder="shpat_••••••••••••••••••••••••"
                    value={config.accessToken}
                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
                <p className="text-[10px] font-mono text-ink/40 mt-1">
                  Generated from your Shopify Custom App with read_products, read_orders scopes.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-ink/70 mb-2">
                  Webhook Signature Secret (HMAC)
                </label>
                <div className="relative">
                  <Webhook size={14} className="absolute left-3 top-3.5 text-ink/40" />
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    value={config.webhookSecret}
                    onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-bg border border-border-hairline font-mono text-xs text-ink focus:border-burgundy outline-none"
                  />
                </div>
                <p className="text-[10px] font-mono text-ink/40 mt-1">
                  Used to verify HMAC-SHA256 signatures for orders/create and products/update
                  webhooks.
                </p>
              </div>
            </div>
          </div>

          {/* Sync & Operations */}
          <div className="bg-surface border border-border-hairline p-8 space-y-4">
            <h2 className="text-xl font-serif font-bold text-ink">Catalog Synchronization</h2>
            <p className="text-xs font-editorial text-ink/70 leading-relaxed">
              Import the latest products, prices, and stock counts from Shopify into SIGNAL's
              product catalog.
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

        {/* Webhook Endpoint & Setup Tutorial */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-bg border border-border-hairline p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink">
              Shopify Webhook Target URL
            </h3>
            <p className="text-xs text-ink/60">
              Configure this endpoint in your Shopify notifications or custom app webhooks:
            </p>
            <div className="p-3 bg-surface border border-border-hairline font-mono text-xs text-ink select-all break-all">
              {webhookEndpoint}
            </div>
            <div className="text-[10px] font-mono text-ink/50 space-y-1">
              <p>Supported Topics:</p>
              <ul className="list-disc list-inside">
                <li>
                  <code>orders/create</code> (Triggers ORDER_PLACED automation)
                </li>
                <li>
                  <code>products/update</code> (Syncs inventory & stock)
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-surface border border-border-hairline p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-ink flex items-center justify-between">
              <span>Setup Guide</span>
              <a
                href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
                target="_blank"
                rel="noreferrer"
                className="text-burgundy hover:underline inline-flex items-center gap-1 text-[10px] normal-case"
              >
                Shopify Docs <ExternalLink size={10} />
              </a>
            </h3>
            <ol className="text-xs text-ink/70 space-y-3 list-decimal list-inside font-sans leading-relaxed">
              <li>
                In your Shopify Admin, navigate to{" "}
                <strong>Settings → Apps and sales channels → Develop apps</strong>.
              </li>
              <li>
                Click <strong>Create an app</strong> and name it <em>SIGNAL Marketing</em>.
              </li>
              <li>
                Under <strong>Configuration → Admin API integration</strong>, enable:
                <ul className="list-disc list-inside pl-4 pt-1 font-mono text-[11px] text-ink/80">
                  <li>read_products, write_products</li>
                  <li>read_orders, read_customers</li>
                </ul>
              </li>
              <li>
                Click <strong>Install app</strong> and reveal the{" "}
                <strong>Admin API access token</strong>.
              </li>
              <li>
                Paste the token and store domain in the fields on the left, then click{" "}
                <strong>Test Connection</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </IntegrationLayout>
  );
}
