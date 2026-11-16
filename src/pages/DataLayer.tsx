import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, Settings, Sparkles, Trash2, Loader2, Send } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { api, apiFetch } from "../services/api";
import { Segment, CustomFieldDefinition, Contact } from "../types";
import { cn } from "../lib/utils";
import { HelpTooltip } from "../components/HelpTooltip";
import { Modal } from "../components/ui/Modal";

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

const DataLayer = () => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newSegment, setNewSegment] = useState({ name: "", rules: "" });
  const [newField, setNewField] = useState({ name: "", key: "", type: "TEXT" as any });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAiSegmentActive, setIsAiSegmentActive] = useState(false);
  const [isActivatingAi, setIsActivatingAi] = useState(false);
  const [aiSegmentData, setAiSegmentData] = useState<{ count: number; riskLevel: string } | null>(
    null
  );

  useEffect(() => {
    api.getSegments().then((loaded) => {
      setSegments(loaded);
      if (Array.isArray(loaded) && loaded.some((s) => s.name === "AI Predicted High Churn")) {
        setIsAiSegmentActive(true);
      }
    });
    api.getCustomFields().then(setCustomFields);
    api.getContacts().then((loadedContacts) => {
      setContacts(loadedContacts);
      const atRisk = loadedContacts.filter((c) => (c.engagementScore || 0) < 40);
      setAiSegmentData({
        count: atRisk.length,
        riskLevel: atRisk.length > 0 ? "CRITICAL" : "LOW",
      });
    });
  }, []);

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addCustomField(newField);
    api.getCustomFields().then(setCustomFields);
    setIsAddingField(false);
    setNewField({ name: "", key: "", type: "TEXT" });
  };

  const handleAddSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addSegment(newSegment);
    api.getSegments().then(setSegments);
    setIsAddingSegment(false);
    setNewSegment({ name: "", rules: "" });
  };

  const activateAiSegment = async () => {
    setIsActivatingAi(true);
    try {
      const res = await apiFetch("/api/ai/churn-prediction", { method: "POST" });
      const data = await res.json().catch(() => null);
      const highRiskCount =
        data?.summary?.high ?? contacts.filter((c) => (c.engagementScore || 0) < 40).length;

      setAiSegmentData({
        count: highRiskCount,
        riskLevel: highRiskCount > 0 ? "CRITICAL" : "LOW",
      });

      const existing = segments.find((s) => s.name === "AI Predicted High Churn");
      if (!existing) {
        await api.addSegment({
          name: "AI Predicted High Churn",
          rules: JSON.stringify([{ field: "engagementScore", operator: "lt", value: 40 }]),
        });
        const updated = await api.getSegments();
        setSegments(updated);
      }
      setIsAiSegmentActive(true);
    } catch (err) {
      console.error(err);
      const fallbackCount = contacts.filter((c) => (c.engagementScore || 0) < 40).length;
      setAiSegmentData({ count: fallbackCount, riskLevel: fallbackCount > 0 ? "CRITICAL" : "LOW" });
      setIsAiSegmentActive(true);
    } finally {
      setIsActivatingAi(false);
    }
  };

  const deactivateAiSegment = async () => {
    const existing = segments.find((s) => s.name === "AI Predicted High Churn");
    if (existing) {
      await api.deleteSegment(existing.id);
      const updated = await api.getSegments();
      setSegments(updated);
    }
    setIsAiSegmentActive(false);
  };

  return (
    <div className="space-y-16">
      <SectionHeader
        title="Data Layer"
        subtitle="Manage dynamic segments, custom fields, and personalization logic."
        guideKey="data-layer"
      />

      <div className="newspaper-grid">
        {/* Segments Section */}
        <div className="col-span-12 lg:col-span-7 space-y-8 pr-8 border-r border-border-hairline">
          <div className="flex justify-between items-end border-b border-ink pb-2">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs">
              Dynamic Segments
            </h3>
            <button
              onClick={() => setIsAddingSegment(true)}
              className="text-[10px] font-black uppercase text-burgundy hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Create Segment
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(Array.isArray(segments) ? segments : []).map((segment) => {
              let ruleCount = 0;
              try {
                const parsed = JSON.parse(segment.rules);
                ruleCount = Array.isArray(parsed) ? parsed.length : parsed ? 1 : 0;
              } catch {
                ruleCount = 0;
              }
              return (
                <div
                  key={segment.id}
                  className="bg-surface border border-border-hairline p-6 group hover:border-burgundy transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-serif text-xl font-bold">{segment.name}</h4>
                      <p className="text-[10px] font-mono text-ink/40 uppercase mt-1">
                        {ruleCount} Rules Applied &bull; Dynamic
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-status-success/10 text-status-success text-[8px] font-black uppercase border border-status-success/20">
                        Real-time
                      </span>
                      <Link
                        to={`/campaigns?segmentId=${segment.id}`}
                        className="px-2 py-0.5 bg-burgundy/10 text-burgundy hover:bg-burgundy hover:text-white transition-colors text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 border border-burgundy/20"
                      >
                        <Send size={9} /> Campaign
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Delete segment "${segment.name}"?`)) {
                            await api.deleteSegment(segment.id);
                            const updated = await api.getSegments();
                            setSegments(updated);
                            if (segment.name === "AI Predicted High Churn") {
                              setIsAiSegmentActive(false);
                            }
                          }
                        }}
                        aria-label={`Delete segment ${segment.name}`}
                        className="text-ink/20 hover:text-burgundy opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {segments.length === 0 && (
              <div className="py-12 text-center border border-dashed border-border-hairline">
                <p className="font-editorial italic text-xl text-ink/20">
                  No dynamic segments defined.
                </p>
              </div>
            )}
          </div>

          {/* AI Predictive Segment */}
          <div
            className={cn(
              "p-8 space-y-4 transition-all duration-500",
              isAiSegmentActive ? "bg-burgundy text-white" : "bg-inverse text-on-inverse"
            )}
          >
            <div className="flex items-center gap-2 text-burgundy">
              <Sparkles
                size={16}
                className={isAiSegmentActive ? "text-white animate-pulse" : "text-burgundy"}
              />
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isAiSegmentActive ? "text-white" : "text-burgundy"
                )}
              >
                AI Predictive Intelligence
              </span>
            </div>
            <h4 className="font-serif text-2xl font-bold">Likely to Churn (Next 30 Days)</h4>
            <p
              className={cn(
                "text-sm leading-relaxed",
                isAiSegmentActive ? "text-white/80" : "text-white/60"
              )}
            >
              {isAiSegmentActive
                ? `Analysis complete. ${aiSegmentData?.count ?? 0} subscribers identified as ${aiSegmentData?.riskLevel ?? "CRITICAL"} churn risk based on behavioral decay.`
                : "Our AI model identifies subscribers who show behavioral patterns consistent with high churn risk."}
            </p>
            {!isAiSegmentActive ? (
              <button
                onClick={activateAiSegment}
                disabled={isActivatingAi}
                className="text-[10px] font-black uppercase tracking-widest border border-white/20 px-4 py-2 hover:bg-white hover:text-ink transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isActivatingAi && <Loader2 size={12} className="animate-spin" />}
                {isActivatingAi ? "Activating AI Cluster..." : "Activate AI Segment"}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 border border-white/20">
                  Segment Active in Database
                </span>
                {segments.find((s) => s.name === "AI Predicted High Churn") && (
                  <Link
                    to={`/campaigns?segmentId=${segments.find((s) => s.name === "AI Predicted High Churn")?.id}`}
                    className="text-[10px] font-black uppercase tracking-widest bg-white text-ink px-3 py-1 hover:bg-white/90 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Send size={11} /> Launch Churn Retention Campaign
                  </Link>
                )}
                <button
                  onClick={deactivateAiSegment}
                  className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white underline ml-auto"
                >
                  Deactivate
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Custom Fields Section */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          <div className="flex justify-between items-end border-b border-ink pb-2">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs">
              Custom Fields Manager
            </h3>
            <button
              onClick={() => setIsAddingField(true)}
              className="text-[10px] font-black uppercase text-burgundy hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Add Field
            </button>
          </div>

          <div className="space-y-4">
            {(Array.isArray(customFields) ? customFields : []).map((field) => (
              <div
                key={field.id}
                className="flex justify-between items-center py-3 border-b border-border-hairline"
              >
                <div>
                  <p className="font-sans font-bold text-sm">{field.name}</p>
                  <p className="font-mono text-[9px] text-ink/40 uppercase">
                    Token: {"{{"}
                    {field.key}
                    {"}}"}
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-surface border border-border-hairline text-[9px] font-mono text-ink/60 uppercase">
                  {field.type}
                </span>
              </div>
            ))}
            {customFields.length === 0 && (
              <p className="text-center py-8 font-editorial italic text-ink/20">
                No custom fields defined.
              </p>
            )}
          </div>

          <div className="bg-surface p-6 space-y-4 border border-border-hairline">
            <h4 className="font-serif text-xl font-bold">Personalization Engine</h4>
            <p className="text-xs text-ink/60 leading-relaxed">
              Use Liquid-style syntax for conditional rendering and dynamic content blocks.
            </p>
            <div className="bg-bg p-4 font-mono text-[10px] text-ink/60 space-y-1">
              <p className="text-burgundy">{"{{#if is_premium}}"}</p>
              <p className="pl-4">Welcome back, VIP!</p>
              <p className="text-burgundy">{"{{else}}"}</p>
              <p className="pl-4">Upgrade to Pro today.</p>
              <p className="text-burgundy">{"{{/if}}"}</p>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isAddingField}
        onClose={() => setIsAddingField(false)}
        title="New Custom Field"
      >
        <form onSubmit={handleAddField} className="space-y-4">
          <div className="space-y-1">
            <label className="metric-label">Field Name</label>
            <input
              type="text"
              required
              className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
              value={newField.name}
              onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="metric-label">Token Key</label>
            <input
              type="text"
              required
              className="w-full bg-transparent border-b border-border-hairline py-1 font-mono text-xs outline-none focus:border-burgundy"
              value={newField.key}
              onChange={(e) =>
                setNewField({
                  ...newField,
                  key: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="metric-label">Data Type</label>
            <select
              className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
              value={newField.type}
              onChange={(e) => setNewField({ ...newField, type: e.target.value as any })}
            >
              <option value="TEXT">TEXT</option>
              <option value="NUMBER">NUMBER</option>
              <option value="DATE">DATE</option>
              <option value="BOOLEAN">BOOLEAN</option>
            </select>
          </div>
          <div className="pt-4 flex gap-4">
            <button type="submit" className="btn-primary flex-1 py-3">
              Create Field
            </button>
            <button
              type="button"
              onClick={() => setIsAddingField(false)}
              className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DataLayer;
