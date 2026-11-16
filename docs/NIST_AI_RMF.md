# NIST AI RMF Uyumluluk Dokumantasyonu

## Sistem Tanimi

**Sistem adi:** SIGNAL AI Editorial Assistant  
**Amac:** Email pazarlama icerik olusturma, spam kontrolu, ton ayarlama, churn tahmini ve gonderim zamani optimizasyonu  
**Model:** Google Gemini 3 Flash (API uzerinden)  
**Entegrasyon sekli:** API cagrilari (sunucu tarafi)  

## RMF Core Fonksiyonlari

### GOVERN 1 — AI risk yonetimi politikalari ve kaynaklari

| Gorev | Durum | Sorumlu |
|---|---|---|
| AI kullanim politikalari dökümante edildi | ✅ | Lead Developer |
| AI risk iptali tanımlandı (max risk skoru) | ✅ | Lead Developer |
| Prompt versiyonlama sistemi aktif | ✅ | src/services/promptVersioning.ts |

### MAP 1 — AI sistemi context'i anlasildi

| Gorev | Durum |
|---|---|
| AI ciktilarinin hangi is akislarinda kullanildigi belgelendi | ✅ (8 endpoint) |
| Insan-makine etkilesim noktalari tanimlandi | ✅ (AI Assistant modal, spam check, tone adjust) |
| Otomatik karar mekanizmalari (churn tahmini) insan onayina tabi | ✅ |

### MEASURE 2 — AI guvenilirlik testleri

| Metrik | Esik deger | Olcum yontemi |
|---|---|---|
| Eval pass rate | > %90 | aiEval.runEval() |
| Hallucination/reddedilme orani | < %2 | Manuel review + eval seti |
| PII sizintisi | 0 | aiGuard.redactPII() |
| Deny-list tetiklenme | 0 | aiGuard.hasDeniedContent() |
| Human override rate | < %15 | ai.promptVersioning recordPromptCall() |

### MANAGE 3 — Olay yaniti ve surekli izleme

| Gorev | Durum |
|---|---|
| AI output'larinin loglanmasi | ✅ (logger + promptVersioning) |
| Guardrail ihlali durumunda hata donusu | ✅ (geminiService check()) |
| Maliyet takibi | ⚠️ Planlandi (promptVersioning recordPromptCall) |

## Risk Siniflandirmasi

| Risk seviyesi | AI kullanim senaryosu | Insan onayi gerekli mi? |
|---|---|---|
| Dusuk | Spam skoru tahmini | Hayir (oneri niteliginde) |
| Dusuk | Konu satiri varyantlari | Hayir |
| Orta | Icerik olusturma (AI Assistant) | Evet (kullanici kabul/red) |
| Orta | Ton ayarlama | Evet (kullanici kabul/red) |
| Yuksek | Churn tahmini | Evet (aksiyon onerisiyle birlikte) |
| Yuksek | Gonderim zamani tahmini | Evet (kampanya onayi zincirinde) |

## Olay Yonetimi

AI kaynakli olaylar (hatali icerik, PII sizintisi, bias) icin:

1. **Tespit:** Guardrail ihlali → otomatik log + hata donusu
2. **Eskalasyon:** logger.error() → Lead Developer bildirimi
3. **Mitigation:** Etkilenen prompt sifir versiyonuna dondurulur (promptVersioning.setCurrentVersion)
4. **Postmortem:** Her olay sonrasi ADR formatinda dokumante edilir

## Dokuman kontrolu

| Surum | Tarih | Degisiklik |
|---|---|---|
| v1.0 | 2026-06-30 | Ilk NIST AI RMF uyumluluk raporu |
