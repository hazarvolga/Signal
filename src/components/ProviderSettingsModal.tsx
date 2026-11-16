import React, { useState } from "react";
import { X, Sparkles, Send, ShieldCheck, Check, DollarSign, Cpu, Database } from "lucide-react";
import { defaultAIService, AIProviderType } from "../services/ai/aiService";
import { defaultEmailDispatcher, EmailProviderType } from "../services/email/emailDispatcher";
import { appConfig, setMockMode } from "../config/appConfig";
import { useLanguage } from "../contexts/LanguageContext";

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProviderSettingsModal: React.FC<ProviderSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useLanguage();
  const currentAiConfig = defaultAIService.getConfig();
  const currentEmailConfig = defaultEmailDispatcher.getConfig();

  const [aiProvider, setAiProvider] = useState<AIProviderType>(currentAiConfig.provider);
  const [aiModel, setAiModel] = useState(currentAiConfig.model);
  const [aiBaseUrl, setAiBaseUrl] = useState(currentAiConfig.baseUrl || "http://localhost:11434");

  const [emailProvider, setEmailProvider] = useState<EmailProviderType>(
    currentEmailConfig.provider
  );
  const [emailDomain, setEmailDomain] = useState(currentEmailConfig.domain || "");
  const [fromName, setFromName] = useState(currentEmailConfig.fromName || "Signal Campaign");
  const [fromEmail, setFromEmail] = useState(
    currentEmailConfig.fromEmail || "onboarding@resend.dev"
  );

  const [mockMode, setMockModeState] = useState(appConfig.enableMockFallback);
  const [activeTab, setActiveTab] = useState<"AI" | "EMAIL" | "DATA">("AI");
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setMockMode(mockMode);
    defaultAIService.updateConfig({
      provider: aiProvider,
      model: aiModel,
      baseUrl: aiBaseUrl,
    });

    defaultEmailDispatcher.updateConfig({
      provider: emailProvider,
      domain: emailDomain,
      fromName,
      fromEmail,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t("providerModal.title")}</h2>
              <p className="text-xs text-gray-400">{t("providerModal.subtitle")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-white/10 bg-black/20 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab("AI")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "AI"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Sparkles size={16} />
            <span>{t("providerModal.aiTab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("EMAIL")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "EMAIL"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Send size={16} />
            <span>{t("providerModal.emailTab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("DATA")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "DATA"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Database size={16} />
            <span>{t("providerModal.dataTab")}</span>
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {activeTab === "AI" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                  Select AI Model Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: "GEMINI",
                      name: "Google Gemini",
                      badge: "Flash / Pro",
                      desc: "Free 15 req/min tier",
                    },
                    { id: "OPENAI", name: "OpenAI", badge: "GPT-4o", desc: "Official OpenAI API" },
                    {
                      id: "CLAUDE",
                      name: "Anthropic Claude",
                      badge: "Claude 3.5",
                      desc: "High quality text generation",
                    },
                    {
                      id: "OLLAMA",
                      name: "Local Ollama",
                      badge: "Llama / DeepSeek",
                      desc: "100% Free & Local",
                    },
                    {
                      id: "CUSTOM",
                      name: "Custom / OpenRouter",
                      badge: "Groq / Mistral",
                      desc: "OpenAI-compatible endpoint",
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setAiProvider(item.id as AIProviderType);
                        if (item.id === "GEMINI") setAiModel("gemini-2.5-flash");
                        if (item.id === "OPENAI") setAiModel("gpt-4o-mini");
                        if (item.id === "CLAUDE") setAiModel("claude-3-5-sonnet-20241022");
                        if (item.id === "OLLAMA") setAiModel("llama3.3");
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        aiProvider === item.id
                          ? "bg-indigo-500/15 border-indigo-500 text-white"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">{item.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-indigo-100">
                API keys are securely held on the server. Provider and secret credentials are
                managed exclusively via deployment environment variables.
              </div>

              {(aiProvider === "OLLAMA" || aiProvider === "CUSTOM") && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Endpoint URL (Base URL)
                  </label>
                  <input
                    type="text"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434 or https://api.groq.com/openai"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Model Name
                </label>
                <input
                  type="text"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="gemini-2.5-flash, gpt-4o-mini, llama3.3, etc."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          ) : activeTab === "EMAIL" ? (
            <div className="space-y-4">
              {/* COST SAVINGS BANNER */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <DollarSign size={18} />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-emerald-400 block mb-0.5">
                    Usage-Based Pricing
                  </span>
                  Email transmission costs vary by provider, region, volume, data transfer, and
                  operational tier. Verify current pricing before scaling production dispatches.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
                  Select Email Delivery Service
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: "RESEND",
                      name: "Resend",
                      badge: "3,000 Free/Mo",
                      desc: "Modern Developer API",
                    },
                    {
                      id: "SENDGRID",
                      name: "SendGrid",
                      badge: "Twilio",
                      desc: "Enterprise Email API",
                    },
                    {
                      id: "MAILGUN",
                      name: "Mailgun",
                      badge: "Domain-based",
                      desc: "Advanced Domain Logging",
                    },
                    {
                      id: "SMTP",
                      name: "Custom SMTP",
                      badge: "Server SMTP",
                      desc: "Self-hosted / Private Server",
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEmailProvider(item.id as EmailProviderType)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        emailProvider === item.id
                          ? "bg-emerald-500/15 border-emerald-500 text-white"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white">{item.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
                Transmission keys and SMTP credentials are never stored in browser memory. They are
                securely injected via production environment variables.
              </div>

              {emailProvider === "MAILGUN" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    Mailgun Domain Name
                  </label>
                  <input
                    type="text"
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value)}
                    placeholder="mg.yourdomain.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="e.g. Acme Marketing"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="newsletter@yourdomain.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Database size={18} />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-blue-400 block mb-0.5">
                    Production & Data Mode Configuration
                  </span>
                  Control whether the application operates on 100% live database records or falls
                  back to demo sample records when the database is empty.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Demo Data Mode (Mock Fallback)</h4>
                    <p className="text-xs text-gray-400">
                      When enabled, renders sample preview cards if no live database records exist.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !import.meta.env.PROD && setMockModeState(!mockMode)}
                    disabled={import.meta.env.PROD}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                      mockMode ? "bg-blue-600" : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        mockMode ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="text-xs text-gray-400 border-t border-white/10 pt-3">
                  <span className="font-semibold text-gray-200">{t("common.status")}: </span>
                  {mockMode ? (
                    <span className="text-amber-400 font-bold">{t("providerModal.demoMode")}</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">
                      {t("providerModal.realMode")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex justify-between items-center">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>
              Credentials and secrets are strictly retained in the server deployment environment.
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              {t("providerModal.cancel")}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              {savedSuccess ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  <span>{t("providerModal.saved")}</span>
                </>
              ) : (
                <span>{t("providerModal.save")}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
