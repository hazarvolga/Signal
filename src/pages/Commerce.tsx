import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { RefreshCw, Package, ShoppingBag, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { HelpTooltip } from "../components/HelpTooltip";
import { cn } from "../lib/utils";
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

const MetricBlock = ({
  label,
  value,
  delta,
  deltaType,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "up" | "down";
}) => (
  <div className="space-y-2">
    <p className="metric-label">{label}</p>
    <div className="flex items-baseline gap-3">
      <span className="metric-value">{value}</span>
      {delta && (
        <span
          className={cn(
            "text-xs font-mono flex items-center",
            deltaType === "up" ? "text-status-success" : "text-burgundy"
          )}
        >
          {deltaType === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {delta}
        </span>
      )}
    </div>
  </div>
);

interface RevenueSummary {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  campaignRevenue: number;
  automationRevenue: number;
  campaignRoi: number;
}

export default function Commerce() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueSummary>({
    totalRevenue: 0,
    orderCount: 0,
    avgOrderValue: 0,
    campaignRevenue: 0,
    automationRevenue: 0,
    campaignRoi: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    api
      .getProducts()
      .then((res) => setProducts(Array.isArray(res) ? res : []))
      .catch(() => setProducts([]));
    api
      .getRevenueSummary()
      .then((res) => {
        if (res && typeof res === "object") {
          setRevenueData({
            totalRevenue: res.totalRevenue || 0,
            orderCount: res.orderCount || 0,
            avgOrderValue: res.avgOrderValue || 0,
            campaignRevenue: res.campaignRevenue || 0,
            automationRevenue: res.automationRevenue || 0,
            campaignRoi: res.campaignRoi || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    if (!hasPermission("integration:manage")) return;
    setIsSyncing(true);
    await api.syncProducts();
    const updated = await api.getProducts();
    setProducts(updated);
    setIsSyncing(false);
  };

  const previewProduct = products.length > 0 ? products[0] : null;

  const campaignPct =
    revenueData.totalRevenue > 0
      ? Math.round((revenueData.campaignRevenue / revenueData.totalRevenue) * 100)
      : 0;
  const automationPct = revenueData.totalRevenue > 0 ? Math.max(0, 100 - campaignPct) : 0;

  return (
    <div className="space-y-12">
      <SectionHeader
        title={t("commerce.title")}
        subtitle={t("commerce.subtitle")}
        guideKey="commerce-revenue"
        action={
          hasPermission("integration:manage") && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
              {isSyncing ? t("commerce.syncing") : t("commerce.syncProductFeed")}
            </button>
          )
        }
      />

      <div className="newspaper-grid border-b border-border-hairline pb-12">
        <div className="col-span-12 lg:col-span-4">
          <MetricBlock
            label={t("commerce.totalRevenue")}
            value={`$${revenueData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            delta={revenueData.totalRevenue > 0 ? "Live attributed" : "Awaiting orders"}
            deltaType={revenueData.totalRevenue > 0 ? "up" : undefined}
          />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <MetricBlock
            label={t("commerce.campaignRoi")}
            value={revenueData.campaignRoi > 0 ? `${revenueData.campaignRoi}x` : "Standby"}
            delta={revenueData.campaignRoi > 0 ? "Attributed" : undefined}
            deltaType={revenueData.campaignRoi > 0 ? "up" : undefined}
          />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <MetricBlock
            label={t("commerce.avgOrderValue")}
            value={`$${revenueData.avgOrderValue.toFixed(2)}`}
            delta={
              revenueData.orderCount > 0 ? `${revenueData.orderCount} orders recorded` : undefined
            }
            deltaType="up"
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <h3 className="text-2xl font-serif font-bold text-ink">{t("commerce.productFeed")}</h3>
          <div className="border border-border-hairline divide-y divide-border-hairline">
            {products.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-surface border border-dashed border-border-hairline">
                <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center mx-auto text-ink/40">
                  <Package size={20} />
                </div>
                <p className="font-serif text-lg font-bold text-ink">Catalog Feed Standby</p>
                <p className="text-xs text-ink/50 max-w-sm mx-auto">
                  {t("commerce.noProducts")} Sync your product catalog or connect via Webhooks to
                  inject dynamic product cards into broadcasts.
                </p>
              </div>
            ) : (
              (Array.isArray(products) ? products : []).map((product) => (
                <div
                  key={product.id}
                  className="p-6 flex items-center justify-between hover:bg-surface transition-colors group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-surface border border-border-hairline flex items-center justify-center text-ink/20">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package size={24} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-ink">
                        {product.name}
                      </p>
                      <p className="text-[10px] font-mono text-ink/40 uppercase">
                        {product.source} • {product.externalId}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-serif font-bold text-ink">
                      ${product.price.toFixed(2)}
                    </p>
                    <button
                      onClick={() => navigate("/campaigns")}
                      className="text-[9px] font-mono text-burgundy uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {t("commerce.insertCampaign")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <h3 className="text-2xl font-serif font-bold text-ink">
            {t("commerce.revenueAttribution")}
          </h3>
          {revenueData.totalRevenue === 0 ? (
            <div className="bg-surface border border-border-hairline p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-ink/5 flex items-center justify-center mx-auto text-ink/40">
                <ShoppingBag size={20} />
              </div>
              <h4 className="font-serif text-lg font-bold text-ink">
                Attribution Telemetry Standby
              </h4>
              <p className="text-xs text-ink/60 leading-relaxed">
                No revenue recorded yet. As orders are synchronized from Shopify or Webhooks, live
                revenue attribution across broadcasts and automations will display here.
              </p>
            </div>
          ) : (
            <div className="bg-surface border border-border-hairline p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink/60">
                    {t("commerce.campaignRevenue")}
                  </p>
                  <p className="text-xl font-serif font-bold text-ink">
                    ${revenueData.campaignRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="w-full bg-bg h-1.5 overflow-hidden">
                  <div
                    className="bg-burgundy h-full transition-all duration-500"
                    style={{ width: `${campaignPct}%` }}
                  ></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink/60">
                    {t("commerce.automationRevenue")}
                  </p>
                  <p className="text-xl font-serif font-bold text-ink">
                    ${revenueData.automationRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="w-full bg-bg h-1.5 overflow-hidden">
                  <div
                    className="bg-burgundy h-full transition-all duration-500"
                    style={{ width: `${automationPct}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-2xl font-serif font-bold text-ink">{t("commerce.dynamicBlocks")}</h3>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4 bg-surface border border-border-hairline p-8 space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-ink/40">
                {t("commerce.blockPreview")}
              </p>
              <span className="px-2 py-0.5 bg-burgundy text-white text-[8px] font-black uppercase tracking-widest">
                {previewProduct ? t("commerce.live") : "Preview"}
              </span>
            </div>
            <div className="bg-bg p-6 border border-border-hairline space-y-4">
              <div className="aspect-square bg-surface border border-border-hairline flex items-center justify-center text-ink/10 overflow-hidden">
                {previewProduct?.imageUrl ? (
                  <img
                    src={previewProduct.imageUrl}
                    alt={previewProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag size={48} />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-widest text-ink line-clamp-1">
                  {previewProduct ? previewProduct.name : "Product Catalog Preview"}
                </p>
                <p className="text-xs font-serif font-bold text-burgundy">
                  ${previewProduct ? previewProduct.price.toFixed(2) : "0.00"}
                </p>
              </div>
              <button
                onClick={() => navigate("/campaigns")}
                className="w-full py-2 bg-ink text-bg text-[9px] font-black uppercase tracking-widest hover:bg-ink/80 transition-colors"
              >
                {t("commerce.shopNow")}
              </button>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-8 bg-surface border border-border-hairline p-12 flex flex-col items-center justify-center text-center space-y-6">
            <Zap size={48} className="text-burgundy/20" />
            <div>
              <p className="text-lg font-serif font-bold text-ink">
                {t("commerce.intelligentRecommendations")}
              </p>
              <p className="text-sm font-editorial italic text-ink/60 max-w-md mx-auto">
                {t("commerce.recommendationDesc")}
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => navigate("/automations")} className="btn-primary py-2 px-6">
                {t("commerce.configureLogic")}
              </button>
              <button
                onClick={() => navigate("/infrastructure")}
                className="py-2 px-6 border border-border-hairline text-[10px] font-black uppercase tracking-widest text-ink/60 hover:bg-bg transition-colors"
              >
                {t("commerce.viewDocs")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
