import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Globe,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../services/api";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { HelpTooltip } from "../components/HelpTooltip";
import { Modal } from "../components/ui/Modal";
import { useLanguage } from "../contexts/LanguageContext";
import { ReferralVerificationHealth } from "../components/ReferralVerificationHealth";

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

export default function Infrastructure() {
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [consentLogs, setConsentLogs] = useState<any[]>([]);
  const [dataRequests, setDataRequests] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [ssoConfig, setSsoConfig] = useState<any>(null);
  const [isMfaLoading, setIsMfaLoading] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isEditingSSO, setIsEditingSSO] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [ssoFormData, setSsoFormData] = useState({
    ssoEnabled: false,
    ssoDomain: "",
    ssoClientId: "",
    ssoClientSecret: "",
    ssoIssuer: "",
    ssoEntryPoint: "",
    ssoCert: "",
  });

  useEffect(() => {
    api.getConsentLogs().then(setConsentLogs);
    api.getDataRequests().then(setDataRequests);
    api.getAuditLogs().then(setAuditLogs);
    api.getApiKeys().then(setApiKeys);
    api.getSSOConfig().then((config) => {
      setSsoConfig(config);
      setSsoFormData({
        ssoEnabled: config.ssoEnabled,
        ssoDomain: config.ssoDomain || "",
        ssoClientId: config.ssoClientId || "",
        ssoClientSecret: "", // Don't populate secret
        ssoIssuer: config.ssoIssuer || "",
        ssoEntryPoint: config.ssoEntryPoint || "",
        ssoCert: config.ssoCert || "",
      });
    });
  }, []);

  const handleSaveSSO = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await api.updateSSOConfig(ssoFormData);
    setSsoConfig(updated);
    setIsEditingSSO(false);
    alert("SSO Configuration updated successfully.");
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createApiKey({
      name: newKeyName,
      scopes: [
        "contacts:read",
        "contacts:write",
        "campaigns:read",
        "templates:read",
        "segments:read",
      ],
    });
    api.getApiKeys().then(setApiKeys);
    setIsAddingKey(false);
    setNewKeyName("");
  };

  const handleDeleteKey = async (id: string) => {
    if (window.confirm("Revoke this API key? External integrations using this key will fail.")) {
      await api.deleteApiKey(id);
      api.getApiKeys().then(setApiKeys);
    }
  };

  const handleDataRequest = async (type: "EXPORT" | "DELETE") => {
    const contacts = await api.getContacts();
    if (contacts.length === 0) return alert("No contacts available for demo request.");

    await api.addDataRequest({ contactId: contacts[0].id, type });
    api.getDataRequests().then(setDataRequests);
    alert(`${type} request logged and queued for processing.`);
  };

  const handleMfaToggle = async () => {
    setIsMfaLoading(true);
    try {
      await api.updateMFA(!user?.mfaEnabled);
      await refreshUser();
    } catch (error) {
      console.error("MFA update failed", error);
    } finally {
      setIsMfaLoading(false);
    }
  };

  const handleSSOConnect = async () => {
    try {
      const { url } = await api.getSSOUrl();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        "SSO_LOGIN",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        alert("Popup blocked! Please allow popups for this site.");
        return;
      }

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === "SSO_AUTH_SUCCESS") {
          await refreshUser();
          window.removeEventListener("message", handleMessage);
          alert("Enterprise SSO linked successfully!");
        }
      };

      window.addEventListener("message", handleMessage);
    } catch (error) {
      console.error("SSO initiation failed", error);
    }
  };

  return (
    <div className="space-y-16">
      <SectionHeader
        title={t("infrastructure.title")}
        subtitle={t("infrastructure.subtitle")}
        guideKey="infrastructure-api"
      />

      <ReferralVerificationHealth />

      <div className="newspaper-grid">
        {/* Security & SSO */}
        <div className="col-span-12 lg:col-span-4 space-y-8 pr-8 border-r border-border-hairline">
          <div className="space-y-4">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
              {t("infrastructure.securitySso")}
            </h3>

            <div className="space-y-6">
              {/* MFA Toggle */}
              <div className="bg-surface p-6 border border-border-hairline space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-tight">
                      {t("infrastructure.mfa")}
                    </p>
                    <p className="text-[10px] text-ink/60">{t("infrastructure.mfaDesc")}</p>
                  </div>
                  <button
                    onClick={handleMfaToggle}
                    disabled
                    title="MFA enrollment is not implemented"
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      user?.mfaEnabled ? "bg-status-success" : "bg-ink/10"
                    )}
                  >
                    <motion.div
                      animate={{ x: user?.mfaEnabled ? 20 : 2 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
                {user?.mfaEnabled && (
                  <div className="flex items-center gap-2 text-[9px] font-mono text-status-success uppercase">
                    <ShieldCheck size={12} />
                    <span>{t("infrastructure.mfaActive")}</span>
                  </div>
                )}
              </div>

              {/* SSO Configuration */}
              <div className="bg-inverse text-on-inverse p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-bg/10 flex items-center justify-center">
                    <Lock size={20} className="text-burgundy" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest">
                      {t("infrastructure.enterpriseSso")}
                    </p>
                    <p className="text-[9px] text-on-inverse">OIDC / SAML acceptance pending</p>
                  </div>
                </div>

                <p className="text-[10px] text-on-inverse leading-relaxed italic">
                  "Production SSO is unavailable until code exchange and token validation are
                  verified."
                </p>

                {user?.ssoId ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-bg/5 border border-bg/20 rounded flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-status-success" />
                        <span className="text-[10px] font-mono uppercase">
                          {t("status.connected")}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-on-inverse">
                        {user.ssoProvider}
                      </span>
                    </div>
                    <button className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-on-inverse transition-colors">
                      Disconnect Provider
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={handleSSOConnect}
                      disabled
                      className="w-full py-3 bg-on-inverse/10 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <ExternalLink size={14} />
                      {t("infrastructure.linkSso")}
                    </button>
                    <button
                      onClick={() => setIsEditingSSO(true)}
                      disabled
                      className="w-full py-2 border border-on-inverse/20 text-[9px] font-black uppercase tracking-widest text-on-inverse cursor-not-allowed"
                    >
                      {t("infrastructure.configureSso")}
                    </button>
                  </div>
                )}
              </div>

              {/* SSO Config Modal */}
              <AnimatePresence>
                {isEditingSSO && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsEditingSSO(false)}
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 20 }}
                      className="relative w-full max-w-md bg-bg border border-ink p-10 shadow-2xl"
                    >
                      <h3 className="text-2xl font-serif font-bold mb-6">SSO Configuration</h3>
                      <form onSubmit={handleSaveSSO} className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-surface border border-border-hairline">
                          <label className="text-[10px] font-black uppercase tracking-widest">
                            Enable SSO
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setSsoFormData((prev) => ({ ...prev, ssoEnabled: !prev.ssoEnabled }))
                            }
                            className={cn(
                              "w-10 h-5 rounded-full relative transition-colors",
                              ssoFormData.ssoEnabled ? "bg-status-success" : "bg-ink/10"
                            )}
                          >
                            <div
                              className={cn(
                                "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                ssoFormData.ssoEnabled ? "left-6" : "left-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="metric-label">Corporate Domain</label>
                            <input
                              type="text"
                              placeholder="e.g. signal.app"
                              className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                              value={ssoFormData.ssoDomain}
                              onChange={(e) =>
                                setSsoFormData((prev) => ({ ...prev, ssoDomain: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="metric-label">OIDC Issuer URL</label>
                            <input
                              type="text"
                              placeholder="https://auth.okta.com/..."
                              className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                              value={ssoFormData.ssoIssuer}
                              onChange={(e) =>
                                setSsoFormData((prev) => ({ ...prev, ssoIssuer: e.target.value }))
                              }
                            />
                          </div>

                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-border-hairline"></div>
                            </div>
                            <div className="relative flex justify-center text-[8px] uppercase font-bold">
                              <span className="bg-bg px-2 text-ink/40">SAML 2.0 Settings</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="metric-label">SAML Entry Point</label>
                            <input
                              type="text"
                              placeholder="https://idp.example.com/saml/sso"
                              className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                              value={ssoFormData.ssoEntryPoint}
                              onChange={(e) =>
                                setSsoFormData((prev) => ({
                                  ...prev,
                                  ssoEntryPoint: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="metric-label">X.509 Certificate</label>
                            <textarea
                              placeholder="-----BEGIN CERTIFICATE----- ..."
                              className="w-full p-3 bg-surface border border-border-hairline font-mono text-[10px] h-20 focus:border-burgundy outline-none resize-none"
                              value={ssoFormData.ssoCert}
                              onChange={(e) =>
                                setSsoFormData((prev) => ({ ...prev, ssoCert: e.target.value }))
                              }
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="metric-label">Client ID</label>
                              <input
                                type="text"
                                className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                                value={ssoFormData.ssoClientId}
                                onChange={(e) =>
                                  setSsoFormData((prev) => ({
                                    ...prev,
                                    ssoClientId: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="metric-label">Client Secret</label>
                              <input
                                type="password"
                                placeholder="••••••••"
                                className="w-full p-3 bg-surface border border-border-hairline font-mono text-xs focus:border-burgundy outline-none"
                                value={ssoFormData.ssoClientSecret}
                                onChange={(e) =>
                                  setSsoFormData((prev) => ({
                                    ...prev,
                                    ssoClientSecret: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                          <button type="submit" className="btn-primary flex-1 py-3">
                            Save Configuration
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingSSO(false)}
                            className="flex-1 py-3 border border-border-hairline text-[10px] font-black uppercase tracking-widest"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sender Management */}
        <div className="col-span-12 lg:col-span-4 space-y-8 px-8 border-r border-border-hairline">
          <div className="space-y-4">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
              {t("infrastructure.senderManagement")}
            </h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold font-serif">signal.run.app</p>
                  <span className="px-1.5 py-0.5 bg-status-success/10 text-status-success text-[8px] font-black uppercase border border-status-success/20">
                    {t("status.connected")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {["DKIM", "SPF", "DMARC"].map((tKey) => (
                    <div
                      key={tKey}
                      className="bg-surface border border-border-hairline p-2 text-center"
                    >
                      <p className="text-[8px] font-black uppercase text-ink/40">{tKey}</p>
                      <CheckCircle2 size={10} className="mx-auto mt-1 text-status-success" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                  {t("infrastructure.dedicatedIp")}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-ink text-bg flex items-center justify-center font-mono text-xs">
                    IP
                  </div>
                  <div>
                    <p className="text-xs font-bold">192.168.1.104</p>
                    <p className="text-[9px] text-status-success font-black uppercase">
                      Warm-up: 84% Complete
                    </p>
                  </div>
                </div>
                <div className="w-full h-1 bg-bg">
                  <div className="h-full bg-burgundy" style={{ width: "84%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance & Privacy */}
        <div className="col-span-12 lg:col-span-4 space-y-8 pl-8">
          <div className="space-y-4">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
              {t("infrastructure.compliancePrivacy")}
            </h3>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-tight">
                    Consent & Data Rights Tools
                  </p>
                  <span className="text-[8px] font-black uppercase text-status-warning">
                    Legal review required
                  </span>
                </div>
                <p className="text-[10px] text-ink/60 leading-relaxed">
                  Export and deletion workflows are available as technical controls; legal
                  acceptance is separate.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDataRequest("EXPORT")}
                    className="flex-1 py-1.5 border border-border-hairline text-[8px] font-black uppercase tracking-widest hover:bg-surface transition-colors"
                  >
                    {t("infrastructure.dataExport")}
                  </button>
                  <button
                    onClick={() => handleDataRequest("DELETE")}
                    className="flex-1 py-1.5 border border-border-hairline text-[8px] font-black uppercase tracking-widest hover:bg-surface transition-colors"
                  >
                    {t("infrastructure.forgetMe")}
                  </button>
                </div>
              </div>

              <div className="bg-burgundy/5 border border-burgundy/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-burgundy">
                  <AlertCircle size={14} />
                  <p className="text-[10px] font-black uppercase">
                    {t("infrastructure.complianceAlert")}
                  </p>
                </div>
                <p className="text-[10px] text-ink/80 italic">
                  "Your privacy policy was last updated 184 days ago. We recommend a review."
                </p>
              </div>

              <div className="pt-4 border-t border-border-hairline">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-4">
                  Suppression Stats
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xl font-serif font-bold">124</p>
                    <p className="text-[8px] font-black uppercase text-ink/40">
                      {t("infrastructure.globalUnsubs")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xl font-serif font-bold">42</p>
                    <p className="text-[8px] font-black uppercase text-ink/40">
                      {t("infrastructure.bounces")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        {/* Audit Logs (SOC2) */}
        <div className="col-span-12 lg:col-span-8 space-y-8 pr-8 border-r border-border-hairline">
          <div className="flex justify-between items-end">
            <h3 className="text-2xl font-serif font-bold text-ink">
              {t("infrastructure.soc2Audit")}
            </h3>
            <span className="text-[10px] font-mono text-status-success font-bold uppercase tracking-widest">
              {t("infrastructure.complianceLevel")}
            </span>
          </div>
          <div className="border border-border-hairline overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border-hairline">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Action
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">
                    User
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {!auditLogs || !Array.isArray(auditLogs) || auditLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-12 text-center font-editorial italic text-ink/20"
                    >
                      No audit logs recorded.
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-ink">{log.action}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-mono text-ink/60 uppercase">
                          {log.entityType}
                        </p>
                        <p className="text-[8px] font-mono text-ink/40">{log.entityId}</p>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-mono text-ink/60 uppercase">
                        {log.userId}
                      </td>
                      <td className="px-4 py-3 text-[9px] font-mono text-ink/40 uppercase">
                        {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Public API Management */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-serif font-bold text-ink">
              {t("infrastructure.publicApi")}
            </h3>
            <button
              onClick={() => setIsAddingKey(true)}
              className="text-[10px] font-black uppercase text-burgundy hover:underline"
            >
              {t("infrastructure.generateKey")}
            </button>
          </div>
          <div className="space-y-4">
            {!apiKeys || !Array.isArray(apiKeys) || apiKeys.length === 0 ? (
              <div className="bg-surface border border-border-hairline p-12 text-center">
                <ShieldCheck className="w-8 h-8 mx-auto text-ink/20 mb-3" />
                <p className="text-sm font-bold text-ink mb-1">{t("infrastructure.noApiKeys")}</p>
                <p className="text-xs font-editorial italic text-ink/40">
                  {t("infrastructure.noApiKeys")}
                </p>
              </div>
            ) : (
              apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="bg-surface border border-border-hairline p-6 space-y-4 group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-ink">
                        {key.name}
                      </p>
                      <p className="text-xs font-mono text-burgundy mt-1">
                        {key.key.substring(0, 8)}••••••••
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="text-ink/20 hover:text-burgundy transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border-hairline">
                    <p className="text-[8px] font-mono text-ink/40 uppercase">
                      Last used:{" "}
                      {key.lastUsedAt ? format(new Date(key.lastUsedAt), "MMM d") : "Never"}
                    </p>
                    <span className="px-1.5 py-0.5 bg-status-success/10 text-status-success text-[7px] font-black uppercase border border-status-success/20">
                      {t("status.connected")}
                    </span>
                  </div>
                </div>
              ))
            )}

            <div className="bg-inverse text-on-inverse p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-burgundy" />
                <p className="text-xs font-bold uppercase tracking-widest">
                  {t("infrastructure.devGateway")}
                </p>
              </div>
              <p className="text-[10px] text-on-inverse leading-relaxed">
                Integrate SIGNAL with your external systems using our RESTful API.
              </p>
              <button
                onClick={() => window.open("/api/v1/documentation", "_blank")}
                className="w-full py-2 border border-on-inverse/20 text-[9px] font-black uppercase tracking-widest hover:bg-on-inverse/10 transition-colors"
              >
                {t("infrastructure.viewDocs")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Consent Logs & SAR Requests */}
      <div className="grid grid-cols-12 gap-12">
        {/* Consent Logs */}
        <div className="col-span-12 lg:col-span-7 space-y-8 pr-8 border-r border-border-hairline">
          <h3 className="text-2xl font-serif font-bold text-ink">
            {t("infrastructure.consentAudit")}
          </h3>
          <div className="border border-border-hairline overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border-hairline">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Signal
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Action
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Source
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink/40">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {!consentLogs || !Array.isArray(consentLogs) || consentLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-12 text-center font-editorial italic text-ink/20"
                    >
                      No consent records found.
                    </td>
                  </tr>
                ) : (
                  consentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold">{log.contact?.email}</p>
                        <p className="text-[8px] font-mono text-ink/40 uppercase">
                          {log.ipAddress || "0.0.0.0"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 bg-ink/5 text-ink text-[8px] font-black uppercase border border-ink/10">
                          {log.action.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[9px] font-mono text-ink/60 uppercase">
                        {log.source}
                      </td>
                      <td className="px-4 py-3 text-[9px] font-mono text-ink/40 uppercase">
                        {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Requests */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          <h3 className="text-2xl font-serif font-bold text-ink">
            {t("infrastructure.sarRequests")}
          </h3>
          <div className="space-y-4">
            {dataRequests.length === 0 ? (
              <div className="p-12 bg-surface border border-dashed border-border-hairline text-center">
                <p className="text-xs font-editorial italic text-ink/40">
                  No active Subject Access Requests.
                </p>
              </div>
            ) : (
              (dataRequests || []).map((req) => (
                <div
                  key={req.id}
                  className="bg-surface border border-border-hairline p-6 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-burgundy">
                        {req.type} REQUEST
                      </p>
                      <p className="text-sm font-bold text-ink">{req.contact?.email}</p>
                      <p className="text-[9px] font-mono text-ink/40 uppercase mt-1">
                        Received {format(new Date(req.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[8px] font-black uppercase border",
                        req.status === "COMPLETED"
                          ? "border-status-success text-status-success"
                          : "border-burgundy text-burgundy"
                      )}
                    >
                      {req.status}
                    </span>
                  </div>
                  {req.status === "FAILED" && (
                    <button
                      onClick={async () => {
                        await api.retryDataRequest(req.id);
                        api.getDataRequests().then(setDataRequests);
                      }}
                      className="w-full py-2 bg-ink text-bg text-[9px] font-black uppercase tracking-widest hover:bg-ink/80 transition-colors"
                    >
                      Retry request
                    </button>
                  )}
                  {req.status === "COMPLETED" && req.resultUrl && (
                    <a
                      href={req.resultUrl}
                      className="block w-full py-2 bg-ink text-center text-bg text-[9px] font-black uppercase tracking-widest hover:bg-ink/80 transition-colors"
                    >
                      Download encrypted export
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <Modal
        isOpen={isAddingKey}
        onClose={() => setIsAddingKey(false)}
        title="Generate API Key"
        width="max-w-md"
      >
        <form onSubmit={handleCreateKey} className="space-y-4">
          <div className="space-y-1">
            <label className="metric-label">Key Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Production Webhook"
              className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
          </div>
          <div className="pt-4 flex gap-4">
            <button type="submit" className="btn-primary flex-1 py-3">
              Generate Key
            </button>
            <button
              type="button"
              onClick={() => setIsAddingKey(false)}
              className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
