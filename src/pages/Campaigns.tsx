import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Mail,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  Sparkles,
  Split,
  Filter,
  MousePointerClick,
  Eye,
  ChevronRight,
  MoreHorizontal,
  Bell,
  Clock,
  Globe,
  ShieldCheck,
  Languages,
  Wand2,
  AlertTriangle,
  Smartphone,
  RotateCcw,
  Trophy,
  Archive,
  FileEdit,
  FileText,
  RefreshCw,
  MessageSquare,
  Upload,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../services/api";
import { Campaign, Contact, Template, Segment } from "../types";
import { format } from "date-fns";
import { fromZonedTime, formatInTimeZone, toZonedTime } from "date-fns-tz";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "../lib/utils";
import { ContentRenderer } from "../components/ContentRenderer";
import { HelpTooltip } from "../components/HelpTooltip";
import { Modal } from "../components/ui/Modal";
import { useLanguage } from "../contexts/LanguageContext";

// --- Utils ---

const getUtcDateString = (localDate: Date | null, timeZone: string): string => {
  if (!localDate) return "";
  return fromZonedTime(localDate, timeZone).toISOString();
};

const getLocalDateForPicker = (utcDate: string, timeZone: string): Date =>
  toZonedTime(utcDate, timeZone);

const parseUtcStringToLocalDate = (dateStr: string): Date => {
  const [datePart, timePart] = dateStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
};

// --- Local Components ---

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

// --- Campaigns Page ---

export default function Campaigns({ setActiveFlow }: { setActiveFlow?: (id: string) => void }) {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const creationFormRef = useRef<HTMLDivElement>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    subject: "",
    subjectB: "",
    previewText: "",
    fromName: "SIGNAL Editorial",
    fromEmail: "editor@signal.app",
    content: "",
    contentB: "",
    channel: "EMAIL" as "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP",
    type: "REGULAR" as "REGULAR" | "AB",
    testPercentage: 20,
    testDuration: 4,
    winnerCriteria: "OPEN_RATE" as "OPEN_RATE" | "CLICK_RATE",
    scheduledAt: "",
    timezone: "UTC",
    perUserTimezone: false,
    audienceContactIds: [] as string[],
  });
  const [aiTopic, setAiTopic] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingSpam, setIsCheckingSpam] = useState(false);
  const [spamResult, setSpamResult] = useState<{ score: number; reasons: string[] } | null>(null);
  const [isOptimizingPreview, setIsOptimizingPreview] = useState(false);
  const [isAdjustingTone, setIsAdjustingTone] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [predictedTime, setPredictedTime] = useState<{ hour: number; reason: string } | null>(null);
  const [isPredictingTime, setIsPredictingTime] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [approvals, setApprovals] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);
  const [abResults, setAbResults] = useState<any>(null);
  const [selectedAbCampaign, setSelectedAbCampaign] = useState<Campaign | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
  const [segmentTargetMode, setSegmentTargetMode] = useState<"SNAPSHOT" | "DYNAMIC">("SNAPSHOT");
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [aiTone, setAiTone] = useState("Professional");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState<{
    subject: string;
    content: string;
  } | null>(null);

  void setActiveFlow;

  const handleAiGenerate = async () => {
    if (!aiBrief) return;
    setIsAiGenerating(true);
    try {
      const { subject, content } = await api.generateFullContent(aiBrief, aiTone);
      setAiGeneratedResult({ subject, content });
    } catch (error) {
      console.error("AI Generation failed", error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const applyAiContent = () => {
    if (aiGeneratedResult) {
      setNewCampaign({
        ...newCampaign,
        subject: aiGeneratedResult.subject,
        content: aiGeneratedResult.content,
      });
      setIsAiAssistantOpen(false);
      setAiBrief("");
      setAiGeneratedResult(null);
    }
  };

  const openCreator = (templateToLoad?: Template) => {
    if (templateToLoad) {
      setActiveTemplate(templateToLoad);
      setNewCampaign((prev) => ({
        ...prev,
        content: templateToLoad.content,
        name: templateToLoad.name,
        subject: templateToLoad.name,
      }));
    }
    setIsCreating(true);
    setTimeout(() => {
      creationFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  useEffect(() => {
    api.getCampaigns().then(setCampaigns);
    api.getContacts().then(setContacts);
    api.getApprovals().then(setApprovals);
    api.getSegments().then((segs) => {
      setSegments(segs);
      const segmentIdParam = searchParams.get("segmentId");
      if (segmentIdParam) {
        setSelectedSegmentId(segmentIdParam);
        setIsCreating(true);
      }
    });
    api.getTemplates().then((res) => {
      setTemplates(res);
      const templateId = searchParams.get("templateId");
      if (templateId) {
        const template = res.find((t) => t.id === templateId);
        if (template) {
          openCreator(template);
        }
      }
    });
  }, [searchParams]);

  useEffect(() => {
    if (previewCampaign && previewContact) {
      api.getPersonalizationPreview(previewCampaign.content, previewContact.id).then((res) => {
        setPersonalizedContent(res.content);
      });
    } else if (previewCampaign) {
      setPersonalizedContent(previewCampaign.content);
    }
  }, [previewCampaign, previewContact]);

  const handleSaveAsTemplate = async (camp: Campaign) => {
    const name = prompt("Enter template name:", `Template from ${camp.name}`);
    if (name) {
      await api.addTemplate({
        name,
        content: camp.content,
        category: "From Broadcast",
      });
      alert("Template saved.");
    }
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setActiveTemplate(template);
      setNewCampaign((prev) => ({
        ...prev,
        content: template.content,
        name: prev.name || template.name,
        subject: prev.subject || template.name,
      }));
    }
  };

  const handleRequestApproval = async (campaignId: string) => {
    await api.requestApproval({ campaignId });
    api.getCampaigns().then(setCampaigns);
    api.getApprovals().then(setApprovals);
    alert("Approval request sent to editorial board.");
  };

  const filteredCampaigns = campaigns.filter((camp) => {
    const matchesStatus = statusFilter === "ALL" || camp.status === statusFilter;
    const matchesType = typeFilter === "ALL" || camp.type === typeFilter;
    const matchesChannel = channelFilter === "ALL" || camp.channel === channelFilter;
    return matchesStatus && matchesType && matchesChannel;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...newCampaign };
      if (selectedSegmentId) {
        payload.segmentIds = [selectedSegmentId];
        payload.segmentId = selectedSegmentId;
        payload.segmentMode = segmentTargetMode;
      }
      await api.addCampaign(payload);
      setIsCreating(false);
      setActiveTemplate(null);
      setSelectedSegmentId("");
      if (searchParams.get("templateId") || searchParams.get("segmentId")) {
        setSearchParams({}, { replace: true });
      }
      setNewCampaign({
        name: "",
        subject: "",
        subjectB: "",
        previewText: "",
        fromName: "SIGNAL Editorial",
        fromEmail: "editor@signal.app",
        content: "",
        contentB: "",
        channel: "EMAIL",
        type: "REGULAR",
        testPercentage: 20,
        testDuration: 4,
        winnerCriteria: "OPEN_RATE",
        scheduledAt: "",
        timezone: "UTC",
        perUserTimezone: false,
        audienceContactIds: [],
      });
      api.getCampaigns().then(setCampaigns);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Campaign creation failed.");
    }
  };

  const handleSend = async (id: string) => {
    if (confirm("Are you sure you want to send this broadcast immediately?")) {
      try {
        await api.dispatchCampaign(id);
        api.getCampaigns().then(setCampaigns);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Campaign dispatch failed.");
      }
    }
  };

  const handleFinalizeAB = async (id: string) => {
    await api.finalizeABTest(id);
    setAbResults(null);
    setSelectedAbCampaign(null);
    api.getCampaigns().then(setCampaigns);
  };

  const viewABResults = async (camp: Campaign) => {
    const results = await api.getABResults(camp.id);
    setAbResults(results);
    setSelectedAbCampaign(camp);
  };

  const generateAI = async () => {
    if (!aiTopic) return;
    setIsGenerating(true);
    const suggestions = await api.generateSubjectLines(aiTopic);
    setAiSuggestions(suggestions);
    setIsGenerating(false);
  };

  const optimizePreview = async () => {
    if (!newCampaign.subject || !newCampaign.content) return;
    setIsOptimizingPreview(true);
    const preview = await api.optimizePreview(newCampaign.subject, newCampaign.content);
    setNewCampaign({ ...newCampaign, previewText: preview });
    setIsOptimizingPreview(false);
  };

  const checkSpam = async () => {
    setIsCheckingSpam(true);
    const result = await api.checkSpam(newCampaign.subject, newCampaign.content);
    setSpamResult(result);
    setIsCheckingSpam(false);
  };

  const adjustTone = async (tone: string) => {
    setIsAdjustingTone(true);
    const rewritten = await api.adjustTone(newCampaign.content, tone);
    setNewCampaign({ ...newCampaign, content: rewritten });
    setIsAdjustingTone(false);
  };

  const translateContent = async (lang: string) => {
    setIsTranslating(true);
    const translated = await api.translate(newCampaign.content, lang);
    setNewCampaign({ ...newCampaign, content: translated });
    setIsTranslating(false);
  };

  const predictTime = async () => {
    if (!newCampaign.name && !newCampaign.subject) return;
    setIsPredictingTime(true);
    const topic = `${newCampaign.subject || newCampaign.name}\n\n${newCampaign.content?.substring(0, 500) || ""}`;
    const prediction = await api.predictSendTime(topic, newCampaign.timezone);
    setPredictedTime(prediction);
    setIsPredictingTime(false);
  };

  return (
    <div className="space-y-12">
      <SectionHeader
        title={
          isCreating
            ? activeTemplate
              ? activeTemplate.name
              : t("campaigns.createCampaign")
            : t("campaigns.title")
        }
        subtitle={
          isCreating
            ? activeTemplate
              ? language === "tr"
                ? "Şablondan yeni bir kampanya yayını hazırlanıyor."
                : "Drafting a new campaign from template."
              : language === "tr"
                ? "Yeni bir e-posta yayını tasarlayın ve zamanlayın."
                : "Draft and schedule a new broadcast."
            : t("campaigns.subtitle")
        }
        guideKey="campaign-editor"
        action={
          isCreating ? (
            <button
              onClick={() => {
                setIsCreating(false);
                setActiveTemplate(null);
                if (searchParams.get("templateId")) {
                  setSearchParams({}, { replace: true });
                }
              }}
              className="px-4 py-2 border border-border-hairline text-ink/70 hover:text-ink hover:border-ink text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer rounded-sm"
            >
              <span>←</span>
              <span>{language === "tr" ? "Tüm Kampanyalara Dön" : "Back to Campaigns"}</span>
            </button>
          ) : (
            <button onClick={() => openCreator()} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> {t("campaigns.createCampaign")}
            </button>
          )
        }
      />

      <AnimatePresence>
        {isCreating && (
          <motion.div
            ref={creationFormRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface border border-border-hairline p-10 space-y-10"
          >
            {activeTemplate && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-300 p-4 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    size={20}
                    className="text-emerald-600 dark:text-emerald-400 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-bold font-sans">
                      {t("campaigns.templateLoadedTitle")}:{" "}
                      <span className="font-serif italic font-bold text-sm text-ink">
                        {activeTemplate.name}
                      </span>
                    </p>
                    <p className="text-[11px] text-ink/70">{t("campaigns.templateLoadedDesc")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    to="/templates"
                    className="text-[10px] font-black uppercase tracking-widest text-ink/70 hover:text-burgundy transition-colors underline decoration-border-hairline hover:decoration-burgundy"
                  >
                    {t("campaigns.switchTemplate")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setActiveTemplate(null)}
                    className="text-ink/40 hover:text-ink text-xs p-1"
                    title={language === "tr" ? "Kapat" : "Dismiss"}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-4xl font-serif font-bold">{t("campaigns.createCampaign")}</h2>
                <div className="flex gap-4 items-center">
                  <select
                    className="text-[10px] font-black uppercase tracking-widest text-burgundy bg-transparent border-none outline-none cursor-pointer hover:underline"
                    onChange={(e) => loadTemplate(e.target.value)}
                    value={activeTemplate?.id || ""}
                  >
                    <option value="" disabled>
                      {language === "tr" ? "Şablonlardan Yükle..." : "Load from Template..."}
                    </option>
                    {(Array.isArray(templates) ? templates : []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAiAssistantOpen(true)}
                    className="text-[10px] font-black uppercase tracking-widest text-burgundy bg-transparent border-none outline-none cursor-pointer hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Write with AI
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setActiveTemplate(null);
                  if (searchParams.get("templateId")) {
                    setSearchParams({}, { replace: true });
                  }
                }}
                className="text-ink/40 hover:text-burgundy text-lg"
                title={language === "tr" ? "Formu Kapat" : "Close Editor"}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="newspaper-grid">
              <div className="col-span-12 lg:col-span-7 space-y-8">
                <div className="flex justify-between items-center">
                  <div className="space-y-2 flex-1 mr-8">
                    <label className="metric-label">Channel</label>
                    <div className="flex gap-4">
                      {(["EMAIL"] as const).map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => setNewCampaign({ ...newCampaign, channel: ch })}
                          className={cn(
                            "px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                            newCampaign.channel === ch
                              ? "bg-ink text-bg border-ink"
                              : "border-border-hairline text-ink/40 hover:bg-bg"
                          )}
                        >
                          <Mail size={12} />
                          {ch}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-status-warning font-mono uppercase">
                      SMS, WhatsApp and in-app delivery providers are not available.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-2 flex-1 mr-8">
                    <label className="metric-label text-ink/80 dark:text-ink/90">
                      Internal Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-surface/20 dark:bg-surface/40 border-b-2 border-border-hairline px-3 py-2 font-serif text-2xl outline-none focus:border-burgundy transition-colors text-ink placeholder:text-ink/40"
                      placeholder="e.g. Weekly Digest Vol. 42"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setNewCampaign({
                          ...newCampaign,
                          type: newCampaign.type === "REGULAR" ? "AB" : "REGULAR",
                        })
                      }
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 border font-sans font-black uppercase tracking-widest text-[10px] transition-all",
                        newCampaign.type === "AB"
                          ? "bg-burgundy text-white border-burgundy"
                          : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                      )}
                    >
                      <Split size={14} />
                      {newCampaign.type === "AB" ? "A/B Test Active" : "Enable A/B Test"}
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  <div
                    className={cn(
                      "space-y-4 p-6 border border-border-hairline",
                      newCampaign.type === "AB" && "bg-surface/30"
                    )}
                  >
                    {newCampaign.type === "AB" && (
                      <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">
                        Variation A
                      </p>
                    )}
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="metric-label">Subject Line</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Topic for AI..."
                            className="text-[10px] font-mono bg-bg border border-border-hairline px-2 py-1 outline-none focus:border-burgundy"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={generateAI}
                            disabled={isGenerating}
                            className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline disabled:opacity-50"
                          >
                            {isGenerating ? "Generating..." : "AI Suggest"}
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        className="w-full bg-surface/20 dark:bg-surface/40 border-b-2 border-border-hairline px-3 py-2 font-serif text-2xl outline-none focus:border-burgundy transition-colors text-ink placeholder:text-ink/40"
                        placeholder="The headline of your broadcast"
                        value={newCampaign.subject}
                        onChange={(e) =>
                          setNewCampaign({ ...newCampaign, subject: e.target.value })
                        }
                        required
                      />

                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="metric-label">Preview Text</label>
                          <button
                            type="button"
                            onClick={optimizePreview}
                            disabled={isOptimizingPreview || !newCampaign.subject}
                            className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline disabled:opacity-50 flex items-center gap-1"
                          >
                            <Sparkles size={10} />
                            {isOptimizingPreview ? "Optimizing..." : "AI Optimize"}
                          </button>
                        </div>
                        <input
                          type="text"
                          className="w-full bg-surface/20 dark:bg-surface/40 border-b border-border-hairline px-3 py-2 font-sans text-sm outline-none focus:border-burgundy transition-colors text-ink placeholder:text-ink/40"
                          placeholder="Short summary for the inbox"
                          value={newCampaign.previewText}
                          onChange={(e) =>
                            setNewCampaign({ ...newCampaign, previewText: e.target.value })
                          }
                        />
                      </div>

                      {aiSuggestions.length > 0 && (
                        <div className="bg-bg p-4 space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-ink/40">
                            AI Suggestions
                          </p>
                          <div className="space-y-2">
                            {aiSuggestions.map((s, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setNewCampaign({ ...newCampaign, subject: s })}
                                className="block w-full text-left text-sm font-editorial italic hover:text-burgundy transition-colors"
                              >
                                "{s}"
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="metric-label">Editorial Content</label>
                        <div className="flex gap-4">
                          <div className="relative group">
                            <button
                              type="button"
                              className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                            >
                              <Split size={10} /> Dynamic & Growth
                            </button>
                            <div className="absolute right-0 top-full mt-2 bg-bg border border-ink p-2 hidden group-hover:block z-10 shadow-xl min-w-[180px]">
                              <button
                                type="button"
                                onClick={() => {
                                  const placeholder = `\n\n[[DYNAMIC:city=Istanbul|Come to our exclusive Istanbul event this Friday!]]\n\n`;
                                  setNewCampaign({
                                    ...newCampaign,
                                    content: newCampaign.content + placeholder,
                                  });
                                }}
                                className="block w-full text-left px-2 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-surface border-b border-border-hairline"
                              >
                                + Add Dynamic Block
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const placeholder = `\n\n[[REFERRAL_WIDGET]]\n\n`;
                                  setNewCampaign({
                                    ...newCampaign,
                                    content: newCampaign.content + placeholder,
                                  });
                                }}
                                className="block w-full text-left px-2 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-surface"
                              >
                                + Add Referral Widget
                              </button>
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                            >
                              <MousePointerClick size={10} /> Interactive (AMP)
                            </button>
                            <div className="absolute right-0 top-full mt-2 bg-bg border border-ink p-2 hidden group-hover:block z-10 shadow-xl min-w-[160px]">
                              <button
                                type="button"
                                onClick={() => {
                                  const placeholder = `\n\n[[AMP_SURVEY:How would you rate this newsletter?|1,2,3,4,5]]\n\n`;
                                  setNewCampaign({
                                    ...newCampaign,
                                    content: newCampaign.content + placeholder,
                                  });
                                }}
                                className="block w-full text-left px-2 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-surface border-b border-border-hairline"
                              >
                                + Add Survey Form
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const placeholder = `\n\n[[AMP_SURVEY:Will you attend our next event?|Yes,No,Maybe]]\n\n`;
                                  setNewCampaign({
                                    ...newCampaign,
                                    content: newCampaign.content + placeholder,
                                  });
                                }}
                                className="block w-full text-left px-2 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-surface border-b border-border-hairline"
                              >
                                + Add RSVP Form
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const placeholder = `\n\n[[AMP_PRODUCT:Premium Newsletter Subscription|$9.99|Subscribe Now]]\n\n`;
                                  setNewCampaign({
                                    ...newCampaign,
                                    content: newCampaign.content + placeholder,
                                  });
                                }}
                                className="block w-full text-left px-2 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-surface"
                              >
                                + Add Product Purchase
                              </button>
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                            >
                              <Wand2 size={10} /> Tone
                            </button>
                            <div className="absolute right-0 top-full mt-2 bg-bg border border-ink p-2 hidden group-hover:block z-10 shadow-xl min-w-[120px]">
                              {[
                                "Professional",
                                "Casual",
                                "Urgent",
                                "Inspirational",
                                "Authoritative",
                              ].map((tone) => (
                                <button
                                  key={tone}
                                  type="button"
                                  onClick={() => adjustTone(tone)}
                                  className="block w-full text-left px-2 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-surface"
                                >
                                  {tone}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                            >
                              <Languages size={10} /> Translate
                            </button>
                            <div className="absolute right-0 top-full mt-2 bg-bg border border-ink p-2 hidden group-hover:block z-10 shadow-xl min-w-[120px]">
                              {["Turkish", "German", "French", "Spanish", "Japanese"].map(
                                (lang) => (
                                  <button
                                    key={lang}
                                    type="button"
                                    onClick={() => translateContent(lang)}
                                    className="block w-full text-left px-2 py-1 text-[10px] font-black uppercase tracking-widest hover:bg-surface"
                                  >
                                    {lang}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={checkSpam}
                            disabled={isCheckingSpam}
                            className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                          >
                            <ShieldCheck size={10} />
                            {isCheckingSpam ? "Checking..." : "Content Risk Estimate"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewCampaign({
                                id: "preview",
                                name: newCampaign.name || "Preview",
                                subject: newCampaign.subject,
                                content: newCampaign.content,
                                channel: newCampaign.channel,
                                fromName: newCampaign.fromName,
                                fromEmail: newCampaign.fromEmail,
                                type: newCampaign.type,
                                status: "DRAFT",
                                timezone: newCampaign.timezone,
                                organizationId: "preview",
                                createdAt: new Date().toISOString(),
                              })
                            }
                            className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                          >
                            <Eye size={10} /> Preview
                          </button>
                        </div>
                      </div>

                      {spamResult && (
                        <div
                          className={cn(
                            "p-4 border font-mono text-[10px] uppercase",
                            spamResult.score > 30
                              ? "bg-status-warning/10 border-status-warning text-status-warning"
                              : "bg-status-success/10 border-status-success text-status-success"
                          )}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-black">AI Content Risk: {spamResult.score}/100</p>
                            {spamResult.score > 30 && <AlertTriangle size={12} />}
                          </div>
                          <ul className="list-disc pl-4 space-y-1">
                            {spamResult.reasons.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                          <p className="mt-2 normal-case tracking-normal">
                            This estimate does not test inbox placement or guarantee delivery.
                          </p>
                        </div>
                      )}

                      <ReactQuill
                        theme="snow"
                        value={newCampaign.content}
                        onChange={(val) => setNewCampaign({ ...newCampaign, content: val })}
                      />
                    </div>
                  </div>

                  {newCampaign.type === "AB" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4 p-6 border border-burgundy bg-burgundy/5"
                    >
                      <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">
                        Variation B
                      </p>
                      <div className="space-y-4">
                        <label className="metric-label">Subject Line B</label>
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-border-hairline py-2 font-serif text-2xl outline-none focus:border-burgundy transition-colors"
                          placeholder="Alternative headline"
                          value={newCampaign.subjectB}
                          onChange={(e) =>
                            setNewCampaign({ ...newCampaign, subjectB: e.target.value })
                          }
                          required={newCampaign.type === "AB"}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="metric-label">Editorial Content B</label>
                        <ReactQuill
                          theme="snow"
                          value={newCampaign.contentB}
                          onChange={(val) => setNewCampaign({ ...newCampaign, contentB: val })}
                        />
                        <div className="flex justify-between items-center">
                          <button
                            type="button"
                            onClick={() =>
                              setNewCampaign({ ...newCampaign, contentB: newCampaign.content })
                            }
                            className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy"
                          >
                            Copy from Variation A
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewCampaign({
                                id: "preview-b",
                                name: (newCampaign.name || "Preview") + " (Variation B)",
                                subject: newCampaign.subjectB || "",
                                content: newCampaign.contentB || "",
                                channel: newCampaign.channel,
                                fromName: newCampaign.fromName,
                                fromEmail: newCampaign.fromEmail,
                                type: newCampaign.type,
                                status: "DRAFT",
                                timezone: newCampaign.timezone,
                                organizationId: "preview",
                                createdAt: new Date().toISOString(),
                              })
                            }
                            className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-1"
                          >
                            <Eye size={10} /> Preview B
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="col-span-12 lg:col-span-5 space-y-8 lg:pl-10 lg:border-l border-border-hairline">
                <div className="space-y-6">
                  {/* Segment Targeting Selector */}
                  <div className="space-y-3 p-4 bg-surface border border-border-hairline">
                    <div className="flex items-center justify-between">
                      <p className="font-sans font-black uppercase tracking-[0.2em] text-burgundy text-[10px]">
                        Target Segment
                      </p>
                      <div className="flex items-center border border-border-hairline text-[9px] font-mono">
                        <button
                          type="button"
                          onClick={() => setSegmentTargetMode("SNAPSHOT")}
                          className={cn(
                            "px-2 py-0.5 uppercase transition-colors",
                            segmentTargetMode === "SNAPSHOT"
                              ? "bg-burgundy text-white font-bold"
                              : "text-ink/60 hover:text-ink"
                          )}
                        >
                          Snapshot
                        </button>
                        <button
                          type="button"
                          onClick={() => setSegmentTargetMode("DYNAMIC")}
                          className={cn(
                            "px-2 py-0.5 uppercase transition-colors",
                            segmentTargetMode === "DYNAMIC"
                              ? "bg-burgundy text-white font-bold"
                              : "text-ink/60 hover:text-ink"
                          )}
                        >
                          Dynamic
                        </button>
                      </div>
                    </div>
                    <select
                      className="w-full bg-bg border border-border-hairline p-2 text-xs text-ink outline-none focus:border-burgundy"
                      value={selectedSegmentId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        setSelectedSegmentId(sId);
                      }}
                    >
                      <option value="">All Subscribers / Manual Selection</option>
                      {segments.map((seg) => (
                        <option key={seg.id} value={seg.id}>
                          {seg.name} ({seg.contactCount || 0} members)
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-ink/50 italic">
                      {segmentTargetMode === "SNAPSHOT"
                        ? "Snapshot: Pre-resolves matching subscribers at campaign creation time."
                        : "Dynamic: Re-evaluates segment audience live at dispatch time."}
                    </p>
                  </div>

                  <div className="space-y-4 pb-6 border-b border-border-hairline">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-sans font-black uppercase tracking-[0.2em] text-burgundy text-[10px]">
                          Explicit Audience
                        </p>
                        <p className="text-xs text-ink/60 mt-1">
                          Only consented, subscribed contacts can be snapshotted for delivery.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const eligibleIds = contacts
                            .filter(
                              (contact) => contact.status === "SUBSCRIBED" && contact.emailConsent
                            )
                            .map((contact) => contact.id);
                          setNewCampaign({
                            ...newCampaign,
                            audienceContactIds:
                              newCampaign.audienceContactIds.length === eligibleIds.length
                                ? []
                                : eligibleIds,
                          });
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-burgundy"
                      >
                        {newCampaign.audienceContactIds.length > 0 ? "Clear" : "Select eligible"}
                      </button>
                    </div>
                    <div className="max-h-44 overflow-y-auto border border-border-hairline">
                      {contacts
                        .filter(
                          (contact) => contact.status === "SUBSCRIBED" && contact.emailConsent
                        )
                        .map((contact) => (
                          <label
                            key={contact.id}
                            className="flex items-center gap-3 px-3 py-2 border-b last:border-b-0 border-border-hairline text-xs text-ink"
                          >
                            <input
                              type="checkbox"
                              checked={newCampaign.audienceContactIds.includes(contact.id)}
                              onChange={(event) =>
                                setNewCampaign({
                                  ...newCampaign,
                                  audienceContactIds: event.target.checked
                                    ? [...newCampaign.audienceContactIds, contact.id]
                                    : newCampaign.audienceContactIds.filter(
                                        (contactId) => contactId !== contact.id
                                      ),
                                })
                              }
                            />
                            <span className="truncate">{contact.email}</span>
                          </label>
                        ))}
                      {!contacts.some(
                        (contact) => contact.status === "SUBSCRIBED" && contact.emailConsent
                      ) && (
                        <p className="p-3 text-xs text-ink/50">
                          No contacts currently have verified email consent.
                        </p>
                      )}
                    </div>
                    <p className="font-mono text-[10px] uppercase text-ink/50">
                      {newCampaign.audienceContactIds.length} recipient(s) selected
                    </p>
                  </div>
                  {newCampaign.type === "AB" && (
                    <div className="space-y-6 pb-6 border-b border-border-hairline">
                      <p className="font-sans font-black uppercase tracking-[0.2em] text-burgundy text-[10px]">
                        A/B Test Settings
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="metric-label">Test Size (%)</label>
                          <input
                            type="number"
                            className="w-full bg-transparent border-b border-border-hairline py-1 font-mono text-xs outline-none focus:border-burgundy"
                            value={newCampaign.testPercentage}
                            onChange={(e) =>
                              setNewCampaign({
                                ...newCampaign,
                                testPercentage: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="metric-label">Duration (Hours)</label>
                          <input
                            type="number"
                            className="w-full bg-transparent border-b border-border-hairline py-1 font-mono text-xs outline-none focus:border-burgundy"
                            value={newCampaign.testDuration}
                            onChange={(e) =>
                              setNewCampaign({
                                ...newCampaign,
                                testDuration: parseInt(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="metric-label">Winner Criteria</label>
                        <select
                          className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
                          value={newCampaign.winnerCriteria}
                          onChange={(e) =>
                            setNewCampaign({
                              ...newCampaign,
                              winnerCriteria: e.target.value as "OPEN_RATE" | "CLICK_RATE",
                            })
                          }
                        >
                          <option value="OPEN_RATE">Highest Open Rate</option>
                          <option value="CLICK_RATE">Highest Click Rate</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="metric-label text-ink/80 dark:text-ink/90">From Name</label>
                    <input
                      type="text"
                      className="w-full bg-surface/20 dark:bg-surface/40 border-b border-border-hairline px-3 py-2 font-sans font-bold text-sm outline-none focus:border-burgundy text-ink"
                      value={newCampaign.fromName}
                      onChange={(e) => setNewCampaign({ ...newCampaign, fromName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="metric-label text-ink/80 dark:text-ink/90">From Email</label>
                    <input
                      type="email"
                      className="w-full bg-surface/20 dark:bg-surface/40 border-b border-border-hairline px-3 py-2 font-sans font-bold text-sm outline-none focus:border-burgundy text-ink"
                      value={newCampaign.fromEmail}
                      onChange={(e) =>
                        setNewCampaign({ ...newCampaign, fromEmail: e.target.value })
                      }
                    />
                  </div>

                  <div className="pt-6 space-y-4 border-t border-border-hairline">
                    <p className="font-sans font-black uppercase tracking-[0.2em] text-ink/40 text-[10px]">
                      Scheduling
                    </p>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="metric-label flex items-center gap-2">
                            <Clock size={12} /> Date & Time
                          </label>
                          <button
                            type="button"
                            onClick={predictTime}
                            disabled={isPredictingTime}
                            className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline disabled:opacity-50 flex items-center gap-1"
                          >
                            <Sparkles size={10} />
                            {isPredictingTime ? "Analyzing..." : "AI Best Time"}
                          </button>
                        </div>
                        <div className="relative">
                          <DatePicker
                            selected={
                              newCampaign.scheduledAt
                                ? getLocalDateForPicker(
                                    newCampaign.scheduledAt,
                                    newCampaign.timezone
                                  )
                                : null
                            }
                            onChange={(date) =>
                              setNewCampaign({
                                ...newCampaign,
                                scheduledAt: date
                                  ? getUtcDateString(date, newCampaign.timezone)
                                  : "",
                              })
                            }
                            showTimeSelect
                            dateFormat="MMMM d, yyyy h:mm aa"
                            className="w-full bg-transparent border-b border-border-hairline py-1 font-mono text-xs outline-none focus:border-burgundy cursor-pointer"
                            placeholderText="Select dispatch date and time"
                            minDate={new Date()}
                          />
                        </div>
                        {predictedTime && (
                          <div className="bg-burgundy/5 border border-burgundy/20 p-3 mt-2">
                            <p className="text-[9px] font-black uppercase text-burgundy mb-1">
                              AI Recommendation
                            </p>
                            <p className="text-[10px] font-serif italic text-ink/80">
                              {predictedTime.reason}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const date = new Date();
                                date.setHours(predictedTime.hour, 0, 0, 0);
                                let utcString = getUtcDateString(date, newCampaign.timezone);
                                if (new Date(utcString) < new Date()) {
                                  date.setDate(date.getDate() + 1);
                                  utcString = getUtcDateString(date, newCampaign.timezone);
                                }
                                setNewCampaign({ ...newCampaign, scheduledAt: utcString });
                              }}
                              className="mt-2 text-[9px] font-black uppercase tracking-widest text-burgundy hover:underline"
                            >
                              Apply {predictedTime.hour}:00
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="metric-label flex items-center gap-2">
                          <Globe size={12} /> Timezone
                        </label>
                        <div className="relative group">
                          <select
                            className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy appearance-none cursor-pointer"
                            value={newCampaign.timezone}
                            onChange={(e) =>
                              setNewCampaign({ ...newCampaign, timezone: e.target.value })
                            }
                          >
                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                            <option value="America/New_York">EST (Eastern Standard Time)</option>
                            <option value="America/Chicago">CST (Central Standard Time)</option>
                            <option value="America/Denver">MST (Mountain Standard Time)</option>
                            <option value="America/Los_Angeles">PST (Pacific Standard Time)</option>
                            <option value="Europe/London">GMT (Greenwich Mean Time)</option>
                            <option value="Europe/Paris">CET (Central European Time)</option>
                            <option value="Asia/Tokyo">JST (Japan Standard Time)</option>
                          </select>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-ink/20 group-hover:text-burgundy transition-colors">
                            <ChevronRight size={14} className="rotate-90" />
                          </div>
                        </div>
                        <p className="text-[9px] font-mono text-ink/40 uppercase mt-1">
                          Current selection:{" "}
                          <span className="text-burgundy">{newCampaign.timezone}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="perUserTimezone"
                          className="accent-burgundy"
                          checked={newCampaign.perUserTimezone}
                          onChange={(e) =>
                            setNewCampaign({ ...newCampaign, perUserTimezone: e.target.checked })
                          }
                        />
                        <label
                          htmlFor="perUserTimezone"
                          className="text-[10px] font-black uppercase tracking-widest text-ink/60 cursor-pointer"
                        >
                          Per-user timezone sending
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-10 flex flex-col gap-3">
                  <button type="submit" className="btn-primary w-full py-4 text-sm">
                    {newCampaign.scheduledAt ? "Schedule Broadcast" : "Save Dispatch Draft"}
                  </button>
                  {newCampaign.scheduledAt && (
                    <button
                      type="button"
                      onClick={() => setNewCampaign({ ...newCampaign, scheduledAt: "" })}
                      className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy text-center"
                    >
                      Clear Schedule & Save as Draft
                    </button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!isCreating && (
        <div className="space-y-0">
          <div className="flex items-center gap-8 mb-8 pb-4 border-b border-border-hairline">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-ink/40 flex items-center gap-2">
                <Filter size={12} /> {t("campaigns.status")}:
              </span>
              <div className="flex gap-2">
                {["ALL", "DRAFT", "IN_REVIEW", "SCHEDULED", "SENT", "ARCHIVED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-all",
                      statusFilter === s
                        ? "bg-burgundy text-white border-burgundy"
                        : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                    )}
                  >
                    {t(`status.${s.toLowerCase()}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-ink/40 flex items-center gap-2">
                <Split size={12} /> {t("campaigns.type")}:
              </span>
              <div className="flex gap-2">
                {["ALL", "REGULAR", "AB"].map((typeKey) => (
                  <button
                    key={typeKey}
                    onClick={() => setTypeFilter(typeKey)}
                    className={cn(
                      "px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-all",
                      typeFilter === typeKey
                        ? "bg-burgundy text-white border-burgundy"
                        : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                    )}
                  >
                    {typeKey === "ALL" ? t("status.all") : typeKey}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-ink/40 flex items-center gap-2">
                <Smartphone size={12} /> {t("campaigns.channel")}:
              </span>
              <div className="flex gap-2">
                {["ALL", "EMAIL", "SMS", "WHATSAPP"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setChannelFilter(c)}
                    className={cn(
                      "px-3 py-1 text-[9px] font-black uppercase tracking-widest border transition-all",
                      channelFilter === c
                        ? "bg-burgundy text-white border-burgundy"
                        : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                    )}
                  >
                    {c === "ALL" ? t("status.all") : c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 border-b-2 border-ink pb-4 mb-4 px-4">
            <div className="col-span-4 metric-label">{t("campaigns.broadcastName")}</div>
            <div className="col-span-2 metric-label">{t("campaigns.sender")}</div>
            <div className="col-span-2 metric-label">{t("campaigns.status")}</div>
            <div className="col-span-2 metric-label">{t("campaigns.engagement")}</div>
            <div className="col-span-1 metric-label">{t("campaigns.date")}</div>
            <div className="col-span-1"></div>
          </div>

          {filteredCampaigns.map((camp, i) => (
            <div
              key={camp.id}
              className={cn(
                "grid grid-cols-12 gap-4 items-center py-6 px-4 hover:bg-surface transition-colors group border-b border-border-hairline",
                i === 0 && "bg-surface/30"
              )}
            >
              <div className="col-span-4">
                <div className="flex items-center gap-3">
                  <Link to={`/campaigns/${camp.id}`}>
                    <h3 className="font-serif text-2xl font-bold group-hover:text-burgundy transition-colors">
                      {camp.name}
                    </h3>
                  </Link>
                  <div className="flex gap-2">
                    {camp.type === "AB" && (
                      <span className="px-1.5 py-0.5 bg-burgundy/10 text-burgundy text-[8px] font-black uppercase tracking-widest border border-burgundy/20">
                        A/B
                      </span>
                    )}
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border",
                        camp.channel === "EMAIL"
                          ? "bg-ink/5 text-ink/60 border-ink/10"
                          : camp.channel === "SMS"
                            ? "bg-status-success/10 text-status-success border-status-success/20"
                            : "bg-status-warning/10 text-status-warning border-status-warning/20"
                      )}
                    >
                      {camp.channel}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-ink/40 font-mono mt-1 uppercase">{camp.subject}</p>
                {camp.previewText && (
                  <p className="text-[10px] text-ink/30 italic mt-1 line-clamp-1">
                    {camp.previewText}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <p className="font-sans font-bold text-[11px] text-ink">{camp.fromName}</p>
                <p className="font-mono text-[9px] text-ink/40 uppercase">{camp.fromEmail}</p>
              </div>
              <div className="col-span-2">
                <div
                  className={cn(
                    "px-2 py-1 text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-fit",
                    camp.status === "SENT"
                      ? "border-status-success/30 bg-status-success/5 text-status-success"
                      : camp.status === "SCHEDULED"
                        ? "border-status-scheduled/30 bg-status-scheduled/5 text-status-scheduled"
                        : camp.status === "IN_REVIEW"
                          ? "border-burgundy/30 bg-burgundy/5 text-burgundy"
                          : camp.status === "ARCHIVED"
                            ? "border-ink/10 bg-ink/5 text-ink/40"
                            : camp.status === "SENDING"
                              ? "border-status-warning/30 bg-status-warning/5 text-status-warning"
                              : "border-status-draft/30 bg-status-draft/5 text-status-draft"
                  )}
                >
                  {camp.status === "SENT" && <CheckCircle2 size={10} />}
                  {camp.status === "SCHEDULED" && <Clock size={10} />}
                  {camp.status === "IN_REVIEW" && <ShieldCheck size={10} />}
                  {camp.status === "ARCHIVED" && <Archive size={10} />}
                  {camp.status === "SENDING" && <RefreshCw size={10} className="animate-spin" />}
                  {camp.status === "DRAFT" && <FileEdit size={10} />}
                  {camp.status.replace("_", " ")}
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <div className="flex justify-between text-[9px] font-mono text-ink/40">
                  <span>OPEN</span>
                  <span>24%</span>
                </div>
                <div className="h-0.5 bg-bg">
                  <div className="h-full bg-burgundy w-[24%]" />
                </div>
              </div>
              <div className="col-span-1 font-mono text-[10px] text-ink/60 uppercase">
                {camp.status === "SCHEDULED" && camp.scheduledAt ? (
                  <span className="text-status-scheduled">
                    {format(new Date(camp.scheduledAt), "MMM d")}
                  </span>
                ) : (
                  format(new Date(camp.createdAt), "MMM d")
                )}
              </div>
              <div className="col-span-1 flex justify-end gap-2">
                <button
                  onClick={() => setPreviewCampaign(camp)}
                  className="text-ink/20 hover:text-burgundy"
                  title="Preview Content"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleSaveAsTemplate(camp)}
                  className="text-ink/20 hover:text-burgundy"
                  title="Save as Template"
                >
                  <FileText size={18} />
                </button>
                {camp.status === "DRAFT" && (
                  <button
                    onClick={() => handleRequestApproval(camp.id)}
                    className="text-burgundy hover:scale-110 transition-transform"
                    title="Request Approval"
                  >
                    <ShieldCheck size={18} />
                  </button>
                )}
                {camp.status === "DRAFT" && (
                  <button
                    onClick={() => handleSend(camp.id)}
                    className="text-burgundy hover:scale-110 transition-transform"
                    title="Send Now"
                  >
                    <Send size={18} />
                  </button>
                )}
                {camp.status === "ARCHIVED" && (
                  <button
                    onClick={async () => {
                      if (confirm("Restore this broadcast to Draft?")) {
                        await api.updateCampaignStatus(camp.id, "DRAFT");
                        api.getCampaigns().then(setCampaigns);
                      }
                    }}
                    className="text-ink/20 hover:text-burgundy"
                    title="Restore to Draft"
                  >
                    <RotateCcw size={18} />
                  </button>
                )}
                {camp.status === "DRAFT" && (
                  <button
                    onClick={async () => {
                      if (confirm("Permanently delete this draft?")) {
                        await api.deleteCampaign(camp.id);
                        api.getCampaigns().then(setCampaigns);
                      }
                    }}
                    className="text-ink/20 hover:text-burgundy"
                    title="Delete Draft"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                {camp.status !== "ARCHIVED" && camp.status !== "DRAFT" && (
                  <button
                    onClick={async () => {
                      if (confirm("Archive this broadcast?")) {
                        await api.updateCampaignStatus(camp.id, "ARCHIVED");
                        api.getCampaigns().then(setCampaigns);
                      }
                    }}
                    className="text-ink/20 hover:text-burgundy"
                    title="Archive"
                  >
                    <Archive size={18} />
                  </button>
                )}
                {camp.type === "AB" && (
                  <button
                    onClick={() => viewABResults(camp)}
                    className="text-burgundy hover:scale-110 transition-transform"
                    title="View A/B Results"
                  >
                    <Split size={18} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="More campaign actions"
                  className="text-ink/20 hover:text-burgundy"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>
          ))}

          {campaigns.length === 0 ? (
            <div className="py-32 text-center">
              <p className="font-editorial italic text-5xl text-ink/20">
                {t("campaigns.noCampaigns")}
              </p>
              <button
                onClick={() => openCreator()}
                className="mt-8 text-burgundy font-sans font-black uppercase tracking-widest text-xs hover:underline"
              >
                {t("campaigns.createCampaign")}
              </button>
            </div>
          ) : (
            filteredCampaigns.length === 0 && (
              <div className="py-32 text-center">
                <p className="font-editorial italic text-5xl text-ink/20">
                  {t("common.noMatchesFound")}
                </p>
                {(statusFilter !== "ALL" || typeFilter !== "ALL" || channelFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setStatusFilter("ALL");
                      setTypeFilter("ALL");
                      setChannelFilter("ALL");
                    }}
                    className="mt-8 text-burgundy font-sans font-black uppercase tracking-widest text-xs hover:underline"
                  >
                    {t("common.clearAllFilters")}
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}

      <Modal
        isOpen={!!previewCampaign}
        onClose={() => {
          setPreviewCampaign(null);
          setPreviewContact(null);
        }}
        title={previewCampaign?.name || "Preview"}
        width="max-w-4xl"
      >
        <div className="flex items-center gap-4 mb-6">
          <p className="text-xs font-mono text-ink/40 uppercase">
            Subject: {previewCampaign?.subject}
          </p>
          <div className="flex items-center gap-2 border-l border-border-hairline pl-4">
            <span className="text-[10px] font-black uppercase text-ink/40">Preview as:</span>
            <select
              className="bg-transparent text-[10px] font-mono uppercase outline-none text-burgundy"
              onChange={(e) => {
                const contact = contacts.find((c) => c.id === e.target.value);
                setPreviewContact(contact || null);
              }}
              value={previewContact?.id || ""}
            >
              <option value="">Default (Tokens)</option>
              {contacts.slice(0, 10).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="bg-white p-6 -mx-6">
          <div className="max-w-2xl mx-auto">
            <ContentRenderer
              content={personalizedContent}
              campaignId={previewCampaign?.id || "preview"}
              contactId={previewContact?.id || "preview"}
              className="prose prose-sm font-serif"
            />
          </div>
        </div>
        <div className="pt-4 text-center">
          <p className="text-[10px] font-mono text-ink/40 uppercase">Editorial Preview Mode</p>
        </div>
      </Modal>

      <Modal
        isOpen={!!abResults && !!selectedAbCampaign}
        onClose={() => setAbResults(null)}
        title={`A/B Test Results: ${selectedAbCampaign?.name}`}
        width="max-w-2xl"
      >
        {abResults && selectedAbCampaign && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div
                className={cn(
                  "relative space-y-4 p-6 border transition-all",
                  (
                    selectedAbCampaign.winnerCriteria === "OPEN_RATE"
                      ? abResults.variationA.rate > abResults.variationB.rate
                      : abResults.variationA.clicks > abResults.variationB.clicks
                  )
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-border-hairline bg-surface"
                )}
              >
                {(selectedAbCampaign.winnerCriteria === "OPEN_RATE"
                  ? abResults.variationA.rate > abResults.variationB.rate
                  : abResults.variationA.clicks > abResults.variationB.clicks) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1">
                    <Trophy size={10} />
                    Leading Winner
                  </div>
                )}
                <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">
                  Variation A
                </p>
                <p className="font-serif text-lg font-bold">"{selectedAbCampaign.subject}"</p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-hairline">
                  <div
                    className={cn(
                      selectedAbCampaign.winnerCriteria === "OPEN_RATE" && "text-emerald-600"
                    )}
                  >
                    <p className="metric-label">Open Rate</p>
                    <p className="text-2xl font-serif font-bold">{abResults.variationA.rate}%</p>
                  </div>
                  <div
                    className={cn(
                      selectedAbCampaign.winnerCriteria === "CLICK_RATE" && "text-emerald-600"
                    )}
                  >
                    <p className="metric-label">Clicks</p>
                    <p className="text-2xl font-serif font-bold">{abResults.variationA.clicks}</p>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "relative space-y-4 p-6 border transition-all",
                  (
                    selectedAbCampaign.winnerCriteria === "OPEN_RATE"
                      ? abResults.variationB.rate > abResults.variationA.rate
                      : abResults.variationB.clicks > abResults.variationA.clicks
                  )
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-border-hairline bg-surface"
                )}
              >
                {(selectedAbCampaign.winnerCriteria === "OPEN_RATE"
                  ? abResults.variationB.rate > abResults.variationA.rate
                  : abResults.variationB.clicks > abResults.variationA.clicks) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1">
                    <Trophy size={10} />
                    Leading Winner
                  </div>
                )}
                <p className="font-sans font-black uppercase tracking-widest text-[10px] text-burgundy">
                  Variation B
                </p>
                <p className="font-serif text-lg font-bold">"{selectedAbCampaign.subjectB}"</p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-hairline">
                  <div
                    className={cn(
                      selectedAbCampaign.winnerCriteria === "OPEN_RATE" && "text-emerald-600"
                    )}
                  >
                    <p className="metric-label">Open Rate</p>
                    <p className="text-2xl font-serif font-bold">{abResults.variationB.rate}%</p>
                  </div>
                  <div
                    className={cn(
                      selectedAbCampaign.winnerCriteria === "CLICK_RATE" && "text-emerald-600"
                    )}
                  >
                    <p className="metric-label">Clicks</p>
                    <p className="text-2xl font-serif font-bold">{abResults.variationB.clicks}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-ink text-bg text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest">
                Verified-event leader:{" "}
                <span className="text-emerald-400 font-black">
                  Variation {abResults.variationA.rate > abResults.variationB.rate ? "A" : "B"}
                </span>{" "}
                is performing better based on your{" "}
                {selectedAbCampaign.winnerCriteria === "OPEN_RATE" ? "open rate" : "click rate"}{" "}
                criteria.
              </p>
            </div>
            <div className="pt-4 border-t border-border-hairline text-center">
              <button
                onClick={() => handleFinalizeAB(selectedAbCampaign.id)}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline"
              >
                <RefreshCw size={12} />
                Finalize from verified events
              </button>
              <p className="mt-2 text-[10px] text-ink/50">
                Finalization fails closed until the test window and minimum sample are complete.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isAiAssistantOpen}
        onClose={() => {
          setIsAiAssistantOpen(false);
          setAiGeneratedResult(null);
        }}
        title="AI Copywriting Assistant"
        width="max-w-lg"
      >
        {!aiGeneratedResult ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="metric-label">Content Brief</label>
              <textarea
                className="w-full bg-transparent border border-border-hairline p-4 font-serif text-lg outline-none focus:border-burgundy transition-colors min-h-[120px]"
                placeholder="What is this email about? (e.g. A weekly newsletter about sustainable fashion with 3 main articles...)"
                value={aiBrief}
                onChange={(e) => setAiBrief(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="metric-label">Editorial Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "Professional",
                  "Casual",
                  "Urgent",
                  "Inspirational",
                  "Authoritative",
                  "Minimalist",
                  "Analytical",
                  "Empathetic",
                  "Sophisticated",
                ].map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setAiTone(tone)}
                    className={cn(
                      "py-2 text-[10px] font-black uppercase tracking-widest border transition-all",
                      aiTone === tone
                        ? "bg-ink text-bg border-ink"
                        : "border-border-hairline text-ink/40 hover:border-burgundy hover:text-burgundy"
                    )}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                onClick={handleAiGenerate}
                disabled={isAiGenerating || !aiBrief}
                className="btn-primary flex-1 py-4 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAiGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Generate Content
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="metric-label">Generated Subject Line</label>
              <input
                type="text"
                className="w-full bg-transparent border border-border-hairline p-3 font-sans font-bold text-sm outline-none focus:border-burgundy transition-colors"
                value={aiGeneratedResult.subject}
                onChange={(e) =>
                  setAiGeneratedResult({ ...aiGeneratedResult, subject: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="metric-label">Generated Content</label>
              <div className="border border-border-hairline p-4 max-h-[40vh] overflow-y-auto custom-scrollbar font-serif text-sm">
                <div dangerouslySetInnerHTML={{ __html: aiGeneratedResult.content }} />
              </div>
            </div>
            <div className="pt-4 flex gap-4">
              <button
                onClick={() => setAiGeneratedResult(null)}
                className="px-6 py-3 border border-ink text-ink text-[10px] font-black uppercase tracking-widest hover:bg-ink/5 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={applyAiContent}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
              >
                <Check size={16} /> Apply to Broadcast
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
