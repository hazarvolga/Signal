# Signal Production Readiness Plan

**Başlangıç tarihi:** 29 Temmuz 2026  
**Hedef ortam:** Coolify üzerinde Oracle Cloud VPS, PostgreSQL 16 ve Redis 7  
**Kaynak GAP:** `sunum/codex-gap.md`

## Amaç

Signal'i gerçek müşteri verisi ve ticari e-posta gönderimi için güvenli, izlenebilir,
geri döndürülebilir ve testlerle kanıtlanmış bir üretim sistemine dönüştürmek.

Bu planın tamamlanması yalnızca kodun yazıldığı anlamına gelmez. Her kapı için
tanımlanan kanıtlar üretilmeden ilgili GAP kapatılmış sayılmaz.

## 29 Temmuz 2026 uygulama durumu

| Kapı | Kod/test durumu | Production kabulü |
|---|---|---|
| 0 — Baseline ve iddia temizliği | **Tamamlandı** | CI sonucu bekleniyor |
| 1 — Auth/RBAC/tenant | **Tamamlandı** | Staging negatif testleri bekleniyor |
| 2 — E-posta çekirdeği | **Tamamlandı** | Gerçek SES gönderimi bekleniyor |
| 3 — Teslimat/izin | **Tamamlandı** | SES event, DNS, İYS/hukuk bekleniyor |
| 4 — Workflow/analitik/A-B | **Sınırlı production node setiyle tamamlandı** | Pilot veri bekleniyor |
| 5 — Deployment/DR | **Araçlar tamamlandı** | Coolify deploy ve gerçek restore bekleniyor |
| 6 — CI/kalite/performans | **Pipeline ve yerel kontroller tamamlandı** | CI, staging load/soak ve alarm tatbikatı bekleniyor |

Ayrıntılı ve sunum diline çevrilmiş güncel durum `sunum/codex-gap.md` içindedir.

## Değiştirilemez ilkeler

- Gerçek gönderim gerçekleşmeden sağlayıcı entegrasyonu "çalışıyor" sayılmaz.
- Provider kabulü `DELIVERED` olarak kaydedilmez; teslimat yalnızca doğrulanmış
  provider event'iyle işaretlenir.
- Mock veya simülasyon verisi production görünümünde gerçek metrik gibi sunulmaz.
- Tenant kapsamı bulunmayan veri sorgusu veya mutasyon production route'unda kalmaz.
- Testler silinmez, atlanmaz, daraltılmaz veya beklentileri gevşetilerek yeşile çevrilmez.
- Kullanıcıya ait `prisma/dev.db` ve `sunum/` çalışma dosyaları korunur.
- Production secret'ları repoya yazılmaz.
- Yeni ADR yalnızca kullanıcı açıkça isterse oluşturulur.
- Kritik/yüksek bağımlılık açığı kabul edilmez.
- Production deploy, DNS, AWS/SES production access ve gerçek alıcı gönderimi ayrıca
  kullanıcı onayı gerektirir.

## Kapı 0 — Doğru baseline ve iddia temizliği

### İşler

- Tek ve tekrarlanabilir Node/package-manager standardı belirle.
- Lint, type-check, unit/property, API integration ve production build komutlarını ayır.
- Yanıltıcı "100/100 production ready" dokümanlarını tarihsel/yanlış olarak işaretle.
- Demo seed ve mock analytics'i production çalışmasından ayır.

### Çıkış kanıtı

- Temiz kurulumdan sonra aynı komut seti yerelde ve CI'da aynı sonucu verir.
- `lint`, `typecheck`, `test`, `build` komutlarının tamamı sıfır hata ile biter.
- Production build içinde etiketsiz mock metrik bulunmaz.

## Kapı 1 — Authentication, authorization ve tenant izolasyonu

### İşler

- Şifresiz kullanıcı hesabının ilk girişte ele geçirilmesi davranışını kaldır.
- Development mock SSO'yu production'da erişilemez yap.
- OIDC/SAML callback'lerinde nonce/state, issuer, audience ve imza doğrulamasını zorunlu yap.
- Tüm private route'lara authentication ve gereken role/permission kontrolünü uygula.
- Tüm entity lookup, update ve delete işlemlerini authenticated `organizationId` ile scope et.
- API key scope ve tenant kontrollerini zorunlu yap.
- Redis tabanlı production session store, secret doğrulama ve güvenli cookie politikası ekle.
- Dinamik JavaScript çalıştırmayı production request yolundan tamamen çıkar.

### Çıkış kanıtı

- Route matrisi her endpoint'i `public`, `authenticated`, `role-protected` veya
  `signed-webhook` olarak sınıflandırır.
- Yetkisiz isteklerin tamamı 401/403 döner.
- Tenant A kullanıcısı Tenant B kaynaklarını ID bilse dahi okuyamaz veya değiştiremez.
- Mock SSO production testinde 404/disabled döner.
- Güvenlik taramasında kritik/yüksek bulgu kalmaz.

## Kapı 2 — Gerçek ve güvenilir e-posta gönderim çekirdeği

### İşler

- Amazon SES için AWS SDK tabanlı, imzalı server-side adapter uygula.
- SMTP için gerçek TLS bağlantılı adapter uygula veya desteklenmiyorsa seçeneği kaldır.
- Provider konfigürasyonu eksikken fail-closed davran.
- Kampanya gönderimlerini BullMQ queue üzerinden yürüt.
- Alıcı başına deterministik idempotency anahtarı ve delivery ledger oluştur.
- Retry/backoff, provider rate-limit ve dead-letter akışı ekle.
- Campaign durumlarını atomik `SCHEDULED → SENDING → SENT/PARTIAL/FAILED` geçişleriyle yönet.
- Provider kabulünü `ACCEPTED/SENT`, doğrulanmış event'i `DELIVERED` olarak kaydet.

### Çıkış kanıtı

- Aynı kampanya job'ı tekrar işlendiğinde aynı alıcıya ikinci e-posta gitmez.
- Geçici provider hatası retry edilir; kalıcı hata dead-letter olarak görünür.
- Eksik credentials ile hiçbir gönderim başarılı raporlanmaz.
- SES sandbox/test adresine gerçek gönderim yapılır ve provider message ID ledger'a yazılır.

## Kapı 3 — Teslimat, suppression ve yasal izin zinciri

### İşler

- Her alıcı için kriptografik preference/unsubscribe token üret.
- `List-Unsubscribe` ve RFC 8058 `List-Unsubscribe-Post` header'larını gönder.
- GET unsubscribe sayfasını mutasyonsuz, POST one-click işlemini idempotent yap.
- SES SNS signature/certificate doğrulaması ve topic allowlist uygula.
- Bounce, complaint, reject ve delivery event'lerini message ID + tenant üzerinden eşleştir.
- Global/cross-tenant update yerine tenant-scoped suppression ledger kullan.
- Consent'i varsayılan `false` yap; kaynak, metin sürümü, zaman, IP ve user-agent sakla.
- Data export/delete request worker'larını ve silme/saklama politikasını uygula.
- İYS gereksinimini teknik entegrasyon veya belgeli manuel operasyon kapısı olarak tanımla.

### Çıkış kanıtı

- İmzasız veya yanlış topic'ten gelen webhook reddedilir.
- Complaint ve hard-bounce alan kişi yeniden kuyruğa alınamaz.
- RFC 8058 testinde header ve POST davranışı doğrulanır.
- Consent kanıtı olmayan kişi ticari kampanya alıcısı olamaz.
- Export/delete senaryoları uçtan uca test edilir.
- Hukuki uygunluk yalnızca hukuk onayı sonrasında ilan edilir.

## Kapı 4 — Workflow executor ve doğrulanmış analitik

### İşler

- Trigger, wait, condition/branch ve email action için sürümlü workflow executor uygula.
- Flow run/node run state, retry, timeout ve idempotency kayıtlarını ekle.
- Production'daki random/mock analytics ve simulation endpoint'lerini kaldır veya
  açıkça ayrılmış development-only moda taşı.
- Kampanya, flow, funnel, cohort ve revenue metriklerini kaynak event'lerden hesapla.
- A/B dağıtımını deterministik cohort ile yap; winner seçimini gerçek event'lere bağla.

### Çıkış kanıtı

- Aynı event aynı flow/contact için duplicate action üretmez.
- Wait adımı process restart sonrasında devam eder.
- Gösterilen her metrik kaynak event'lerden yeniden hesaplanabilir.
- Production testinde `Math.random()` tabanlı iş metriği veya demo event yazımı bulunmaz.

## Kapı 5 — Veri, deployment ve felaket kurtarma

### İşler

- Prisma PostgreSQL migration geçmişi oluştur ve `db push` production kullanımını kaldır.
- Coolify uyumlu Docker Compose, health check, resource limit ve persistent volume tanımla.
- PostgreSQL/Redis portlarını public host'a açma.
- Backup job'ını persistent volume + off-site hedef + retention ile çalıştır.
- Restore script'ini bağlantı bilgilerini doğru kullanan izole test DB üzerinde çalıştır.
- Readiness/liveness ayrımı, graceful shutdown ve queue drain ekle.
- Rollback ve forward-only migration prosedürünü dokümante et.

### Çıkış kanıtı

- Boş PostgreSQL üzerinde migration ile kurulum yapılır.
- Docker/CI image health check'i geçer.
- Güncel backup izole DB'ye geri yüklenir ve bütünlük sorguları geçer.
- App restart sırasında kabul edilmiş job kaybolmaz veya iki kez çalışmaz.

## Kapı 6 — CI, kalite, performans ve gözlemlenebilirlik

### İşler

- CI'ı pnpm lockfile ve tek Node LTS sürümüne geçir.
- ESLint, TypeScript, unit/property, integration, build, audit ve Docker testlerini zorunlu yap.
- Kritik auth, tenant, send, webhook, unsubscribe ve restore senaryolarını test et.
- Pino/Sentry loglarına request, tenant, campaign ve job correlation ID ekle.
- Prometheus metrikleri ve alarm/runbook eşlemesini tamamla.
- Staging üzerinde smoke/load/stress testi ve kapasite baseline'ı üret.

### Çıkış kanıtı

- CI'ın tüm zorunlu job'ları yeşildir.
- Production bağımlılık audit'inde kritik/yüksek açık yoktur.
- Tanımlı staging yükünde hata oranı ve p95 hedefleri sağlanır.
- Alarm senaryoları ve runbook adımları en az bir kez doğrulanır.

## Nihai production kabulü

Signal ancak aşağıdaki koşulların tamamı sağlandığında production-ready olarak
etiketlenebilir:

1. Kapı 0–6 çıkış kanıtlarının tamamı kayıtlıdır.
2. Gerçek SES test gönderimi, bounce, complaint, delivery ve unsubscribe zinciri geçmiştir.
3. Tenant izolasyonu ve authorization integration testleri geçmiştir.
4. Backup restore tatbikatı geçmiştir.
5. Staging smoke/load testi hedefleri karşılamıştır.
6. Kritik/yüksek dependency açığı kalmamıştır.
7. Production secret, domain, DNS, SES access ve İYS/hukuk kontrollerinin sahibi bellidir.
8. MailerLite kapatılmadan önce en az iki kontrollü kampanya ve geri dönüş planı doğrulanmıştır.
