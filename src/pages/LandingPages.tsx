import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  LayoutTemplate,
  ExternalLink,
  Code,
  Edit,
  Trash2,
  Copy,
  Eye,
  X,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle2,
  FileText,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router";
import { cn } from "../lib/utils";
import { HelpTooltip } from "../components/HelpTooltip";
import FormBuilder, { type PublishedForm } from "../components/FormBuilder";
import { useLanguage } from "../contexts/LanguageContext";
import { apiFetch } from "../services/api";
import { LANDING_PAGE_TEMPLATES, FormTemplateItem } from "../data/formTemplates";
import FormSubmissionsModal from "../components/FormSubmissionsModal";

export default function LandingPages() {
  const { t, language } = useLanguage();
  const [pages, setPages] = useState<PublishedForm[]>([]);
  const [activeTab, setActiveTab] = useState<"my_pages" | "templates">("my_pages");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<PublishedForm | null>(null);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [submissionsForm, setSubmissionsForm] = useState<PublishedForm | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplateItem | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const loadPages = () => {
    apiFetch("/api/forms")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          // Filter to only landing pages
          setPages(data.filter((f) => f.type === "landing_page"));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleCreateNew = (template?: FormTemplateItem) => {
    if (template) {
      setEditingPage({
        id: "",
        name: template.name,
        type: "landing_page",
        status: "active",
        views: 0,
        submissions: 0,
        conversionRate: 0,
        createdAt: new Date().toISOString(),
        elements: template.elements,
      });
    } else {
      setEditingPage(null);
    }
    setPreviewTemplate(null);
    setIsBuilderOpen(true);
  };

  const handlePublished = (form: PublishedForm) => {
    setIsBuilderOpen(false);
    setEditingPage(null);
    loadPages();
    setActiveTab("my_pages");
  };

  const handleEdit = (page: PublishedForm) => {
    setEditingPage(page);
    setIsBuilderOpen(true);
  };

  const handleCopyUrl = async (page: PublishedForm) => {
    try {
      const liveUrl = `${window.location.origin}/f/${page.id}`;
      await navigator.clipboard.writeText(liveUrl);
      setCopiedUrlId(page.id);
      setTimeout(() => setCopiedUrlId(null), 2000);
    } catch {
      alert("Failed to copy URL.");
    }
  };

  const handleDelete = async (page: PublishedForm) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${page.name}"?`);
    if (!confirmed) return;

    try {
      const response = await apiFetch(`/api/forms/${encodeURIComponent(page.id)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setPages((current) => current.filter((p) => p.id !== page.id));
      }
    } catch {
      alert("An error occurred while deleting the page.");
    }
  };

  if (isBuilderOpen) {
    return (
      <FormBuilder
        initialType="landing_page"
        initialForm={editingPage}
        onBack={() => {
          setIsBuilderOpen(false);
          setEditingPage(null);
        }}
        onPublished={handlePublished}
      />
    );
  }

  const categories = [
    { id: "ALL", label: "All", en: "All" },
    { id: "Sales & Enterprise", label: "Sales & Demo", en: "Sales & Demo" },
    { id: "Events & Webinars", label: "Webinar & Event", en: "Webinar & Event" },
    { id: "Lead Magnet & Content", label: "E-Book & Whitepaper", en: "Whitepaper" },
    { id: "Waitlist & Pre-Launch", label: "Early Access (Waitlist)", en: "Waitlist" },
    { id: "Partnerships", label: "Partnerships", en: "Partnership" },
  ];

  const filteredTemplates =
    selectedCategory === "ALL"
      ? LANDING_PAGE_TEMPLATES
      : LANDING_PAGE_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className="space-y-8">
      {submissionsForm && (
        <FormSubmissionsModal form={submissionsForm} onClose={() => setSubmissionsForm(null)} />
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end pb-4 border-b border-border-hairline gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-ink leading-tight">
              {language === "tr" ? "Açılış Sayfaları (Landing Pages)" : "Hosted Landing Pages"}
            </h1>
            <HelpTooltip guideKey="landing_pages_overview" />
          </div>
          <p className="text-base sm:text-lg font-editorial italic text-ink/60">
            {language === "tr"
              ? "Yüksek dönüşümlü bağımsız web sayfaları yayınlayın, barındırın ve formlarınızı tek tıkla gömün."
              : "Publish hosted high-converting standalone web pages and easily embed your Signal forms."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => handleCreateNew()} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            <span>{language === "tr" ? "Yeni Landing Page" : "New Landing Page"}</span>
          </button>
        </div>
      </header>

      {/* Embedded Form Integration Callout */}
      <div className="bg-surface/70 border border-border-hairline p-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-burgundy/10 border border-burgundy/20 flex items-center justify-center text-burgundy shrink-0">
            <Code size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-ink flex items-center gap-1.5">
              <span>Smart Form Embedding Enabled</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.5 rounded">
                ACTIVE
              </span>
            </p>
            <p className="text-[11px] text-ink/60">
              Easily embed any form created under Forms & Pop-ups directly into your landing pages
              with a single click.
            </p>
          </div>
        </div>
        <Link
          to="/forms"
          className="text-xs font-bold uppercase tracking-wider text-burgundy hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Manage Forms</span>
          <span>→</span>
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-8 border-b border-border-hairline">
        <button
          onClick={() => setActiveTab("my_pages")}
          className={cn(
            "pb-3 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === "my_pages" ? "text-burgundy" : "text-ink/40 hover:text-ink"
          )}
        >
          <LayoutTemplate size={14} />
          <span>My Landing Pages</span>
          <span className="bg-ink/10 text-ink/70 text-[10px] px-2 py-0.5 rounded-full">
            {pages.length}
          </span>
          {activeTab === "my_pages" && (
            <motion.div
              layoutId="lpTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-burgundy"
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={cn(
            "pb-3 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2",
            activeTab === "templates" ? "text-burgundy" : "text-ink/40 hover:text-ink"
          )}
        >
          <Sparkles size={14} />
          <span>Landing Page Templates</span>
          <span className="bg-burgundy/10 text-burgundy text-[10px] font-bold px-2 py-0.5 rounded-full">
            {LANDING_PAGE_TEMPLATES.length} Ready
          </span>
          {activeTab === "templates" && (
            <motion.div
              layoutId="lpTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-burgundy"
            />
          )}
        </button>
      </div>

      {/* Tab 1: My Landing Pages */}
      {activeTab === "my_pages" && (
        <div className="space-y-6">
          {pages.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-border-hairline bg-surface/30">
              <LayoutTemplate size={40} className="mx-auto text-ink/20 mb-4" />
              <p className="font-editorial italic text-3xl text-ink/40 mb-2">
                No landing pages published yet.
              </p>
              <p className="text-xs text-ink/50 mb-6">
                Start from scratch or pick a ready-to-use template to launch in minutes.
              </p>
              <div className="flex justify-center gap-4">
                <button onClick={() => handleCreateNew()} className="btn-primary text-xs py-2 px-4">
                  Create from Scratch
                </button>
                <button
                  onClick={() => setActiveTab("templates")}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Explore Templates
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-border-hairline overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-hairline text-[10px] font-black uppercase tracking-widest text-ink/40 bg-surface/50">
                    <th className="py-4 px-6">Page Name</th>
                    <th className="py-4 px-6">Live URL</th>
                    <th className="py-4 px-6 text-center">Views</th>
                    <th className="py-4 px-6 text-center">Submissions</th>
                    <th className="py-4 px-6 text-center">Conversion</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-hairline text-sm">
                  {pages.map((page) => (
                    <tr key={page.id} className="hover:bg-bg/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-ink flex items-center gap-2">
                          <LayoutTemplate size={16} className="text-burgundy shrink-0" />
                          <span>{page.name}</span>
                        </div>
                        <div className="text-[11px] text-ink/40 mt-0.5">
                          {new Date(page.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs">
                        <a
                          href={`/f/${page.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-burgundy hover:underline flex items-center gap-1.5"
                        >
                          <span>/f/{page.id}</span>
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-xs text-ink/70">
                        {page.views}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setSubmissionsForm(page)}
                          className="font-mono text-xs font-bold text-burgundy hover:underline"
                        >
                          {page.submissions}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-xs font-bold text-status-success">
                        {page.conversionRate?.toFixed(1) || "0.0"}%
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyUrl(page)}
                            className="p-1.5 text-ink/40 hover:text-ink transition-colors"
                            title="Copy Live Link"
                          >
                            {copiedUrlId === page.id ? (
                              <CheckCircle2 size={16} className="text-emerald-600" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(page)}
                            className="p-1.5 text-ink/40 hover:text-burgundy transition-colors"
                            title="Edit Page"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(page)}
                            className="p-1.5 text-ink/40 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Landing Page Templates Gallery */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all shrink-0",
                  selectedCategory === cat.id
                    ? "bg-burgundy text-white shadow-sm"
                    : "bg-surface hover:bg-bg text-ink/70 hover:text-ink border border-border-hairline"
                )}
              >
                {language === "tr" ? cat.label : cat.en}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-surface border border-border-hairline p-6 flex flex-col justify-between hover:border-burgundy/50 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black uppercase tracking-widest text-burgundy bg-burgundy/10 px-2 py-0.5 border border-burgundy/20 rounded-sm">
                      {template.category}
                    </span>
                    <span className="text-[9px] font-mono text-ink/40 uppercase">
                      {template.elements.length} Elements
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-ink leading-snug">
                    {template.name}
                  </h3>

                  <p className="text-xs text-ink/60 line-clamp-3 leading-relaxed">
                    {template.description}
                  </p>

                  {/* Visual Preview Box */}
                  <div className="mt-4 p-4 bg-white border border-border-hairline/60 rounded-sm space-y-2 select-none pointer-events-none opacity-90">
                    <div className="h-3 w-1/3 bg-burgundy/20 rounded-xs" />
                    <div className="h-4 w-4/5 bg-ink/80 rounded-xs" />
                    <div className="h-2.5 w-full bg-ink/20 rounded-xs" />
                    <div className="pt-2 flex flex-col gap-1.5">
                      <div className="h-6 w-full border border-neutral-300 rounded-xs bg-neutral-50 px-2 flex items-center text-[9px] text-neutral-400">
                        Work email...
                      </div>
                      <div className="h-6 w-full bg-burgundy text-white rounded-xs flex items-center justify-center text-[10px] font-bold">
                        Get Started Now →
                      </div>
                    </div>
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
                  <button
                    type="button"
                    onClick={() => handleCreateNew(template)}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <span>{language === "tr" ? "Bu Şablonla Başla" : "Use Template"}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-bg border border-border-hairline w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-surface border-b border-border-hairline p-4 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-serif font-bold text-lg text-ink">{previewTemplate.name}</h3>
                  <span className="text-[10px] uppercase font-bold text-burgundy">
                    {previewTemplate.category}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-surface border border-border-hairline rounded-sm overflow-hidden p-0.5">
                    <button
                      onClick={() => setPreviewDevice("desktop")}
                      className={cn(
                        "px-3 py-1 text-xs font-bold flex items-center gap-1",
                        previewDevice === "desktop" ? "bg-burgundy text-white" : "text-ink/60"
                      )}
                    >
                      <Monitor size={13} /> Desktop
                    </button>
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={cn(
                        "px-3 py-1 text-xs font-bold flex items-center gap-1",
                        previewDevice === "mobile" ? "bg-burgundy text-white" : "text-ink/60"
                      )}
                    >
                      <Smartphone size={13} /> Mobile
                    </button>
                  </div>
                  <button
                    onClick={() => handleCreateNew(previewTemplate)}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <span>{language === "tr" ? "Bu Şablonu Kullan" : "Use This Template"}</span>
                    <span>→</span>
                  </button>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="text-ink/40 hover:text-ink p-1.5"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body / Canvas Preview */}
              <div className="flex-1 overflow-y-auto p-8 bg-[#EBE7DF] flex justify-center items-start">
                <div
                  className={cn(
                    "bg-white shadow-xl p-8 transition-all overflow-hidden",
                    previewDevice === "desktop"
                      ? "w-full max-w-2xl rounded-md"
                      : "w-[360px] border-[6px] border-[#2C2B29] rounded-[24px]"
                  )}
                >
                  <div className="space-y-4">
                    {previewTemplate.elements.map((el) => {
                      if (el.type === "text") {
                        return (
                          <div key={el.id} style={el.style}>
                            {el.content}
                          </div>
                        );
                      }
                      if (el.type === "input") {
                        return (
                          <input
                            key={el.id}
                            type="text"
                            placeholder={el.placeholder}
                            style={el.style}
                            disabled
                            className="opacity-90"
                          />
                        );
                      }
                      if (el.type === "button") {
                        return (
                          <button key={el.id} type="button" style={el.style} disabled>
                            {el.content}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
