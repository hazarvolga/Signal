import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Plus,
  Trash2,
  Search,
  Eye,
  Smartphone,
  Monitor,
  X,
  Check,
  Mail,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Liquid } from "liquidjs";
import { api } from "../services/api";
import { Template } from "../types";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { HelpTooltip } from "../components/HelpTooltip";
import { useLanguage } from "../contexts/LanguageContext";

const liquidEngine = new Liquid({
  strictVariables: false,
  strictFilters: false,
});

const buildPreviewDocument = (bodyHtml: string, lang: string) => {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base target="_blank">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Source+Serif+4:ital,opsz,wght@0,8..60,300..900;1,8..60,300..900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #F8F9FA;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
};

const cleanSnippetHtml = (raw: string, isTr: boolean) => {
  return raw
    .replace(/\{\{\s*contact\.name[^}]*\}\}/gi, isTr ? "Ahmet Yılmaz" : "Sarah Jenkins")
    .replace(/\{\{\s*org\.name[^}]*\}\}/gi, "SIGNAL")
    .replace(/\{\{\s*today[^}]*\}\}/gi, isTr ? "Ekim 2026" : "Oct 2026")
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/gi, "#")
    .replace(/\{\{\s*preference_center_url[^}]*\}\}/gi, "#")
    .replace(/\{\{\s*app_url[^}]*\}\}/gi, "#");
};

const CATEGORIES = [
  { id: "ALL", label: "Tümü", en: "All" },
  { id: "ONBOARDING", label: "Karşılama & Onboarding", en: "Onboarding" },
  { id: "NEWSLETTER", label: "Bülten & Editoryal", en: "Newsletter" },
  { id: "ANNOUNCEMENT", label: "Lansman & Duyuru", en: "Announcement" },
  { id: "PROMOTION", label: "Satış & Özel Teklif", en: "Promotion" },
  { id: "EVENTS", label: "Webinar & Etkinlik", en: "Events" },
  { id: "FEEDBACK", label: "Geri Bildirim & Anket", en: "Feedback" },
  { id: "RETENTION", label: "Geri Kazanım (Win-Back)", en: "Retention" },
];

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

const Templates = () => {
  const { t, language } = useLanguage();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "", category: "ONBOARDING" });
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  const [renderedPreviewHtml, setRenderedPreviewHtml] = useState<string>("");
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);

  useEffect(() => {
    api.getTemplates().then((data) => setTemplates(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    if (!previewTemplate) {
      setRenderedPreviewHtml("");
      return;
    }

    setIsRenderingPreview(true);

    const isTr = language === "tr";
    const context = {
      contact: {
        name: isTr ? "Ahmet Yılmaz" : "Sarah Jenkins",
        email: isTr ? "ahmet.yilmaz@abccompany.test" : "sarah.j@example.com",
        first_name: isTr ? "Ahmet" : "Sarah",
        last_name: isTr ? "Yılmaz" : "Jenkins",
      },
      org: {
        name: "ABC Company Inc.",
        address: "100 Innovation Way, Suite 400, Tech District",
        support_email: "support@abccompany.test",
        website: window.location.origin,
      },
      today: new Date(),
      app_url: window.location.origin,
      unsubscribe_url: "/unsubscribe",
      preference_center_url: "/preferences",
      privacy_policy_url: "/privacy",
      view_in_browser_url: "/templates",
    };

    liquidEngine
      .parseAndRender(previewTemplate.content, context)
      .then((rendered) => {
        setRenderedPreviewHtml(buildPreviewDocument(rendered, language));
      })
      .catch((err) => {
        console.warn("Liquid preview fallback applied:", err);
        const fallback = cleanSnippetHtml(previewTemplate.content, isTr);
        setRenderedPreviewHtml(buildPreviewDocument(fallback, language));
      })
      .finally(() => {
        setIsRenderingPreview(false);
      });
  }, [previewTemplate, language]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addTemplate(newTemplate);
    setIsAdding(false);
    setNewTemplate({ name: "", content: "", category: "ONBOARDING" });
    api.getTemplates().then((data) => setTemplates(Array.isArray(data) ? data : []));
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this template?")) {
      await api.deleteTemplate(id);
      api.getTemplates().then((data) => setTemplates(Array.isArray(data) ? data : []));
    }
  };

  const filteredTemplates = (Array.isArray(templates) ? templates : []).filter((template) => {
    const category = (template.category || "").toUpperCase();
    const matchesCategory = selectedCategory === "ALL" || category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryCount = (categoryId: string) => {
    if (!Array.isArray(templates)) return 0;
    if (categoryId === "ALL") return templates.length;
    return templates.filter((t) => (t.category || "").toUpperCase() === categoryId).length;
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title={t("templates.title")}
        subtitle={t("templates.subtitle")}
        guideKey="templates-library"
        action={
          <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {t("templates.createTemplate")}
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-surface/50 border border-border-hairline p-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all shrink-0 flex items-center gap-1.5",
                  isSelected
                    ? "bg-burgundy text-white shadow-sm"
                    : "bg-surface hover:bg-bg text-ink/70 hover:text-ink border border-border-hairline"
                )}
              >
                <span>{language === "tr" ? cat.label : cat.en}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    isSelected ? "bg-white/20 text-white" : "bg-ink/10 text-ink/60"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="text"
            placeholder={language === "tr" ? "Şablonlarda ara..." : "Search templates..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg border border-border-hairline rounded-sm text-ink placeholder:text-ink/40 outline-none focus:border-burgundy"
          />
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface border border-border-hairline p-10 space-y-6"
          >
            <div className="flex justify-between items-start">
              <h2 className="text-4xl font-serif font-bold">Create Template</h2>
              <button
                onClick={() => setIsAdding(false)}
                className="text-ink/40 hover:text-burgundy"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="metric-label">Template Name</label>
                  <input
                    type="text"
                    className="w-full bg-transparent border-b border-border-hairline py-2 font-serif text-2xl outline-none focus:border-burgundy"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="metric-label">Category</label>
                  <select
                    className="w-full bg-surface border border-border-hairline p-2 text-ink outline-none focus:border-burgundy text-sm"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  >
                    {CATEGORIES.filter((c) => c.id !== "ALL").map((c) => (
                      <option key={c.id} value={c.id}>
                        {language === "tr" ? c.label : c.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="metric-label">Content Structure (HTML / Liquid)</label>
                <ReactQuill
                  theme="snow"
                  value={newTemplate.content}
                  onChange={(val) => setNewTemplate({ ...newTemplate, content: val })}
                />
              </div>
              <button type="submit" className="btn-primary px-8 py-3">
                Save Template
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-surface border border-border-hairline p-6 flex flex-col justify-between group hover:border-burgundy hover:shadow-md transition-all rounded-sm"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-burgundy bg-burgundy/10 px-2.5 py-1 border border-burgundy/20 rounded-sm">
                  {template.category || "General"}
                </span>
                <button
                  type="button"
                  aria-label={`Delete template ${template.name}`}
                  onClick={() => handleDelete(template.id)}
                  className="text-ink/30 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="font-serif text-xl font-bold text-ink leading-snug line-clamp-2">
                {template.name}
              </h3>

              {/* Rendered Preview Snippet */}
              <div className="h-36 overflow-hidden relative border border-border-hairline/60 bg-white rounded-sm p-3">
                <div
                  className="text-[11px] text-ink/70 leading-relaxed pointer-events-none select-none origin-top scale-95"
                  dangerouslySetInnerHTML={{
                    __html: cleanSnippetHtml(template.content, language === "tr"),
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              </div>
            </div>

            <div className="pt-4 mt-6 flex justify-between items-center border-t border-border-hairline">
              <button
                type="button"
                onClick={() => setPreviewTemplate(template)}
                className="text-xs font-bold text-ink/70 hover:text-burgundy flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye size={14} />
                <span>{language === "tr" ? "Önizle" : "Preview"}</span>
              </button>
              <Link
                to={`/campaigns?templateId=${template.id}`}
                className="btn-primary text-[10px] py-1.5 px-3 flex items-center gap-1"
              >
                <span>{language === "tr" ? "Şablonu Kullan" : "Use Template"}</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && !isAdding && (
        <div className="py-24 text-center border border-dashed border-border-hairline bg-surface/30">
          <p className="font-editorial italic text-3xl text-ink/40 mb-2">
            {language === "tr" ? "Eşleşen şablon bulunamadı." : "No matching templates found."}
          </p>
          <p className="text-xs text-ink/50 font-sans">
            {language === "tr"
              ? "Arama kriterlerinizi değiştirin veya yeni bir şablon oluşturun."
              : "Try adjusting your search or category filter."}
          </p>
        </div>
      )}

      {/* Live Email Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg border border-border-hairline w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden rounded-sm"
            >
              {/* Modal Header */}
              <div className="p-4 px-6 border-b border-border-hairline flex justify-between items-center bg-surface shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-burgundy bg-burgundy/10 px-2 py-0.5 border border-burgundy/20">
                    {previewTemplate.category}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-ink truncate max-w-md">
                    {previewTemplate.name}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {/* Device Toggles */}
                  <div className="flex items-center border border-border-hairline rounded-sm overflow-hidden bg-bg">
                    <button
                      onClick={() => setPreviewDevice("desktop")}
                      className={cn(
                        "p-1.5 px-3 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer",
                        previewDevice === "desktop"
                          ? "bg-burgundy text-white"
                          : "text-ink/60 hover:text-ink"
                      )}
                    >
                      <Monitor size={14} /> Desktop
                    </button>
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={cn(
                        "p-1.5 px-3 flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer",
                        previewDevice === "mobile"
                          ? "bg-burgundy text-white"
                          : "text-ink/60 hover:text-ink"
                      )}
                    >
                      <Smartphone size={14} /> Mobile
                    </button>
                  </div>

                  <Link
                    to={`/campaigns?templateId=${previewTemplate.id}`}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                  >
                    <span>{language === "tr" ? "Bu Şablonla Başla" : "Use This Template"}</span>
                    <span>→</span>
                  </Link>

                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="p-1.5 text-ink/40 hover:text-burgundy hover:bg-surface transition-colors rounded-sm cursor-pointer"
                    aria-label="Close preview"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Simulated Email Envelope Header */}
              <div className="bg-surface/80 border-b border-border-hairline px-6 py-2 text-xs text-ink/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-ink/60">
                    <span className="font-bold uppercase tracking-wider text-[9px] text-ink/40">
                      {language === "tr" ? "KİMDEN:" : "FROM:"}
                    </span>
                    <strong className="text-ink font-mono">
                      SIGNAL • ABC COMPANY &lt;newsletter@abccompany.test&gt;
                    </strong>
                  </span>
                  <span className="hidden sm:flex items-center gap-1.5 text-ink/60">
                    <span className="font-bold uppercase tracking-wider text-[9px] text-ink/40">
                      {language === "tr" ? "KİME:" : "TO:"}
                    </span>
                    <strong className="text-ink font-mono">
                      {language === "tr"
                        ? "Ahmet Yılmaz <ahmet.yilmaz@abccompany.test>"
                        : "Sarah Jenkins <sarah.j@example.com>"}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <Sparkles size={11} />
                  <span>
                    {language === "tr"
                      ? "Dinamik Etiketler Çözümlendi (Liquid)"
                      : "Dynamic Liquid Variables Resolved"}
                  </span>
                </div>
              </div>

              {/* Modal Body / Iframe Viewport */}
              <div className="flex-1 overflow-y-auto p-8 bg-[#EBE7DF] flex justify-center items-start">
                <div
                  className={cn(
                    "bg-white shadow-xl transition-all duration-300 overflow-hidden relative",
                    previewDevice === "desktop"
                      ? "w-full max-w-[640px] rounded-md"
                      : "w-[375px] border-[8px] border-[#2C2B29] rounded-[28px]"
                  )}
                >
                  {isRenderingPreview ? (
                    <div className="h-[560px] flex items-center justify-center text-xs text-ink/50 bg-white">
                      <span>
                        {language === "tr"
                          ? "Şablon derleniyor..."
                          : "Compiling template preview..."}
                      </span>
                    </div>
                  ) : (
                    <iframe
                      title="Template Preview"
                      srcDoc={renderedPreviewHtml || previewTemplate.content}
                      className="w-full min-h-[580px] border-0 block"
                      sandbox="allow-same-origin"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Templates;
