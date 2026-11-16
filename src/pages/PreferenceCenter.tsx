import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { Loader2, AlertCircle, Mail, Smartphone, MessageSquare, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../services/api";
import { cn } from "../lib/utils";

const PreferenceCenter = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && token !== "demo") {
      api
        .getPublicPreferences(token)
        .then((res) => {
          if (res.error) setError(res.error);
          else setData(res);
        })
        .catch(() => setError("Failed to load preferences"))
        .finally(() => setLoading(false));
    } else {
      // Demo / Direct link preview mode
      setData({
        organization: {
          name: "ABC Company Inc.",
          logoUrl: null,
        },
        contact: {
          email: "kullanici@example.com",
          emailConsent: true,
          smsConsent: false,
          whatsappConsent: true,
        },
        memberships: ["list-1", "list-2"],
        availableLists: [
          {
            id: "list-1",
            name: "Weekly Editorial Digest",
            description: "Industry trends, benchmark case studies, and engineering briefs.",
          },
          {
            id: "list-2",
            name: "Product Releases & Changelogs",
            description: "Software updates, new features, and technical documentation.",
          },
          {
            id: "list-3",
            name: "Webinars & Event Invitations",
            description: "Live workshops and interactive expert Q&A sessions.",
          },
          {
            id: "list-4",
            name: "Exclusive Offers & Partner Perks",
            description: "Early bird promotions, volume tier discounts, and seasonal benefits.",
          },
        ],
      });
      setLoading(false);
    }
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (token && token !== "demo") {
        await api.updatePublicPreferences(token, {
          listIds: data.memberships,
          emailConsent: data.contact.emailConsent,
          smsConsent: data.contact.smsConsent,
          whatsappConsent: data.contact.whatsappConsent,
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="animate-spin text-burgundy" size={32} />
      </div>
    );

  if (error || !data)
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div
          role="alert"
          aria-live="assertive"
          className="max-w-md w-full bg-surface border border-border-hairline p-8 text-center space-y-4"
        >
          <AlertCircle className="mx-auto text-burgundy" size={48} />
          <h2 className="font-serif text-2xl font-bold">Access Denied</h2>
          <p className="text-sm text-ink/60">
            {error || "This preference link is invalid or has expired."}
          </p>
          <Link to="/" className="btn-primary inline-block px-8 py-2 text-xs">
            Return Home
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-surface py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          {data.organization.logoUrl ? (
            <img
              src={data.organization.logoUrl}
              alt={data.organization.name}
              className="h-12 mx-auto grayscale"
              referrerPolicy="no-referrer"
            />
          ) : (
            <h1 className="font-sans font-black uppercase tracking-[0.2em] text-xl">
              {data.organization.name}
            </h1>
          )}
          <div className="h-px w-24 bg-ink mx-auto" />
          <h2 className="font-serif text-3xl font-bold italic">Subscription Preference Center</h2>
          <p className="text-sm text-ink/60 max-w-md mx-auto">
            Manage how you receive updates from us. Your privacy and preferences are our priority.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="bg-surface border border-border-hairline p-8 sm:p-12 space-y-10"
        >
          <section className="space-y-6">
            <div className="border-b border-ink pb-2">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs">Channels</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { id: "emailConsent", label: "Email", icon: Mail },
                { id: "smsConsent", label: "SMS", icon: Smartphone },
                { id: "whatsappConsent", label: "WhatsApp", icon: MessageSquare },
              ].map((channel) => (
                <label
                  key={channel.id}
                  className="flex flex-col items-center p-4 border border-border-hairline cursor-pointer hover:bg-surface transition-colors group"
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={data.contact[channel.id]}
                    onChange={(e) =>
                      setData({
                        ...data,
                        contact: { ...data.contact, [channel.id]: e.target.checked },
                      })
                    }
                  />
                  <channel.icon
                    size={24}
                    className={cn(
                      "mb-3 transition-colors",
                      data.contact[channel.id] ? "text-burgundy" : "text-ink/20"
                    )}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest mb-2">
                    {channel.label}
                  </span>
                  <div
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      data.contact[channel.id] ? "bg-burgundy" : "bg-ink/10"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        data.contact[channel.id] ? "left-6" : "left-1"
                      )}
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="border-b border-ink pb-2">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs">
                Topics & Interests
              </h3>
            </div>
            <div className="space-y-3">
              {data.availableLists.map((list: any) => (
                <label
                  key={list.id}
                  className="flex items-center justify-between p-4 border border-border-hairline hover:bg-surface cursor-pointer group"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{list.name}</p>
                    <p className="text-[10px] font-serif italic text-ink/60">
                      {list.description || "Updates regarding " + list.name}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 border-2 border-ink rounded-none checked:bg-burgundy focus:ring-0"
                    checked={data.memberships.includes(list.id)}
                    onChange={(e) => {
                      const newMemberships = e.target.checked
                        ? [...data.memberships, list.id]
                        : data.memberships.filter((id: string) => id !== list.id);
                      setData({ ...data, memberships: newMemberships });
                    }}
                  />
                </label>
              ))}
            </div>
          </section>

          <div className="pt-6 border-t border-border-hairline flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">
              Last updated: {new Date().toLocaleDateString()}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary px-12 py-3 text-xs w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
              {saving ? "Saving..." : "Update Preferences"}
            </button>
          </div>

          <AnimatePresence>
            {success && (
              <motion.div
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-status-success/10 border border-status-success/20 p-4 text-center"
              >
                <p className="text-xs font-black uppercase tracking-widest text-status-success">
                  Preferences Updated Successfully
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="text-center space-y-4">
          <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">
            Consent & Preference Controls • Legal Acceptance Required
          </p>
          <div className="flex justify-center gap-6">
            <Link
              to="/privacy"
              className="text-[10px] font-black uppercase text-ink/40 hover:text-burgundy"
            >
              Privacy & Compliance Policy
            </Link>
            <Link
              to="/unsubscribe"
              className="text-[10px] font-black uppercase text-ink/40 hover:text-burgundy"
            >
              Unsubscribe
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferenceCenter;
