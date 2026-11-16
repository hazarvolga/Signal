import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router";
import { api } from "../services/api";
import { ContentRenderer } from "../components/ContentRenderer";

const DispatchView = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scrollDepth, setScrollDepth] = useState(0);
  const startTime = useRef(Date.now());
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get("cid") || undefined;

  useEffect(() => {
    if (id) {
      api.getCampaignAnalytics(id).then((res) => {
        setCampaign(res.campaign);
        setLoading(false);
      });
    }
  }, [id]);

  useEffect(() => {
    if (!campaign) return;

    const handleScroll = () => {
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const depth = Math.round((scrollTop / (docHeight - winHeight)) * 100);

      if (depth > scrollDepth && depth <= 100) {
        setScrollDepth(depth);
        // Track milestone every 10%
        if (depth % 10 === 0 && depth > 0) {
          api.trackEngagement({
            campaignId: campaign.id,
            contactId,
            type: "scroll",
            value: depth,
          });
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [campaign, scrollDepth, contactId]);

  useEffect(() => {
    const trackTime = () => {
      if (campaign) {
        const duration = Math.round((Date.now() - startTime.current) / 1000);
        if (duration > 2) {
          // Only track if they stayed more than 2 seconds
          api.trackEngagement({
            campaignId: campaign.id,
            contactId,
            type: "read_time",
            value: duration,
          });
        }
      }
    };

    window.addEventListener("beforeunload", trackTime);
    return () => {
      trackTime();
      window.removeEventListener("beforeunload", trackTime);
    };
  }, [campaign, contactId]);

  if (loading)
    return (
      <div className="p-20 text-center font-editorial italic text-3xl">Loading dispatch...</div>
    );
  if (!campaign)
    return (
      <div className="p-20 text-center font-editorial italic text-3xl">Dispatch not found.</div>
    );

  return (
    <div className="bg-bg min-h-screen py-20 px-4">
      <div className="max-w-3xl mx-auto bg-surface border border-ink p-12 md:p-20 shadow-[16px_16px_0px_0px_rgba(26,24,20,1)]">
        <div className="border-b-2 border-ink pb-8 mb-12 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-burgundy mb-4">
            SIGNAL BROADCAST SYSTEM
          </p>
          <h1 className="text-5xl font-serif font-bold text-ink mb-4">{campaign.name}</h1>
          <p className="text-xl font-editorial italic text-ink/60">{campaign.subject}</p>
        </div>
        <div className="mx-auto">
          <ContentRenderer
            content={campaign.content}
            campaignId={campaign.id}
            contactId={contactId || "preview-contact-id"}
            className="prose prose-lg font-serif mx-auto"
          />
        </div>
        <div className="mt-20 pt-12 border-t border-border-hairline text-center">
          <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">
            End of Dispatch • Sent via SIGNAL
          </p>
        </div>
      </div>
    </div>
  );
};

export default DispatchView;
