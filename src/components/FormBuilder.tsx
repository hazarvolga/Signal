import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Settings,
  Eye,
  Layout,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  AlignLeft,
  Palette,
  Trash2,
  X,
  Loader2,
  Mail,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";
import { apiFetch } from "../services/api";

export interface PublishedForm {
  id: string;
  name: string;
  type: "popup" | "landing_page";
  status: "active" | "draft" | "archived";
  views: number;
  submissions: number;
  conversionRate: number;
  createdAt: string;
  url?: string;
  elements?: FormElement[];
  welcomeCampaignId?: string | null;
  leadMagnetUrl?: string | null;
  redirectUrl?: string | null;
}

interface FormBuilderProps {
  onBack: () => void;
  onPublished: (form: PublishedForm) => void;
  initialType?: "popup" | "landing_page";
  initialForm?: PublishedForm | null;
}

type ElementType = "text" | "input" | "button" | "image" | "spacer" | "embedded_form";

export interface FormElement {
  id: string;
  type: ElementType;
  content?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

interface FormCanvasProps {
  elements: FormElement[];
  interactive?: boolean;
  selectedElementId?: string | null;
  onSelect?: (id: string) => void;
}

function FormCanvas({
  elements,
  interactive = false,
  selectedElementId = null,
  onSelect,
}: FormCanvasProps) {
  return (
    <>
      {elements.map((element) => (
        <div
          key={element.id}
          onClick={interactive ? () => onSelect?.(element.id) : undefined}
          className={cn(
            "relative border-2 border-transparent",
            interactive && "group cursor-pointer hover:border-burgundy/30 transition-colors",
            interactive && selectedElementId === element.id && "border-burgundy border-dashed"
          )}
        >
          {element.type === "text" && <div style={element.style}>{element.content}</div>}
          {element.type === "input" && (
            <input
              type="text"
              placeholder={element.placeholder}
              aria-label={element.placeholder || "Form input"}
              style={element.style}
              readOnly
            />
          )}
          {element.type === "button" && (
            <button type="button" style={element.style}>
              {element.content}
            </button>
          )}
          {element.type === "image" && (
            <div
              style={{
                ...element.style,
                backgroundColor: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "150px",
              }}
            >
              <ImageIcon className="text-black/30" />
            </div>
          )}
          {element.type === "embedded_form" && (
            <div
              style={{
                ...element.style,
                backgroundColor: "#faf9f6",
                border: "2px dashed #800020",
                borderRadius: "8px",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div className="flex items-center justify-center gap-2 text-burgundy font-bold text-sm mb-1">
                <Layout size={16} />
                <span>Embedded Signal Form</span>
              </div>
              <p className="text-xs text-ink/60 font-mono">
                Target Form: {element.content || element.placeholder || "No ID specified"}
              </p>
              <div className="mt-3 max-w-sm mx-auto space-y-2 opacity-50 pointer-events-none">
                <div className="h-8 bg-white border border-neutral-300 rounded px-2 flex items-center text-[11px] text-neutral-400">
                  Email address...
                </div>
                <div className="h-8 bg-burgundy/80 text-white rounded flex items-center justify-center text-xs font-bold">
                  Submit
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default function FormBuilder({
  onBack,
  onPublished,
  initialType = "landing_page",
  initialForm = null,
}: FormBuilderProps) {
  const [formName, setFormName] = useState(initialForm?.name || "Untitled Form");
  const [elements, setElements] = useState<FormElement[]>(
    initialForm?.elements?.length
      ? initialForm.elements
      : [
          {
            id: "1",
            type: "text",
            content: "Join Our Newsletter",
            style: {
              fontSize: "24px",
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "16px",
            },
          },
          {
            id: "2",
            type: "text",
            content: "Get the latest updates directly to your inbox.",
            style: { fontSize: "16px", textAlign: "center", marginBottom: "24px", color: "#666" },
          },
          {
            id: "3",
            type: "input",
            placeholder: "Enter your email address",
            style: {
              width: "100%",
              padding: "12px",
              marginBottom: "16px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            },
          },
          {
            id: "4",
            type: "button",
            content: "Subscribe Now",
            style: {
              width: "100%",
              padding: "12px",
              backgroundColor: "#000",
              color: "#fff",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
            },
          },
        ]
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"build" | "design" | "settings">("build");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [welcomeCampaignId, setWelcomeCampaignId] = useState<string>(
    initialForm?.welcomeCampaignId || ""
  );
  const [leadMagnetUrl, setLeadMagnetUrl] = useState<string>(initialForm?.leadMagnetUrl || "");
  const [redirectUrl, setRedirectUrl] = useState<string>(initialForm?.redirectUrl || "");
  const [availableCampaigns, setAvailableCampaigns] = useState<
    Array<{ id: string; name: string; subject: string }>
  >([]);

  useEffect(() => {
    apiFetch("/api/campaigns")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableCampaigns(
            data.map((c: any) => ({ id: c.id, name: c.name, subject: c.subject }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPreviewOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isPreviewOpen]);

  const addElement = (type: ElementType) => {
    const newElement: FormElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content:
        type === "text"
          ? "New Text Block"
          : type === "button"
            ? "Click Me"
            : type === "embedded_form"
              ? ""
              : "",
      placeholder:
        type === "input"
          ? "Enter text..."
          : type === "embedded_form"
            ? "Target Form ID or Slug"
            : "",
      style: {
        padding: "8px",
        marginBottom: "16px",
        width: type === "input" || type === "button" || type === "embedded_form" ? "100%" : "auto",
      },
    };
    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<FormElement>) => {
    setElements(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  const handlePublish = async () => {
    const normalizedName = formName.trim();
    if (!normalizedName) {
      setSaveError("Enter a form name before publishing.");
      return;
    }
    if (elements.length === 0) {
      setSaveError("Add at least one element before publishing.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const endpoint = initialForm
        ? `/api/forms/${encodeURIComponent(initialForm.id)}`
        : "/api/forms";
      const response = await apiFetch(endpoint, {
        method: initialForm ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: normalizedName,
          type: initialType,
          elements,
          welcomeCampaignId: welcomeCampaignId.trim() || null,
          leadMagnetUrl: leadMagnetUrl.trim() || null,
          redirectUrl: redirectUrl.trim() || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload && typeof payload.error === "string" ? payload.error : "Unable to publish form."
        );
      }
      onPublished(payload as PublishedForm);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to publish form.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col h-screen">
      {/* Header */}
      <header className="h-16 border-b border-border-hairline bg-bg flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-bg rounded-full transition-colors">
            <ArrowLeft size={20} className="text-ink/70" />
          </button>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
            aria-label="Form Name"
          />
          <span className="text-xs font-bold uppercase tracking-wider bg-burgundy/10 text-burgundy px-2 py-1 rounded">
            {initialType === "landing_page" ? "Landing Page" : "Pop-up"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-ink/70 hover:bg-surface transition-colors"
          >
            <Eye size={16} />
            Preview
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isSaving}
            aria-busy={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-burgundy text-white text-sm font-bold hover:bg-burgundy/90 transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? "Publishing..." : "Save & Publish"}
          </button>
        </div>
      </header>

      {saveError && (
        <div
          role="alert"
          className="bg-red-50 text-red-800 border-b border-red-200 px-6 py-3 text-sm font-bold"
        >
          {saveError}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <aside className="w-64 border-r border-border-hairline bg-bg flex flex-col shrink-0">
          <div className="flex border-b border-border-hairline">
            <button
              onClick={() => setActiveTab("build")}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
                activeTab === "build"
                  ? "border-burgundy text-burgundy"
                  : "border-transparent text-ink/50 hover:text-ink"
              )}
            >
              Build
            </button>
            <button
              onClick={() => setActiveTab("design")}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
                activeTab === "design"
                  ? "border-burgundy text-burgundy"
                  : "border-transparent text-ink/50 hover:text-ink"
              )}
            >
              Design
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={cn(
                "flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
                activeTab === "settings"
                  ? "border-burgundy text-burgundy"
                  : "border-transparent text-ink/50 hover:text-ink"
              )}
            >
              Settings
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {activeTab === "build" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink/50 mb-3">
                    Add Elements
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => addElement("text")}
                      className="flex flex-col items-center gap-2 p-3 border border-border-hairline rounded hover:border-burgundy hover:text-burgundy transition-colors"
                    >
                      <Type size={20} />
                      <span className="text-xs font-medium">Text</span>
                    </button>
                    <button
                      onClick={() => addElement("input")}
                      className="flex flex-col items-center gap-2 p-3 border border-border-hairline rounded hover:border-burgundy hover:text-burgundy transition-colors"
                    >
                      <AlignLeft size={20} />
                      <span className="text-xs font-medium">Input</span>
                    </button>
                    <button
                      onClick={() => addElement("button")}
                      className="flex flex-col items-center gap-2 p-3 border border-border-hairline rounded hover:border-burgundy hover:text-burgundy transition-colors"
                    >
                      <MousePointerClick size={20} />
                      <span className="text-xs font-medium">Button</span>
                    </button>
                    <button
                      onClick={() => addElement("image")}
                      className="flex flex-col items-center gap-2 p-3 border border-border-hairline rounded hover:border-burgundy hover:text-burgundy transition-colors"
                    >
                      <ImageIcon size={20} />
                      <span className="text-xs font-medium">Image</span>
                    </button>
                    <button
                      onClick={() => addElement("embedded_form")}
                      className="flex flex-col items-center gap-2 p-3 border border-burgundy/40 bg-burgundy/5 rounded hover:border-burgundy hover:bg-burgundy/10 transition-colors col-span-2 text-burgundy"
                    >
                      <Layout size={20} />
                      <span className="text-xs font-bold">Add Embedded Form</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "design" && (
              <div className="space-y-6">
                <div className="text-sm text-ink/70">
                  Global design settings will go here (colors, fonts, background).
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink/70 mb-2 flex items-center gap-1.5">
                    <Mail size={14} className="text-burgundy" />
                    <span>Welcome Email & Lead Magnet</span>
                  </h4>
                  <p className="text-[11px] text-ink/60 mb-3 leading-relaxed">
                    Configure an automated email campaign and deliverable download link upon form
                    submission.
                  </p>

                  <label className="block text-xs font-medium text-ink/80 mb-1">
                    Trigger Email Campaign / Template:
                  </label>
                  <select
                    value={welcomeCampaignId}
                    onChange={(e) => setWelcomeCampaignId(e.target.value)}
                    className="w-full p-2 border border-border-hairline rounded text-xs bg-bg"
                  >
                    <option value="">-- Do not trigger automated email --</option>
                    {availableCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.subject})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink/80 mb-1">
                    Lead Magnet Download URL (PDF / File Link):
                  </label>
                  <input
                    type="url"
                    value={leadMagnetUrl}
                    onChange={(e) => setLeadMagnetUrl(e.target.value)}
                    placeholder="https://example.com/guide.pdf"
                    className="w-full p-2 border border-border-hairline rounded text-xs"
                  />
                  <p className="text-[10px] text-ink/50 mt-1">
                    Appears as an instant "Download Now" action on the success screen and inside the
                    welcome email.
                  </p>
                </div>

                <div className="pt-4 border-t border-border-hairline">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink/70 mb-2 flex items-center gap-1.5">
                    <ExternalLink size={14} className="text-burgundy" />
                    <span>Post-Submission Redirect</span>
                  </h4>
                  <label className="block text-xs font-medium text-ink/80 mb-1">
                    Redirect URL:
                  </label>
                  <input
                    type="url"
                    value={redirectUrl}
                    onChange={(e) => setRedirectUrl(e.target.value)}
                    placeholder="https://yoursite.com/thank-you or /thank-you"
                    className="w-full p-2 border border-border-hairline rounded text-xs"
                  />
                  <p className="text-[10px] text-ink/50 mt-1">
                    If configured, visitors are automatically redirected 3 seconds after seeing the
                    success confirmation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 bg-bg/50 overflow-y-auto p-8 flex justify-center">
          <div
            className={cn(
              "bg-white shadow-xl relative",
              initialType === "popup"
                ? "w-[400px] h-fit rounded-lg mt-20"
                : "w-full max-w-2xl min-h-[800px] rounded-none"
            )}
            style={{ padding: "40px" }}
          >
            <FormCanvas
              elements={elements}
              interactive
              selectedElementId={selectedElementId}
              onSelect={setSelectedElementId}
            />
          </div>
        </main>

        {/* Right Sidebar - Properties */}
        {selectedElement && (
          <aside className="w-72 border-l border-border-hairline bg-bg flex flex-col shrink-0">
            <div className="p-4 border-b border-border-hairline flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Properties</h3>
              <button
                onClick={() => setSelectedElementId(null)}
                className="text-ink/50 hover:text-ink"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {selectedElement.type === "text" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">
                    Content
                  </label>
                  <textarea
                    value={selectedElement.content}
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                    className="w-full p-2 border border-border-hairline rounded text-sm"
                    rows={3}
                  />
                </div>
              )}
              {selectedElement.type === "input" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={selectedElement.placeholder}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { placeholder: e.target.value })
                    }
                    className="w-full p-2 border border-border-hairline rounded text-sm"
                  />
                </div>
              )}
              {selectedElement.type === "button" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={selectedElement.content}
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                    className="w-full p-2 border border-border-hairline rounded text-sm"
                  />
                </div>
              )}
              {selectedElement.type === "embedded_form" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-2">
                    Target Form ID / Slug
                  </label>
                  <input
                    type="text"
                    value={selectedElement.content || ""}
                    placeholder="e.g. form_id or slug"
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                    className="w-full p-2 border border-border-hairline rounded text-sm font-mono"
                  />
                  <p className="text-[11px] text-ink/50 mt-1 leading-relaxed">
                    Enter the form ID or slug copied from the /forms page. This form will render
                    dynamically on the published page.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-border-hairline">
                <button
                  onClick={() => {
                    setElements(elements.filter((e) => e.id !== selectedElement.id));
                    setSelectedElementId(null);
                  }}
                  className="w-full py-2 text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Element
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 p-4 sm:p-8 flex items-center justify-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-preview-title"
            className="bg-bg border border-border-hairline w-full max-w-5xl max-h-full flex flex-col shadow-2xl"
          >
            <header className="flex items-center justify-between px-5 py-4 border-b border-border-hairline">
              <div>
                <h2 id="form-preview-title" className="text-xl font-bold text-ink">
                  {formName.trim() || "Untitled Form"}
                </h2>
                <p className="text-xs text-ink/60 mt-1">
                  Preview only. Submissions are disabled in the builder.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                aria-label="Close preview"
                className="p-2 text-ink/60 hover:text-ink hover:bg-surface transition-colors"
              >
                <X size={20} />
              </button>
            </header>
            <div className="overflow-y-auto bg-surface p-4 sm:p-10">
              <div
                className={cn(
                  "bg-white text-black mx-auto shadow-xl",
                  initialType === "popup" ? "max-w-md rounded-lg" : "max-w-2xl min-h-[640px]"
                )}
                style={{ padding: "40px" }}
              >
                <FormCanvas elements={elements} />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
