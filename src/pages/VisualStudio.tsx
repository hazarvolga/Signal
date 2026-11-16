import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Download,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { api } from "../services/api";
import { format } from "date-fns";
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

const VisualStudio = () => {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoadingAssets(true);
    try {
      const data = await api.getAssets();
      setAssets(data);
    } catch (err) {
      console.error("Failed to load assets", err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    setGenerationError(null);

    try {
      setGeneratedImage(await api.generateImage(prompt, aspectRatio));
    } catch (err) {
      console.error("Image generation failed:", err);
      setGenerationError(
        err instanceof Error ? err.message : "Image generation failed. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedImage) return;

    try {
      await api.addAsset({
        name: prompt.slice(0, 30) || "Generated Image",
        url: generatedImage,
        type: "IMAGE",
        metadata: { prompt, aspectRatio },
      });
      setGeneratedImage(null);
      setPrompt("");
      loadAssets();
    } catch (err) {
      console.error("Failed to save asset", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this asset?")) {
      await api.deleteAsset(id);
      loadAssets();
    }
  };

  return (
    <div className="space-y-16">
      <SectionHeader
        title={t("visualStudio.title")}
        subtitle={t("visualStudio.subtitle")}
        guideKey="visual-studio-canvas"
      />

      <div className="newspaper-grid">
        <div className="col-span-12 lg:col-span-5 space-y-8 pr-8 lg:border-r border-border-hairline">
          <div className="space-y-6">
            <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
              Generation Controls
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="metric-label">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to create... (e.g., 'A minimalist editorial illustration of a robot reading a newspaper in a futuristic cafe, muted earth tones')"
                  className="w-full h-32 bg-surface border border-border-hairline p-4 font-serif text-sm focus:border-burgundy outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="metric-label">Aspect Ratio</label>
                <div className="grid grid-cols-5 gap-2">
                  {(["1:1", "16:9", "9:16", "4:3", "3:4"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={cn(
                        "py-2 border text-[10px] font-black uppercase tracking-widest transition-all",
                        aspectRatio === ratio
                          ? "bg-ink text-bg border-ink"
                          : "border-border-hairline text-ink/40 hover:border-ink hover:text-ink"
                      )}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 bg-burgundy text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-burgundy/90 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Signal...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Asset
                  </>
                )}
              </button>
              {generationError && (
                <p role="alert" className="text-xs text-burgundy">
                  {generationError}
                </p>
              )}
            </div>
          </div>

          <div className="bg-surface p-8 space-y-4">
            <h4 className="font-serif text-xl font-bold">Pro Tips</h4>
            <ul className="space-y-3">
              {[
                "Use 'editorial illustration' for a magazine feel.",
                "Specify 'muted tones' or 'high contrast' for style.",
                "Describe the lighting: 'cinematic', 'soft morning light'.",
                "Mention the medium: 'oil painting', 'vector art', 'pencil sketch'.",
              ].map((tip, i) => (
                <li key={i} className="text-xs text-ink/60 flex gap-3 italic">
                  <span className="text-burgundy font-black">0{i + 1}</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 space-y-8">
          <h3 className="font-sans font-black uppercase tracking-widest text-xs border-b border-ink pb-2">
            Output Preview
          </h3>

          <div className="aspect-video bg-surface border border-border-hairline flex items-center justify-center relative overflow-hidden group">
            {isGenerating ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-2 border-burgundy border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="font-editorial italic text-ink/40">Synthesizing visual data...</p>
              </div>
            ) : generatedImage ? (
              <>
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button
                    onClick={handleSave}
                    className="bg-surface text-ink px-6 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-burgundy hover:text-white transition-all"
                  >
                    <CheckCircle2 size={14} />
                    Save to Library
                  </button>
                  <button
                    onClick={() => setGeneratedImage(null)}
                    className="bg-white/10 text-white border border-white/20 px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                  >
                    Discard
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 text-ink/60">
                <ImageIcon size={64} className="mx-auto" />
                <p className="font-editorial italic">Awaiting transmission...</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-ink pb-2">
              <h3 className="font-sans font-black uppercase tracking-widest text-xs">
                Asset Library
              </h3>
              <p className="text-[10px] font-mono text-ink/40 uppercase">
                {assets.length} Assets Stored
              </p>
            </div>

            {loadingAssets ? (
              <div className="py-12 text-center font-editorial italic text-ink/40">
                Loading library...
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {(Array.isArray(assets) ? assets : []).map((asset) => (
                  <div
                    key={asset.id}
                    className="group relative aspect-square bg-surface border border-border-hairline overflow-hidden"
                  >
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                      <div className="flex justify-end gap-2">
                        <a
                          href={asset.url}
                          download={`${asset.name}.png`}
                          className="w-8 h-8 bg-white/10 text-white flex items-center justify-center hover:bg-burgundy transition-colors"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="w-8 h-8 bg-white/10 text-white flex items-center justify-center hover:bg-burgundy transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white truncate">
                          {asset.name}
                        </p>
                        <p className="text-[8px] font-mono text-white/40 uppercase">
                          {format(new Date(asset.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {assets.length === 0 && (
                  <div className="col-span-4 py-12 text-center border border-dashed border-border-hairline">
                    <p className="font-editorial italic text-ink/40">
                      Library is empty. Generate your first asset above.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualStudio;
