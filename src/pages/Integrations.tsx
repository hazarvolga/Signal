import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Smartphone,
  MessageSquare,
  ShoppingBag,
  Users2,
  Zap,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  Copy,
  Check,
  Plus,
  Shield,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../services/api";
import { cn } from "../lib/utils";
import { HelpTooltip } from "../components/HelpTooltip";
import { useLanguage } from "../contexts/LanguageContext";
import { StatusBadge } from "../components/ui/StatusBadge";

const SectionHeader = ({
  title,
  subtitle,
  action,
  guideKey,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  guideKey?: string;
}) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-border-hairline pb-4 mb-8 gap-4">
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl sm:text-5xl font-serif font-bold text-ink leading-tight">
          {title}
        </h1>
        {guideKey && <HelpTooltip guideKey={guideKey} />}
      </div>
      {subtitle && (
        <p className="text-base sm:text-lg font-editorial italic text-ink/60">{subtitle}</p>
      )}
    </div>
    {action && <div className="flex shrink-0">{action}</div>}
  </div>
);

const Integrations = () => {
  const { t } = useLanguage();
  const [providerStatuses, setProviderStatuses] = useState<
    Record<string, { status: string; configSummary?: any }>
  >({});
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isAddingWebhook, setIsAddingWebhook] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ url: "", events: [] as string[] });

  // API Key State
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  const availableEvents = [
    "contact.created",
    "contact.unsubscribed",
    "campaign.sent",
    "campaign.opened",
    "campaign.clicked",
    "order.placed",
    "stock.updated",
  ];

  const loadData = () => {
    api
      .getIntegrationsStatus()
      .then((res) => setProviderStatuses(res || {}))
      .catch(() => setProviderStatuses({}));
    api
      .getWebhooks()
      .then((res) => setWebhooks(Array.isArray(res) ? res : []))
      .catch(() => setWebhooks([]));
    api
      .getApiKeys()
      .then((res) => setApiKeys(Array.isArray(res) ? res : []))
      .catch(() => setApiKeys([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhook.url || newWebhook.events.length === 0) return;
    await api.addWebhook(newWebhook);
    setIsAddingWebhook(false);
    setNewWebhook({ url: "", events: [] });
    api.getWebhooks().then(setWebhooks);
  };

  const handleDeleteWebhook = async (id: string) => {
    if (confirm("Delete this webhook?")) {
      await api.deleteWebhook(id);
      api.getWebhooks().then(setWebhooks);
    }
  };

  const toggleEvent = (event: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleGenerateKey = async () => {
    setIsGeneratingKey(true);
    try {
      const res = await api.createApiKey({
        name: `Production API Key (${new Date().toLocaleDateString()})`,
        scopes: ["all"],
      });
      if (res.key) {
        setNewlyCreatedKey(res.key);
        setShowKey(true);
      }
      api.getApiKeys().then(setApiKeys);
    } catch (err: any) {
      alert("Failed to generate key: " + err.message);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyKey = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Channels definition with live DB statuses
  const channels = [
    {
      id: "twilio",
      type: "TWILIO",
      name: "SMS (Twilio)",
      desc: "Deliver high-priority SMS notifications and two-factor alert broadcasts.",
      icon: <Smartphone size={24} />,
      status: providerStatuses.TWILIO?.status || "DISCONNECTED",
      link: "/integrations/twilio",
      summary: providerStatuses.TWILIO?.configSummary?.fromNumber,
    },
    {
      id: "whatsapp",
      type: "WHATSAPP",
      name: "WhatsApp (Meta)",
      desc: "Send interactive templates, order confirmations, and customer support alerts.",
      icon: <MessageSquare size={24} />,
      status: providerStatuses.WHATSAPP?.status || "DISCONNECTED",
      link: "/integrations/whatsapp",
      summary: providerStatuses.WHATSAPP?.configSummary?.phoneNumberId
        ? `Phone ID: ${providerStatuses.WHATSAPP.configSummary.phoneNumberId}`
        : undefined,
    },
  ];

  // Marketplace integrations with live DB statuses
  const marketplace = [
    {
      id: "shopify",
      type: "SHOPIFY",
      name: "Shopify",
      desc: t("integrations.shopifyDesc"),
      icon: <ShoppingBag size={24} />,
      status: providerStatuses.SHOPIFY?.status || "DISCONNECTED",
      link: "/integrations/shopify",
      summary: providerStatuses.SHOPIFY?.configSummary?.shopDomain,
    },
    {
      id: "woocommerce",
      type: "WOOCOMMERCE",
      name: "WooCommerce",
      desc: t("integrations.wooDesc"),
      icon: <ShoppingBag size={24} />,
      status: providerStatuses.WOOCOMMERCE?.status || "DISCONNECTED",
      link: "/integrations/woocommerce",
      summary: providerStatuses.WOOCOMMERCE?.configSummary?.storeUrl,
    },
    {
      id: "hubspot",
      type: "HUBSPOT",
      name: "HubSpot",
      desc: t("integrations.hubspotDesc"),
      icon: <Users2 size={24} />,
      status: providerStatuses.HUBSPOT?.status || "DISCONNECTED",
      link: "/integrations/hubspot",
      summary:
        providerStatuses.HUBSPOT?.status === "CONNECTED" ? "Private App Connected" : undefined,
    },
    {
      id: "zapier",
      type: "ZAPIER",
      name: "Zapier",
      desc: t("integrations.zapierDesc"),
      icon: <Zap size={24} />,
      status: providerStatuses.ZAPIER?.status || "DISCONNECTED",
      link: "/integrations/zapier",
      summary: "Webhooks & Automation",
    },
  ];

  const primaryKey =
    newlyCreatedKey || (apiKeys.length > 0 ? `sig_${apiKeys[0].id.slice(0, 16)}••••••••` : null);

  return (
    <div className="space-y-16">
      <SectionHeader
        title={t("integrations.title")}
        subtitle={t("integrations.subtitle")}
        guideKey="integrations-api"
      />

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-8 space-y-12">
          {/* Channel Connections (SMS / WhatsApp) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h3 className="text-2xl font-serif font-bold text-ink">
                {t("integrations.channelConnections")}
              </h3>
              <span className="text-[10px] font-mono uppercase text-ink/40">
                Multi-Channel Delivery
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="bg-surface border border-border-hairline p-8 space-y-6 flex flex-col justify-between hover:border-burgundy/40 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-bg border border-border-hairline flex items-center justify-center text-ink/70">
                        {channel.icon}
                      </div>
                      <StatusBadge status={channel.status} />
                    </div>
                    <div>
                      <p className="text-base font-serif font-bold text-ink">{channel.name}</p>
                      <p className="text-xs font-editorial italic text-ink/60 mt-1">
                        {channel.desc}
                      </p>
                      {channel.summary && (
                        <p className="text-[11px] font-mono text-burgundy mt-2 truncate">
                          {channel.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    to={channel.link}
                    className="w-full py-2.5 px-4 bg-bg border border-border-hairline text-ink text-[10px] font-black uppercase tracking-widest hover:border-burgundy hover:text-burgundy transition-all flex items-center justify-center gap-2"
                  >
                    <span>Configure Connection</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Marketplace Integrations */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <h3 className="text-2xl font-serif font-bold text-ink">
                {t("integrations.marketplace")}
              </h3>
              <span className="text-[10px] font-mono uppercase text-ink/40">Ecommerce & CRM</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {marketplace.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface border border-border-hairline p-8 space-y-6 flex flex-col justify-between hover:border-burgundy transition-colors group"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="w-12 h-12 bg-bg border border-border-hairline flex items-center justify-center text-ink/60 group-hover:text-burgundy transition-colors">
                        {item.icon}
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div>
                      <p className="text-base font-serif font-bold text-ink">{item.name}</p>
                      <p className="text-xs font-editorial italic text-ink/60 mt-1">{item.desc}</p>
                      {item.summary && (
                        <p className="text-[11px] font-mono text-burgundy mt-2 truncate">
                          {item.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  <Link
                    to={item.link}
                    className="w-full py-2.5 px-4 bg-bg border border-border-hairline text-ink text-[10px] font-black uppercase tracking-widest hover:border-burgundy hover:text-burgundy transition-all flex items-center justify-center gap-2"
                  >
                    <span>{item.status === "CONNECTED" ? "Manage Settings" : "Connect Store"}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Outbound Webhooks & Production API Access */}
        <div className="col-span-12 lg:col-span-4 space-y-12">
          {/* Real API Access Box */}
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-bold text-ink">
              {t("integrations.apiAccess")}
            </h3>
            <div className="bg-inverse text-on-inverse p-8 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    {t("integrations.prodApiKey")}
                  </p>
                  <span className="text-[9px] font-mono text-white/40">
                    {apiKeys.length} {apiKeys.length === 1 ? "key active" : "keys active"}
                  </span>
                </div>

                {primaryKey ? (
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-3 font-mono text-xs">
                    <Lock size={12} className="text-white/30 shrink-0" />
                    <span className="flex-1 overflow-hidden text-ellipsis select-all">
                      {newlyCreatedKey
                        ? showKey
                          ? newlyCreatedKey
                          : `sig_${newlyCreatedKey.slice(4, 10)}••••••••••••••••••••`
                        : showKey
                          ? primaryKey
                          : "sig_live_••••••••••••••••••••"}
                    </span>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="text-white/60 hover:text-white transition-colors"
                      title={showKey ? "Hide key" : "Reveal key"}
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {newlyCreatedKey && (
                      <button
                        onClick={() => handleCopyKey(newlyCreatedKey)}
                        className="text-white/60 hover:text-white transition-colors ml-1"
                        title="Copy API Key"
                      >
                        {copiedKey ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white/5 border border-white/10 text-white/40 font-mono text-xs text-center">
                    No API keys created yet
                  </div>
                )}

                {newlyCreatedKey && (
                  <p className="text-[10px] font-mono text-amber-300/90 leading-tight pt-1">
                    ⚠️ Copy this API key now! For security reasons, full keys cannot be displayed
                    again after leaving this page.
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-white/10 text-[10px] font-mono text-white/50">
                <div className="flex justify-between uppercase">
                  <span>Authentication</span>
                  <span className="text-white">Bearer & x-api-key</span>
                </div>
                <div className="flex justify-between uppercase">
                  <span>Rate Limit</span>
                  <span className="text-white">1,000 req/min</span>
                </div>
              </div>

              <button
                onClick={handleGenerateKey}
                disabled={isGeneratingKey}
                className="w-full py-3 bg-surface text-ink text-[10px] font-black uppercase tracking-widest hover:bg-bg transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={12} />
                <span>{isGeneratingKey ? "Generating..." : "Generate New API Key"}</span>
              </button>
            </div>
          </div>

          {/* Webhooks Section */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border-hairline pb-3">
              <h3 className="text-2xl font-serif font-bold text-ink">
                {t("integrations.webhooks")}
              </h3>
              <button
                onClick={() => setIsAddingWebhook(true)}
                className="btn-primary py-1.5 px-3 text-[10px] font-mono uppercase tracking-widest"
              >
                + Add Webhook
              </button>
            </div>

            <AnimatePresence>
              {isAddingWebhook && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-surface border border-border-hairline p-6 space-y-6 overflow-hidden"
                >
                  <form onSubmit={handleAddWebhook} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-ink/70">
                        {t("integrations.targetUrl")}
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://your-api.com/webhook"
                        className="w-full bg-bg border border-border-hairline p-2.5 font-mono text-xs focus:border-burgundy outline-none"
                        value={newWebhook.url}
                        onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-ink/70">
                        {t("integrations.eventsToSubscribe")}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableEvents.map((ev) => (
                          <button
                            key={ev}
                            type="button"
                            onClick={() => toggleEvent(ev)}
                            className={cn(
                              "px-2.5 py-1 text-[9px] font-mono uppercase border transition-all",
                              newWebhook.events.includes(ev)
                                ? "bg-burgundy text-white border-burgundy"
                                : "border-border-hairline text-ink/50 hover:border-burgundy hover:text-burgundy"
                            )}
                          >
                            {ev}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4 pt-2">
                      <button
                        type="submit"
                        className="btn-primary py-2 px-5 text-[10px] font-mono uppercase"
                      >
                        {t("integrations.createWebhook")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingWebhook(false)}
                        className="text-[10px] font-mono uppercase text-ink/40 hover:text-burgundy"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border border-border-hairline divide-y divide-border-hairline bg-surface">
              {webhooks.length === 0 ? (
                <div className="p-8 text-center font-editorial italic text-xs text-ink/40">
                  {t("integrations.noWebhooks")}
                </div>
              ) : (
                webhooks.map((hook) => (
                  <div
                    key={hook.id}
                    className="p-5 flex items-center justify-between hover:bg-bg transition-colors"
                  >
                    <div className="space-y-1 overflow-hidden pr-3">
                      <p className="text-xs font-mono font-bold text-ink truncate">{hook.url}</p>
                      <p className="text-[9px] font-mono text-ink/40 uppercase">
                        {typeof hook.events === "string"
                          ? JSON.parse(hook.events).join(", ")
                          : hook.events?.join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          hook.isActive ? "bg-emerald-500" : "bg-ink/20"
                        )}
                        title={hook.isActive ? "Active webhook" : "Inactive"}
                      />
                      <button
                        onClick={() => handleDeleteWebhook(hook.id)}
                        className="text-ink/40 hover:text-rose-600 transition-colors p-1"
                        title="Delete webhook"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
