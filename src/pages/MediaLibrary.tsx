import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Loader2, FileText, Eye, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { cn } from "../lib/utils";
import { HelpTooltip } from "../components/HelpTooltip";
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

const MediaLibrary = () => {
  const { t } = useLanguage();
  const [assets, setAssets] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    api.getAssets().then((data) => setAssets(Array.isArray(data) ? data : []));
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const newAsset = await api.addAsset({
        name: file.name,
        url: reader.result as string,
        type: file.type.startsWith("image/") ? "IMAGE" : "FILE",
        metadata: { size: file.size, lastModified: file.lastModified },
      });
      setAssets((prev) => [newAsset, ...prev]);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this asset permanently?")) {
      await api.deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="space-y-16">
      <SectionHeader
        title={t("media.title")}
        subtitle={t("media.subtitle")}
        guideKey="media-library"
      />

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed p-20 text-center transition-all group relative",
          dragActive
            ? "border-burgundy bg-burgundy/5"
            : "border-border-hairline hover:border-burgundy/40"
        )}
      >
        <div className="space-y-4">
          <div className="w-16 h-16 bg-surface border border-border-hairline flex items-center justify-center mx-auto text-ink/20 group-hover:text-burgundy transition-colors">
            {isUploading ? <Loader2 className="animate-spin" size={32} /> : <ImageIcon size={32} />}
          </div>
          <div className="space-y-2">
            <p className="text-xl font-serif font-bold">Drop assets here to upload</p>
            <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest">
              Supports JPG, PNG, GIF up to 10MB
            </p>
          </div>
          <label className="inline-block px-8 py-3 bg-ink text-bg text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-burgundy transition-all">
            Select Files
            <input
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {(Array.isArray(assets) ? assets : []).map((asset) => (
          <div
            key={asset.id}
            className="col-span-12 sm:col-span-6 lg:col-span-3 bg-surface border border-border-hairline group overflow-hidden"
          >
            <div className="aspect-square bg-bg relative overflow-hidden">
              {asset.type === "IMAGE" ? (
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink/20">
                  <FileText size={48} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button className="p-3 bg-surface text-ink hover:bg-burgundy hover:text-white transition-all rounded-full">
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="p-3 bg-surface text-ink hover:bg-burgundy hover:text-white transition-all rounded-full"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-border-hairline">
              <p className="text-[10px] font-black uppercase tracking-widest truncate">
                {asset.name}
              </p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[9px] font-mono text-ink/40 uppercase">{asset.type}</span>
                <span className="text-[9px] font-mono text-ink/40 uppercase">
                  {new Date(asset.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaLibrary;
