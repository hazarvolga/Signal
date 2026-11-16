import { motion } from "motion/react";
import { useRef } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    tabRefs.current.get(nextTab.id)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Sections"
      className="flex gap-8 border-b border-burgundy/20 pb-2 relative"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(element) => {
            if (element) tabRefs.current.set(tab.id, element);
            else tabRefs.current.delete(tab.id);
          }}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          className={`text-xs font-extrabold uppercase tracking-widest relative pb-2 transition-colors ${
            activeTab === tab.id ? "text-burgundy" : "text-ink/40 hover:text-ink"
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-burgundy"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
