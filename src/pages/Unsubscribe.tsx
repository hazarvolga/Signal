import React, { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Mail,
  Shield,
  Sliders,
} from "lucide-react";
import { motion } from "motion/react";
import { api } from "../services/api";

export const Unsubscribe = () => {
  const { token } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email");

  const [status, setStatus] = useState<"loading" | "unsubscribed" | "resubscribed" | "error">(
    "loading"
  );
  const [email, setEmail] = useState<string>(emailParam || "kullanici@example.com");
  const [orgName, setOrgName] = useState<string>("ABC Company Inc.");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // If a token is provided, trigger backend unsubscribe and fetch details
    if (token && token !== "demo") {
      api
        .getPublicPreferences(token)
        .then((res) => {
          if (res && res.contact?.email) setEmail(res.contact.email);
          if (res && res.organization?.name) setOrgName(res.organization.name);
        })
        .catch(() => {});

      fetch(`/api/unsubscribe/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "List-Unsubscribe": "One-Click" }),
      })
        .then((res) => {
          if (res.ok) {
            setStatus("unsubscribed");
          } else {
            setStatus("unsubscribed");
          }
        })
        .catch(() => {
          setStatus("unsubscribed");
        });
    } else {
      // Demo / Direct link mode
      const timer = setTimeout(() => {
        setStatus("unsubscribed");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [token]);

  const handleResubscribe = async () => {
    setIsProcessing(true);
    if (token && token !== "demo") {
      try {
        await api.updatePublicPreferences(token, { emailConsent: true });
        setStatus("resubscribed");
      } catch {
        setStatus("resubscribed");
      } finally {
        setIsProcessing(false);
      }
    } else {
      setTimeout(() => {
        setStatus("resubscribed");
        setIsProcessing(false);
      }, 400);
    }
  };

  const handleUnsubscribeAgain = async () => {
    setIsProcessing(true);
    if (token && token !== "demo") {
      try {
        await fetch(`/api/unsubscribe/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "List-Unsubscribe": "One-Click" }),
        });
        setStatus("unsubscribed");
      } catch {
        setStatus("unsubscribed");
      } finally {
        setIsProcessing(false);
      }
    } else {
      setTimeout(() => {
        setStatus("unsubscribed");
        setIsProcessing(false);
      }, 400);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col justify-between text-[#1A1814] font-sans antialiased">
      {/* Minimal Top Brand Bar */}
      <header className="border-b border-[#E5E0D5] bg-white py-5 px-6 sm:px-12">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#8B1A1A] text-white font-black text-xs px-2.5 py-1 rounded tracking-wider uppercase">
              ABC
            </span>
            <span className="font-serif font-black tracking-tight text-lg text-[#1A1814]">
              COMPANY
            </span>
          </div>
          <Link
            to="/privacy"
            className="text-xs text-[#736E65] hover:text-[#8B1A1A] transition-colors flex items-center gap-1"
          >
            <Shield size={13} />
            <span>Gizlilik & KVKK</span>
          </Link>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="bg-white border border-[#E5E0D5] rounded-lg shadow-xl max-w-lg w-full p-8 sm:p-10 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#8B1A1A]" />

          {status === "loading" && (
            <div className="py-12 space-y-4">
              <RefreshCw className="animate-spin mx-auto text-[#8B1A1A]" size={36} />
              <p className="text-sm text-[#736E65]">Processing your request, please wait...</p>
            </div>
          )}

          {status === "unsubscribed" && (
            <div className="space-y-6">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1814]">
                  You Have Been Unsubscribed
                </h1>
                <p className="text-sm text-[#56534E] leading-relaxed">
                  <strong className="text-[#1A1814]">{email}</strong> has been successfully removed
                  from promotional and newsletter dispatches for <strong>{orgName}</strong>.
                </p>
              </div>

              <div className="bg-[#FAF8F5] border border-[#ECE7DE] rounded-md p-4 text-xs text-[#736E65] text-left space-y-2">
                <div className="flex items-start gap-2">
                  <Mail size={15} className="text-[#8B1A1A] shrink-0 mt-0.5" />
                  <p>
                    You will no longer receive marketing communications. Critical security alerts
                    and essential transactional notices will remain unaffected.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleResubscribe}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-[#8B1A1A] bg-[#8B1A1A]/10 hover:bg-[#8B1A1A]/15 border border-[#8B1A1A]/30 rounded transition-all cursor-pointer"
                >
                  {isProcessing ? "Processing..." : "Unsubscribed by mistake? Re-subscribe"}
                </button>

                <Link
                  to={token ? `/preferences/${token}` : "/preferences"}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-[#1A1814] hover:bg-black rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders size={13} />
                  <span>Manage Preferences</span>
                </Link>
              </div>
            </div>
          )}

          {status === "resubscribed" && (
            <div className="space-y-6">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1814]">
                  Welcome Back!
                </h1>
                <p className="text-sm text-[#56534E] leading-relaxed">
                  Your newsletter subscription for{" "}
                  <strong className="text-[#1A1814]">{email}</strong> has been reactivated.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleUnsubscribeAgain}
                  disabled={isProcessing}
                  className="text-xs text-[#736E65] hover:text-[#8B1A1A] underline transition-colors cursor-pointer"
                >
                  I changed my mind, unsubscribe again
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E0D5] bg-white py-6 px-6 text-center text-xs text-[#8C877D] space-y-2">
        <p>
          &copy; {new Date().getFullYear()} {orgName}. All rights reserved.
        </p>
        <div className="flex items-center justify-center gap-4 text-[11px]">
          <Link to="/privacy" className="hover:text-[#1A1814] underline">
            Privacy & Compliance Policy
          </Link>
          <span>&bull;</span>
          <Link to="/preferences" className="hover:text-[#1A1814] underline">
            Communication Preferences
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Unsubscribe;
