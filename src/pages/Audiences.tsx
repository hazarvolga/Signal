import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  Plus,
  Zap,
  BrainCircuit,
  Upload,
  Trash2,
  Filter,
  AlertTriangle,
  Sparkles,
  Mail,
  Smartphone,
  MessageSquare,
  Bell,
  Settings,
  Check,
  Send,
} from "lucide-react";
import Papa from "papaparse";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { api } from "../services/api";
import { Contact, Segment } from "../types";
import { cn } from "../lib/utils";
import { HelpTooltip } from "../components/HelpTooltip";
import { AiSegmentationModal } from "../components/AiSegmentationModal";
import { Modal } from "../components/ui/Modal";
import { useLanguage } from "../contexts/LanguageContext";

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

const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid editorial signal (email address)"),
  tags: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Audiences = () => {
  const { t } = useLanguage();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [newSegment, setNewSegment] = useState<{ name: string; rules: any[] }>({
    name: "",
    rules: [],
  });
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [isSimulatingEvent, setIsSimulatingEvent] = useState(false);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [preferenceContact, setPreferenceContact] = useState<any>(null);
  const [notificationContact, setNotificationContact] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [churnRisks, setChurnRisks] = useState<Record<string, any>>({});
  const [isPredicting, setIsPredicting] = useState<string | null>(null);
  const [isPredictingAll, setIsPredictingAll] = useState(false);
  const [churnSummary, setChurnSummary] = useState<{
    high: number;
    medium: number;
    low: number;
    topAtRisk: any[];
  } | null>(null);
  const [availableLists, setAvailableLists] = useState<any[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [isAiSegmentationOpen, setIsAiSegmentationOpen] = useState(false);

  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({
    email: "",
    firstName: "",
    lastName: "",
    tags: "",
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(
    null
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      tags: "",
    },
  });

  const watchedEmail = watch("email");

  useEffect(() => {
    api.getContacts().then(setContacts);
    api.getSegments().then(async (segs) => {
      setSegments(segs);
      const counts: Record<string, number> = {};
      for (const seg of segs) {
        counts[seg.id] = seg.contactCount;
      }
      setSegmentCounts(counts);
    });
  }, []);

  useEffect(() => {
    if (activeSegmentId === "CHURN_RISK") {
      api.getContacts().then((all) => {
        setContacts(all.filter((c) => c.engagementScore < 40));
      });
    } else if (activeSegmentId) {
      api.getSegmentContacts(activeSegmentId).then(setContacts);
    } else {
      api.getContacts().then(setContacts);
    }
  }, [activeSegmentId]);

  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addSegment({
      name: newSegment.name,
      rules: JSON.stringify(newSegment.rules),
    });
    const updatedSegments = await api.getSegments();
    setSegments(updatedSegments);

    const counts: Record<string, number> = {};
    for (const seg of updatedSegments) {
      counts[seg.id] = seg.contactCount;
    }
    setSegmentCounts(counts);

    setIsAddingSegment(false);
    setNewSegment({ name: "", rules: [] });
  };

  const addRule = (type: "attribute" | "event") => {
    const rule =
      type === "attribute"
        ? { type: "attribute", field: "status", operator: "equals", value: "SUBSCRIBED" }
        : { type: "event", eventName: "PRODUCT_VIEWED", timeframe: "3d" };
    setNewSegment({ ...newSegment, rules: [...newSegment.rules, rule] });
  };

  const removeRule = (index: number) => {
    const rules = [...newSegment.rules];
    rules.splice(index, 1);
    setNewSegment({ ...newSegment, rules });
  };

  const updateRule = (index: number, updates: any) => {
    const rules = [...newSegment.rules];
    rules[index] = { ...rules[index], ...updates };
    setNewSegment({ ...newSegment, rules });
  };

  const handleSimulateEvent = async () => {
    if (contacts.length === 0) return;
    setIsSimulatingEvent(true);
    const randomContact = contacts[Math.floor(Math.random() * contacts.length)];
    const events = ["PRODUCT_VIEWED", "CART_ABANDONED", "CHECKOUT_STARTED"];
    const eventName = events[Math.floor(Math.random() * events.length)];

    await api.trackBehavioralEvent({
      email: randomContact.email,
      name: eventName,
      properties: { productId: "prod_" + Math.floor(Math.random() * 1000) },
    });

    const counts: Record<string, number> = {};
    for (const seg of segments) {
      const { count } = await api.getSegmentCount(seg.id);
      counts[seg.id] = count;
    }
    setSegmentCounts(counts);
    setIsSimulatingEvent(false);
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleManagePreferences = async (contact: Contact) => {
    const data = await api.getContactPreferences(contact.id);
    setPreferenceContact(data.contact);
    setAvailableLists(data.availableLists);
    setSelectedLists(data.memberships);
  };

  const handleSavePreferences = async () => {
    if (!preferenceContact) return;
    await api.updateContactPreferences(preferenceContact.id, selectedLists);
    setPreferenceContact(null);
    api.getContacts().then(setContacts);
  };

  const handleViewNotifications = async (contact: Contact) => {
    const data = await api.getContactNotifications(contact.id);
    setNotifications(data);
    setNotificationContact(contact);
  };

  const handlePredictChurn = async (contactId: string) => {
    setIsPredicting(contactId);
    try {
      const risk = await api.predictChurn(contactId);
      setChurnRisks((prev) => ({ ...prev, [contactId]: risk }));
    } catch (e) {
      console.error("Churn prediction failed", e);
    } finally {
      setIsPredicting(null);
    }
  };

  const handlePredictAllChurn = async () => {
    setIsPredictingAll(true);
    try {
      const data = await api.getBulkChurnPrediction();
      setChurnSummary(data);
      const newRisks = { ...churnRisks };
      data.topAtRisk.forEach((p: any) => {
        const contact = contacts.find((c) => c.email === p.email);
        if (contact) {
          newRisks[contact.id] = {
            riskLevel: p.risk,
            probability: parseFloat(p.prob) / 100,
            reasons: p.reasons,
          };
        }
      });
      setChurnRisks(newRisks);
    } catch (e) {
      console.error("Bulk churn prediction failed", e);
    } finally {
      setIsPredictingAll(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvHeaders(results.meta.fields || []);
        setCsvData(results.data);

        const fields = results.meta.fields || [];
        const newMapping = { email: "", firstName: "", lastName: "", tags: "" };

        fields.forEach((f) => {
          const lower = f.toLowerCase();
          if (lower.includes("email")) newMapping.email = f;
          else if (lower.includes("first") || lower === "fname") newMapping.firstName = f;
          else if (lower.includes("last") || lower === "lname") newMapping.lastName = f;
          else if (lower.includes("tag")) newMapping.tags = f;
        });

        setCsvMapping(newMapping);
      },
    });
  };

  const handleImportCsv = async () => {
    if (!csvMapping.email) return;

    setIsImporting(true);
    const mappedContacts = csvData
      .map((row) => ({
        email: row[csvMapping.email],
        firstName: csvMapping.firstName ? row[csvMapping.firstName] : "",
        lastName: csvMapping.lastName ? row[csvMapping.lastName] : "",
        tags: csvMapping.tags ? row[csvMapping.tags] : "",
      }))
      .filter((c) => c.email);

    try {
      const result = await api.importContacts(mappedContacts);
      setImportResult(result);
      const updated = await api.getContacts();
      setContacts(updated);
    } catch (e) {
      console.error("Import failed", e);
    } finally {
      setIsImporting(false);
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsValidating(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      await api.addContact(data as any);
      const updated = await api.getContacts();
      setContacts(updated);
      setIsAdding(false);
      reset();
    } catch (err) {
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-12">
      <SectionHeader
        title={t("audiences.title")}
        subtitle={t("audiences.subtitle")}
        guideKey="audience-segments"
        action={
          <div className="flex gap-4">
            {import.meta.env.DEV && (
              <button
                onClick={handleSimulateEvent}
                disabled={isSimulatingEvent}
                className="px-4 py-2 border border-burgundy text-burgundy text-[10px] font-black uppercase tracking-widest hover:bg-burgundy/5 transition-colors flex items-center gap-2"
              >
                <Zap size={14} className={cn(isSimulatingEvent && "animate-pulse")} />
                {isSimulatingEvent ? t("audiences.simulating") : t("audiences.simulateEvent")}
              </button>
            )}
            <button
              onClick={() => setIsAiSegmentationOpen(true)}
              className="px-4 py-2 border border-burgundy text-burgundy text-[10px] font-black uppercase tracking-widest hover:bg-burgundy/5 transition-colors flex items-center gap-2"
            >
              <BrainCircuit size={14} /> {t("audiences.segmentAi")}
            </button>
            <button
              onClick={() => setIsImportingCsv(true)}
              className="px-4 py-2 border border-ink text-ink text-[10px] font-black uppercase tracking-widest hover:bg-ink/5 transition-colors flex items-center gap-2"
            >
              <Upload size={14} /> {t("audiences.importCsv")}
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> {t("audiences.addSubscriber")}
            </button>
          </div>
        }
      />

      <Modal
        isOpen={isAdding}
        onClose={() => {
          setIsAdding(false);
          reset();
        }}
        title="Register New Signal"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="metric-label">First Name</label>
              <input
                type="text"
                {...register("firstName")}
                className={cn(
                  "w-full bg-transparent border-b py-1 font-sans font-bold text-sm outline-none transition-colors",
                  errors.firstName
                    ? "border-burgundy"
                    : "border-border-hairline focus:border-burgundy"
                )}
              />
              {errors.firstName && (
                <p className="text-[10px] text-burgundy font-mono uppercase mt-1">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="metric-label">Last Name</label>
              <input
                type="text"
                {...register("lastName")}
                className={cn(
                  "w-full bg-transparent border-b py-1 font-sans font-bold text-sm outline-none transition-colors",
                  errors.lastName
                    ? "border-burgundy"
                    : "border-border-hairline focus:border-burgundy"
                )}
              />
              {errors.lastName && (
                <p className="text-[10px] text-burgundy font-mono uppercase mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="metric-label flex justify-between">
              <span>Email Address</span>
              {watchedEmail && (
                <span
                  className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    validateEmail(watchedEmail) ? "text-status-success" : "text-burgundy"
                  )}
                >
                  {validateEmail(watchedEmail) ? "✓ Valid Format" : "⚠ Invalid Format"}
                </span>
              )}
            </label>
            <input
              type="email"
              {...register("email")}
              className={cn(
                "w-full bg-transparent border-b py-1 font-mono text-xs outline-none transition-colors",
                errors.email ? "border-burgundy" : "border-border-hairline focus:border-burgundy"
              )}
            />
            {errors.email && (
              <p className="text-[10px] text-burgundy font-mono uppercase mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="metric-label">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="VIP, Tech, Early Adopter"
              {...register("tags")}
              className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isValidating}
              className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Validating Signal...
                </>
              ) : (
                "Register Contact"
              )}
            </button>
          </div>
        </form>
      </Modal>

      <AiSegmentationModal
        isOpen={isAiSegmentationOpen}
        onClose={() => setIsAiSegmentationOpen(false)}
        contacts={contacts}
        onApply={(segmentedContacts) => {
          setContacts(segmentedContacts);
        }}
      />

      <Modal
        isOpen={isImportingCsv}
        onClose={() => {
          setIsImportingCsv(false);
          setCsvData([]);
          setCsvHeaders([]);
          setImportResult(null);
        }}
        title="Import Contacts (CSV)"
      >
        {!importResult ? (
          <div className="space-y-6">
            {csvData.length === 0 ? (
              <div className="border-2 border-dashed border-border-hairline p-12 flex flex-col items-center justify-center text-center space-y-4">
                <Upload size={32} className="text-ink/40" />
                <div>
                  <p className="font-bold">Upload CSV File</p>
                  <p className="text-xs text-ink/60 mt-1">Must include an email column.</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="text-xs file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-ink/5 file:text-ink hover:file:bg-ink/10 cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-surface p-4 border border-border-hairline flex justify-between items-center">
                  <div>
                    <p className="font-bold">File uploaded successfully</p>
                    <p className="text-xs text-ink/60">{csvData.length} rows detected.</p>
                  </div>
                  <button
                    onClick={() => {
                      setCsvData([]);
                      setCsvHeaders([]);
                    }}
                    className="text-xs font-bold text-burgundy hover:underline"
                  >
                    Upload different file
                  </button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold border-b border-border-hairline pb-2">Map Columns</h3>

                  <div className="grid grid-cols-2 gap-4 items-center">
                    <label className="text-sm font-bold">
                      Email Address <span className="text-burgundy">*</span>
                    </label>
                    <select
                      value={csvMapping.email}
                      onChange={(e) => setCsvMapping({ ...csvMapping, email: e.target.value })}
                      className="bg-transparent border border-border-hairline p-2 text-sm outline-none focus:border-burgundy"
                    >
                      <option value="">-- Select Column --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <label className="text-sm font-bold">First Name</label>
                    <select
                      value={csvMapping.firstName}
                      onChange={(e) => setCsvMapping({ ...csvMapping, firstName: e.target.value })}
                      className="bg-transparent border border-border-hairline p-2 text-sm outline-none focus:border-burgundy"
                    >
                      <option value="">-- Select Column --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <label className="text-sm font-bold">Last Name</label>
                    <select
                      value={csvMapping.lastName}
                      onChange={(e) => setCsvMapping({ ...csvMapping, lastName: e.target.value })}
                      className="bg-transparent border border-border-hairline p-2 text-sm outline-none focus:border-burgundy"
                    >
                      <option value="">-- Select Column --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <label className="text-sm font-bold">Tags (comma separated)</label>
                    <select
                      value={csvMapping.tags}
                      onChange={(e) => setCsvMapping({ ...csvMapping, tags: e.target.value })}
                      className="bg-transparent border border-border-hairline p-2 text-sm outline-none focus:border-burgundy"
                    >
                      <option value="">-- Select Column --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleImportCsv}
                    disabled={!csvMapping.email || isImporting}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Importing...
                      </>
                    ) : (
                      "Import Contacts"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 text-center py-8">
            <div className="w-16 h-16 bg-status-success/10 text-status-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} />
            </div>
            <h3 className="font-serif text-2xl font-bold">Import Complete</h3>
            <div className="flex justify-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-3xl font-bold text-status-success">{importResult.imported}</p>
                <p className="text-ink/60 uppercase tracking-widest text-[10px] font-black mt-1">
                  Imported
                </p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-burgundy">{importResult.failed}</p>
                <p className="text-ink/60 uppercase tracking-widest text-[10px] font-black mt-1">
                  Failed
                </p>
              </div>
            </div>
            <div className="pt-6">
              <button
                onClick={() => {
                  setIsImportingCsv(false);
                  setCsvData([]);
                  setCsvHeaders([]);
                  setImportResult(null);
                }}
                className="btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isAddingSegment}
        onClose={() => setIsAddingSegment(false)}
        title="New Rule-based Segment"
      >
        <form onSubmit={handleCreateSegment} className="space-y-6">
          <div className="space-y-1">
            <label className="metric-label">Segment Name</label>
            <input
              type="text"
              required
              placeholder="e.g. High Value Customers"
              className="w-full bg-transparent border-b border-border-hairline py-1 font-sans font-bold text-sm outline-none focus:border-burgundy"
              value={newSegment.name}
              onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                Criteria Rules
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addRule("attribute")}
                  className="text-[9px] font-black uppercase text-burgundy hover:underline"
                >
                  + Attribute
                </button>
                <button
                  type="button"
                  onClick={() => addRule("event")}
                  className="text-[9px] font-black uppercase text-burgundy hover:underline"
                >
                  + Event
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {newSegment.rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-surface border border-border-hairline space-y-3 relative group"
                >
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    className="absolute top-2 right-2 text-ink/20 hover:text-burgundy opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>

                  {rule.type === "attribute" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-ink/40">Field</label>
                        <select
                          value={rule.field}
                          onChange={(e) => updateRule(idx, { field: e.target.value })}
                          className="w-full bg-transparent border-b border-border-hairline text-[10px] font-bold outline-none"
                        >
                          <option value="status">Status</option>
                          <option value="engagementScore">Engagement Score</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-ink/40">Value</label>
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) => updateRule(idx, { value: e.target.value })}
                          className="w-full bg-transparent border-b border-border-hairline text-[10px] font-bold outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-ink/40">
                          Event Name
                        </label>
                        <select
                          value={rule.eventName}
                          onChange={(e) => updateRule(idx, { eventName: e.target.value })}
                          className="w-full bg-transparent border-b border-border-hairline text-[10px] font-bold outline-none"
                        >
                          <option value="PRODUCT_VIEWED">Product Viewed</option>
                          <option value="CART_ABANDONED">Cart Abandoned</option>
                          <option value="CHECKOUT_STARTED">Checkout Started</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-ink/40">
                          Timeframe
                        </label>
                        <select
                          value={rule.timeframe}
                          onChange={(e) => updateRule(idx, { timeframe: e.target.value })}
                          className="w-full bg-transparent border-b border-border-hairline text-[10px] font-bold outline-none"
                        >
                          <option value="2h">Last 2 Hours</option>
                          <option value="1d">Last 24 Hours</option>
                          <option value="3d">Last 3 Days</option>
                          <option value="7d">Last 7 Days</option>
                          <option value="30d">Last 30 Days</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {newSegment.rules.length === 0 && (
                <div className="p-8 border border-dashed border-border-hairline text-center">
                  <p className="text-xs font-editorial italic text-ink/40">
                    No rules defined. This segment will include all contacts.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button type="submit" className="btn-primary w-full py-3 text-sm">
              Create Segment
            </button>
          </div>
        </form>
      </Modal>

      <div className="newspaper-grid">
        <div className="col-span-12 lg:col-span-3 space-y-8 border-r border-border-hairline pr-8">
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-ink pb-2">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs">
                {t("audiences.segments")}
              </h3>
              <button
                onClick={() => setIsAddingSegment(true)}
                className="text-[10px] font-black uppercase text-burgundy hover:underline"
              >
                + {t("audiences.new")}
              </button>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setActiveSegmentId(null)}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm font-medium transition-colors",
                  activeSegmentId === null ? "bg-burgundy text-white" : "hover:bg-surface"
                )}
              >
                {t("audiences.allContacts")}
              </button>
              {(Array.isArray(segments) ? segments : []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSegmentId(s.id)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm font-medium transition-colors flex justify-between items-center group",
                    activeSegmentId === s.id ? "bg-burgundy text-white" : "hover:bg-surface"
                  )}
                >
                  <span>{s.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-ink/40">
                      {segmentCounts[s.id] ?? "..."}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Filter size={10} />
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setActiveSegmentId("CHURN_RISK")}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm font-medium transition-colors flex justify-between items-center group",
                  activeSegmentId === "CHURN_RISK" ? "bg-burgundy text-white" : "hover:bg-surface"
                )}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    size={14}
                    className={activeSegmentId === "CHURN_RISK" ? "text-white" : "text-burgundy"}
                  />
                  <span>{t("audiences.highChurnRisk")}</span>
                </div>
                <span className="text-[10px] font-black text-ink/40">
                  {churnSummary?.high ?? "..."}
                </span>
              </button>
              {activeSegmentId && activeSegmentId !== "CHURN_RISK" && (
                <Link
                  to={`/campaigns?segmentId=${activeSegmentId}`}
                  className="mt-3 w-full btn-primary text-[10px] py-2 flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider"
                >
                  <Send size={11} />
                  <span>Launch Campaign to Segment</span>
                </Link>
              )}
            </div>
          </div>

          <div className="bg-surface p-6 space-y-4">
            <h4 className="font-serif text-xl font-bold">{t("audiences.audienceHealth")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span>{t("audiences.growth")}</span>
                <span className="text-status-success">+4.2%</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span>{t("audiences.churn")}</span>
                <span className="text-burgundy">0.8%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9 space-y-8">
          {churnSummary && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-burgundy/5 border border-burgundy/20 p-6 newspaper-grid gap-6"
            >
              <div className="col-span-12 md:col-span-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-burgundy">
                  {t("audiences.aiChurnAnalysis")}
                </p>
                <div className="flex items-end gap-4">
                  <div className="text-4xl font-serif font-bold">{churnSummary.high}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-burgundy pb-1">
                    {t("audiences.highRiskContacts")}
                  </div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-ink/40 mb-3">
                  {t("audiences.topAtRiskSubscribers")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {churnSummary.topAtRisk.slice(0, 4).map((p, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center border-b border-border-hairline pb-2"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold">{p.name}</p>
                        <p className="text-[9px] font-mono text-ink/40">{p.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-burgundy">{p.prob}</p>
                        <p className="text-[8px] font-black uppercase text-ink/40">
                          {t("audiences.risk")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={handlePredictAllChurn}
                disabled={isPredictingAll}
                className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles size={12} />
                {isPredictingAll
                  ? t("audiences.analyzingAudience")
                  : t("audiences.predictChurnAll")}
              </button>
              {import.meta.env.DEV && (
                <button
                  onClick={handleSimulateEvent}
                  disabled={isSimulatingEvent}
                  className="text-[10px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy flex items-center gap-2 disabled:opacity-50"
                >
                  <Zap size={12} />
                  {isSimulatingEvent ? t("audiences.simulating") : t("audiences.simulateEvent")}
                </button>
              )}
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-ink">
                <th className="px-4 py-3 metric-label">{t("audiences.name")}</th>
                <th className="px-4 py-3 metric-label">{t("audiences.signalQuality")}</th>
                <th className="px-4 py-3 metric-label">{t("audiences.status")}</th>
                <th className="px-4 py-3 metric-label">{t("dashboard.avgClickRate")}</th>
                <th className="px-4 py-3 metric-label">{t("audiences.consent")}</th>
                <th className="px-4 py-3 metric-label">{t("dashboard.churnRate")}</th>
                <th className="px-4 py-3 metric-label">{t("audiences.tags")}</th>
                <th className="px-4 py-3 metric-label text-right">{t("audiences.joinedDate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-hairline">
              {(Array.isArray(contacts) ? contacts : []).map((contact) => (
                <tr key={contact.id} className="hover:bg-surface transition-colors group">
                  <td className="px-4 py-4">
                    <div className="font-serif text-lg font-bold group-hover:text-burgundy transition-colors">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="font-mono text-[10px] text-ink/75 uppercase flex items-center gap-2">
                      {contact.email}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          validateEmail(contact.email)
                            ? "bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                            : "bg-burgundy shadow-[0_0_8px_rgba(139,26,26,0.6)]"
                        )}
                      />
                      <span className="text-[9px] font-black uppercase tracking-widest text-ink/60">
                        {validateEmail(contact.email) ? "Verified Signal" : "Invalid Signal"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border",
                        contact.status === "SUBSCRIBED"
                          ? "border-status-success text-status-success bg-status-success/5"
                          : "border-burgundy text-burgundy bg-burgundy/5"
                      )}
                    >
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1 bg-bg">
                        <div
                          className="h-full bg-brass"
                          style={{ width: `${contact.engagementScore}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-ink/40">
                        {contact.engagementScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <div
                        className={cn(
                          "p-1 border",
                          contact.emailConsent
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                            : "border-ink/10 bg-ink/5 text-ink/20"
                        )}
                        title="Email Consent"
                      >
                        <Mail size={10} />
                      </div>
                      <div
                        className={cn(
                          "p-1 border",
                          contact.smsConsent
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                            : "border-ink/10 bg-ink/5 text-ink/20"
                        )}
                        title="SMS Consent"
                      >
                        <Smartphone size={10} />
                      </div>
                      <div
                        className={cn(
                          "p-1 border",
                          contact.whatsappConsent
                            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
                            : "border-ink/10 bg-ink/5 text-ink/20"
                        )}
                        title="WhatsApp Consent"
                      >
                        <MessageSquare size={10} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {churnRisks[contact.id] ? (
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border w-fit",
                            churnRisks[contact.id].riskLevel === "HIGH"
                              ? "border-burgundy text-burgundy bg-burgundy/5"
                              : churnRisks[contact.id].riskLevel === "MEDIUM"
                                ? "border-brass text-brass bg-brass/5"
                                : "border-status-success text-status-success bg-status-success/5"
                          )}
                        >
                          {churnRisks[contact.id].riskLevel} RISK
                        </span>
                        <span className="text-[8px] font-mono text-ink/40">
                          {(churnRisks[contact.id].probability * 100).toFixed(0)}% Prob.
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePredictChurn(contact.id)}
                        disabled={isPredicting === contact.id}
                        className="text-[9px] font-black uppercase tracking-widest text-ink/40 hover:text-burgundy transition-colors disabled:opacity-50"
                      >
                        {isPredicting === contact.id ? "Predicting..." : "Analyze Risk"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags?.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-1.5 py-0.5 bg-surface border border-border-hairline text-[8px] font-black uppercase tracking-tighter text-ink/75"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-[10px] text-ink/40 uppercase">
                    <div className="flex items-center justify-end gap-3">
                      <span>{format(new Date(contact.createdAt), "MMM d, yyyy")}</span>
                      <button
                        onClick={() => handleViewNotifications(contact)}
                        className="text-ink/20 hover:text-burgundy opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View In-App Notifications"
                      >
                        <Bell size={14} />
                      </button>
                      <button
                        onClick={() => handleManagePreferences(contact)}
                        className="text-ink/20 hover:text-burgundy opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Manage Preferences"
                      >
                        <Settings size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contacts.length === 0 && (
            <div className="py-32 text-center">
              <p className="font-editorial italic text-4xl text-ink/20">Your audience is quiet.</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={notificationContact !== null}
        onClose={() => setNotificationContact(null)}
        title="In-App Notifications"
      >
        <p className="text-sm font-editorial italic text-ink/60 mb-6">
          {notificationContact?.firstName} {notificationContact?.lastName}
        </p>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
          {notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-4 border border-border-hairline bg-surface space-y-2"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-serif font-bold text-lg">{notif.title}</h4>
                  <span className="font-mono text-[8px] text-ink/40">
                    {format(new Date(notif.createdAt), "MMM d, HH:mm")}
                  </span>
                </div>
                <p className="text-sm text-ink/80">{notif.body}</p>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <p className="font-editorial italic text-xl text-ink/20">
                No notifications sent yet.
              </p>
            </div>
          )}
        </div>
        <div className="pt-4 border-t border-border-hairline flex justify-end mt-6">
          <button onClick={() => setNotificationContact(null)} className="btn-primary py-2 px-8">
            Close
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={preferenceContact !== null}
        onClose={() => setPreferenceContact(null)}
        title="Subscription Center"
      >
        <p className="text-[10px] font-mono text-ink/40 uppercase mt-1 mb-4">
          {preferenceContact?.email}
        </p>
        <p className="text-xs font-editorial italic text-ink/60 mb-6">
          Manage which lists this signal is subscribed to. This ensures compliance with GDPR/KVKK
          preference requirements.
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {availableLists.map((list) => (
            <label
              key={list.id}
              className="flex items-center justify-between p-3 border border-border-hairline hover:bg-surface transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="accent-burgundy"
                  checked={selectedLists.includes(list.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLists([...selectedLists, list.id]);
                    } else {
                      setSelectedLists(selectedLists.filter((id) => id !== list.id));
                    }
                  }}
                />
                <div>
                  <p className="text-sm font-bold">{list.name}</p>
                  <p className="text-[9px] font-mono text-ink/40 uppercase">
                    {list.description || "General subscription list"}
                  </p>
                </div>
              </div>
            </label>
          ))}
          {availableLists.length === 0 && (
            <p className="text-center py-8 font-editorial italic text-ink/20">
              No lists available.
            </p>
          )}
        </div>

        <div className="pt-4 flex gap-4 mt-6">
          <button onClick={handleSavePreferences} className="btn-primary flex-1 py-3">
            Update Preferences
          </button>
          <button
            onClick={() => setPreferenceContact(null)}
            className="flex-1 py-3 font-sans font-black uppercase tracking-widest text-[10px] border border-border-hairline"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Audiences;
