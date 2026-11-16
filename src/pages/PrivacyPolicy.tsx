import React from "react";
import { Link } from "react-router";
import { Shield, Lock, FileText, ArrowLeft, Mail, Globe, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export const PrivacyPolicy = () => {
  const orgName = "ABC Company Inc.";
  const supportEmail = "privacy@abccompany.test";

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1A1814] font-sans antialiased">
      {/* Top Header */}
      <header className="border-b border-[#E5E0D5] bg-white sticky top-0 z-20 py-4 px-6 sm:px-12">
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
            to="/templates"
            className="text-xs font-semibold text-[#56534E] hover:text-[#8B1A1A] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Return to App</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto py-12 px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white border border-[#E5E0D5] rounded-lg shadow-sm p-8 sm:p-14 space-y-10"
        >
          {/* Document Header */}
          <div className="border-b border-[#E5E0D5] pb-8 space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#8B1A1A]/10 text-[#8B1A1A] px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
              <Shield size={13} />
              <span>Legal Disclosure & Privacy Agreement</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#1A1814] tracking-tight">
              Privacy Policy & Data Compliance Notice
            </h1>
            <p className="text-xs text-[#736E65] font-mono">
              Last Updated: October 8, 2026 &bull; Version 2.4 &bull; Scope: Multi-Tenant SaaS
              Services
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#1A1814] flex items-center gap-2">
              <span className="text-[#8B1A1A]">1.</span> Data Controller & Scope
            </h2>
            <p className="text-sm text-[#4A463F] leading-relaxed">
              This Privacy Policy explains how <strong>{orgName}</strong>, as data controller,
              collects, processes, and protects personal information in compliance with the General
              Data Protection Regulation (&ldquo;GDPR&rdquo;), the Turkish Personal Data Protection
              Law (&ldquo;KVKK&rdquo; No. 6698), and applicable international privacy standards
              across our digital platforms, newsletters, and hosted landing pages.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#1A1814] flex items-center gap-2">
              <span className="text-[#8B1A1A]">2.</span> Categories of Data Processed
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#FAF8F5] border border-[#ECE7DE] p-4 rounded-md space-y-1">
                <strong className="text-[#1A1814] block font-bold">
                  Identity & Contact Records
                </strong>
                <p className="text-[#56534E]">
                  Full name, company affiliation, job title, email address, phone number, and
                  communication preferences.
                </p>
              </div>
              <div className="bg-[#FAF8F5] border border-[#ECE7DE] p-4 rounded-md space-y-1">
                <strong className="text-[#1A1814] block font-bold">Usage & Telemetry Data</strong>
                <p className="text-[#56534E]">
                  Email open timestamps, link click telemetry, user-agent details, IP addresses, and
                  session diagnostics.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#1A1814] flex items-center gap-2">
              <span className="text-[#8B1A1A]">3.</span> Purpose of Data Processing
            </h2>
            <ul className="text-sm text-[#4A463F] space-y-2 list-disc list-inside leading-relaxed">
              <li>Delivering technical product releases, security updates, and service notices,</li>
              <li>
                Transmitting requested lead magnet deliverables, whitepapers, and curated editorial
                digests,
              </li>
              <li>Managing customer feedback surveys and quality assessments,</li>
              <li>Complying with statutory and regulatory record-keeping obligations.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#1A1814] flex items-center gap-2">
              <span className="text-[#8B1A1A]">4.</span> Consent & One-Click Unsubscribe Guarantee
            </h2>
            <div className="bg-emerald-50/60 border border-emerald-200 p-5 rounded-md text-xs text-[#2A4D3E] space-y-2 leading-relaxed">
              <p className="font-semibold text-sm text-[#1B382B]">
                RFC 8058 Compliant One-Click Unsubscribe Guarantee
              </p>
              <p>
                Every promotional email, newsletter, and marketing communication dispatched by our
                system includes direct, header-level and footer-level unsubscribe mechanisms.
                Requests are honored immediately without conditions or fees.
              </p>
              <div className="pt-2">
                <Link
                  to="/unsubscribe"
                  className="font-bold underline text-[#1B382B] hover:text-[#8B1A1A]"
                >
                  Go to Unsubscribe Portal &rarr;
                </Link>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#1A1814] flex items-center gap-2">
              <span className="text-[#8B1A1A]">5.</span> Your Rights & Access Requests
            </h2>
            <p className="text-sm text-[#4A463F] leading-relaxed">
              Under GDPR and KVKK legislation, data subjects have the right to request confirmation
              of data processing, obtain copies of their records, request rectification or erasure
              (&ldquo;right to be forgotten&rdquo;), restrict or object to processing, and withdraw
              consent at any time.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-4 border-t border-[#E5E0D5] pt-8">
            <h2 className="font-serif text-xl font-bold text-[#1A1814] flex items-center gap-2">
              <span className="text-[#8B1A1A]">6.</span> Data Protection Contact Information
            </h2>
            <p className="text-sm text-[#4A463F] leading-relaxed">
              To exercise your rights or submit compliance inquiries, contact our Data Protection
              Officer via:
            </p>
            <div className="bg-[#FAF8F5] border border-[#ECE7DE] p-5 rounded-md text-xs space-y-2 font-mono">
              <p>
                <strong>Entity:</strong> {orgName}
              </p>
              <p>
                <strong>Address:</strong> 100 Innovation Way, Suite 400, Tech District
              </p>
              <p>
                <strong>Data Protection Office:</strong>{" "}
                <a href={`mailto:${supportEmail}`} className="text-[#8B1A1A] underline">
                  {supportEmail}
                </a>
              </p>
            </div>
          </section>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E0D5] bg-white py-8 px-6 text-center text-xs text-[#8C877D] space-y-2">
        <p>
          &copy; {new Date().getFullYear()} {orgName}. All rights reserved.
        </p>
        <div className="flex items-center justify-center gap-4 text-[11px]">
          <Link to="/unsubscribe" className="hover:text-[#1A1814] underline">
            Unsubscribe
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

export default PrivacyPolicy;
