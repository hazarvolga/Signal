import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  Send,
  Users,
  TrendingUp,
  LayoutTemplate,
  Zap,
  Sparkles,
  BarChart3,
  Shield,
  Activity,
  Search,
  FileText,
} from "lucide-react";
import { motion } from "motion/react";
import { api } from "../services/api";
import { Campaign, Contact } from "../types";

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      api.getCampaigns().then(setCampaigns);
      api.getContacts().then(setContacts);
    }
  }, [isOpen]);

  const navItems = [
    { name: "Dashboard", path: "/", icon: <LayoutDashboard size={16} /> },
    { name: "Broadcasts", path: "/campaigns", icon: <Send size={16} /> },
    { name: "Audience", path: "/audiences", icon: <Users size={16} /> },
    { name: "Growth Engine", path: "/growth", icon: <TrendingUp size={16} /> },
    { name: "Forms & Pages", path: "/forms", icon: <LayoutTemplate size={16} /> },
    { name: "Automations", path: "/automations", icon: <Zap size={16} /> },
    { name: "Visual Studio", path: "/visual-studio", icon: <Sparkles size={16} /> },
    { name: "Reports", path: "/reports", icon: <BarChart3 size={16} /> },
    { name: "Infrastructure", path: "/infrastructure", icon: <Shield size={16} /> },
    { name: "Data Layer", path: "/data-layer", icon: <Activity size={16} /> },
  ];

  const filteredNav = navItems.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );
  const filteredCampaigns = campaigns
    .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);
  const filteredContacts = contacts
    .filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-6 bg-black/20 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-bg border border-ink w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 p-6 border-b border-border-hairline bg-surface">
          <Search size={20} className="text-ink/40" />
          <label className="hidden">Hidden Label</label>
          <input
            autoFocus
            type="text"
            placeholder="Search broadcasts, contacts, or navigate..."
            className="flex-1 bg-transparent border-none outline-none font-serif text-2xl placeholder:text-ink/20"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="px-2 py-1 border border-border-hairline text-[9px] font-black uppercase tracking-widest text-ink/40">
            ESC
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {filteredNav.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 px-2">
                Navigation
              </p>
              <div className="grid grid-cols-2 gap-1">
                {filteredNav.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-surface text-left transition-colors group"
                  >
                    <span className="text-ink/40 group-hover:text-burgundy">{item.icon}</span>
                    <span className="font-sans font-bold text-sm">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredCampaigns.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 px-2">
                Broadcasts
              </p>
              <div className="space-y-1">
                {filteredCampaigns.map((camp) => (
                  <button
                    key={camp.id}
                    onClick={() => {
                      navigate(`/campaigns/${camp.id}`);
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-between w-full p-3 hover:bg-surface text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-ink/40" />
                      <span className="font-serif font-bold">{camp.name}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-ink/20">
                      {camp.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredContacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-ink/40 px-2">
                Contacts
              </p>
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      navigate("/audiences");
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-surface w-full text-left transition-colors group"
                  >
                    <div className="w-8 h-8 bg-burgundy/5 border border-burgundy/10 flex items-center justify-center text-burgundy font-serif font-bold text-xs">
                      {contact.firstName[0]}
                      {contact.lastName[0]}
                    </div>
                    <div>
                      <p className="font-sans font-bold text-sm">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <p className="text-[10px] font-mono text-ink/40 uppercase">{contact.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query &&
            filteredNav.length === 0 &&
            filteredCampaigns.length === 0 &&
            filteredContacts.length === 0 && (
              <div className="py-12 text-center">
                <p className="font-editorial italic text-2xl text-ink/20">
                  No results for "{query}"
                </p>
              </div>
            )}
        </div>

        <div className="p-4 border-t border-border-hairline bg-surface flex justify-between items-center">
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-border-hairline bg-bg rounded text-[9px] font-black">
                ↑↓
              </kbd>
              <span className="text-[9px] font-black uppercase tracking-widest text-ink/40">
                Navigate
              </span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 border border-border-hairline bg-bg rounded text-[9px] font-black">
                ENTER
              </kbd>
              <span className="text-[9px] font-black uppercase tracking-widest text-ink/40">
                Select
              </span>
            </div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-burgundy">
            SIGNAL Command Center
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CommandPalette;
