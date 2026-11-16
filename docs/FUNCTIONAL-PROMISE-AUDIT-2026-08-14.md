# SIGNAL Fonksiyon Vaadi Denetimi

Tarih: 2026-08-14

## Amaç

Bu çalışma bir GAP veya genel production-readiness raporu değildir. Amaç, sidebar ve ilişkili alt rotalarda kullanıcıya sunulan fonksiyonların gerçekten var olup olmadığını ve UI -> API -> veri/worker zincirinin çalışıp çalışmadığını doğrulamaktır.

## Kısa cevap

SIGNAL bugün vaat ettiği fonksiyonların tamamını sunmuyor. Güçlü ve gerçek backend temelleri var; ancak bazı sayfalar yalnız demo, bazı CTA'lar handler'sız, bazı fonksiyonlar mock veri kullanıyor ve bazı entegrasyonlar bilinçli olarak unavailable/501 durumda.

Özet sınıflandırma:

| Sınıf                                      | Route sayısı | Anlamı                                                               |
| ------------------------------------------ | -----------: | -------------------------------------------------------------------- |
| Çekirdek akışı doğrulandı                  |            2 | Campaigns ve Templates ana kullanıcı yolculukları runtime kanıtlı    |
| Büyük ölçüde uygulanmış, kabul eksik       |            4 | Audiences, Validation, Media, Collaboration                          |
| Kısmi / önemli alt fonksiyon açıkları var  |            6 | Dashboard, Automations, Forms, Reports, Integrations, Infrastructure |
| Demo, mock veya yerel ortamda kullanılamaz |            3 | Growth, Commerce, Visual Studio                                      |

Bu sınıflandırma production'da canlı provider kabulü anlamına gelmez.

## Kanıt yöntemi

| Kanıt seviyesi      | Kullanım                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Runtime UI          | Gerçek Playwright tarayıcısında route, CTA, modal, form ve network gözlemi                    |
| Runtime API         | Oturumlu ve salt-okunur GET isteklerinde durum kodu ve response şekli                         |
| E2E                 | Campaign draft oluşturma ve analytics görünüm testleri                                        |
| Integration/unit    | API sözleşmesi, workflow graph, queue ve tenant güvenliği                                     |
| Statik zincir       | UI handler -> API client -> Express route -> Prisma/worker eşlemesi                           |
| External acceptance | SES, Shopify, Gemini, OIDC/SAML, SMTP/DNS gibi dış sistemler; bu raporda doğrulanmış sayılmaz |

Çalıştırılan doğrulamalar:

- Campaign ve analytics Playwright: 2/2 geçti.
- API + workflow Vitest: doğru izole Postgres/Redis ortamında 32/32 geçti.
- 15 sidebar route salt-okunur runtime açılışı yapıldı.
- 27 temel GET veri kaynağı sorgulandı; yalnız audit-log endpoint'i 404 döndü.
- Automations template kartı gerçek tarayıcıda yeniden üretildi ve 400 response gövdesi yakalandı.

## Route bazlı fonksiyon matrisi

| Route                                             | UI vaadi ve alt görünüm                                             | Uygulama kanıtı                                                                                                        | Hüküm                         | Açık / sınır                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                               | Executive dashboard, live signals, provider health                  | `/api/stats/summary` 200 ve gerçek DB özeti; UI açıkça illustrative/not live ve provider unavailable diyor             | Kısmi, doğru etiketlenmiş     | Live signals ve provider telemetry bağlı değil                                                                                                    |
| `/campaigns`                                      | Oluşturma, draft, filtre, template yükleme, approval, A/B, dispatch | Campaign formundan draft oluşturma E2E geçti; template -> campaign form aktarımı runtime geçti; campaign liste API 200 | Çekirdek akış doğrulandı      | Gerçek gönderim provider kabulü yok; SMS/WhatsApp UI filtreleri gönderim motoru kanıtı değil                                                      |
| `/campaigns/:id`                                  | Overview ve engagement analytics                                    | Analytics ve engagement endpoint'leri 200                                                                              | Çalışıyor, performans kusurlu | Tek route açılışında her iki endpoint dört kez çağrıldı; ölçümlerin live/provider doğruluğu ayrıca kabul edilmeli                                 |
| `/automations` / Flows                            | Flow CRUD, graph builder, activation, analytics, simulation         | Workflow graph/queue testleri geçti; GET flows 200; create/update backend gerçek                                       | Kısmi                         | Blank-flow kullanıcı yolculuğu tam E2E değil; bazı simulation yüzeyleri gerçek execution yerine UI simülasyonu                                    |
| `/automations` / Templates                        | 32 örnek şablondan flow oluşturma                                   | Kart tıklaması runtime 400                                                                                             | Kırık                         | Seed node formatı güncel validator ile uyumsuz; UI gerçek hata mesajını gizliyor                                                                  |
| `/automations` / Events                           | Event listesi ve behavioral event tetikleme                         | GET events 200; backend event route ve queue var; role testleri var                                                    | Kısmi                         | Kullanıcı yolculuğu E2E ile kanıtlanmadı                                                                                                          |
| `/growth`                                         | Referral program, tier ekleme/düzenleme, leaderboard                | Sayfa API çağırmıyor; Add Tier, Edit ve View All butonlarının handler'ı yok                                            | Demo / fonksiyon sunulmuyor   | Kartlar ve sayılar statik; kullanıcıya gerçek aksiyon izlenimi veriyor                                                                            |
| `/forms`                                          | Landing page/pop-up oluşturma, builder, preview, publish            | Liste `/api/forms` 200; Create New builder'ı açıyor; backend GET/POST route var                                        | Kısmi, publish kırık          | FormBuilder Preview ve Save & Publish butonlarının handler'ı yok; UI'dan kalıcı form oluşturulamıyor                                              |
| `/audiences`                                      | Contact CRUD/import, segments, preferences, churn, event simulation | Contacts 200, segments 200; ilgili API metodları ve backend route'ları var                                             | Büyük ölçüde uygulanmış       | Import, AI churn ve event simulation uçtan uca E2E değil; AI dış model kabulü yok                                                                 |
| `/reports` / Realtime-Performance                 | Realtime ve broadcast metrikleri                                    | Analytics görünüm E2E geçti; ancak test yalnız UI metriklerinin görünmesini kontrol ediyor                             | Kısmi                         | “Live” veri doğruluğu kanıtlanmıyor                                                                                                               |
| `/reports` / Deliverability-Funnel-Cohort-Revenue | Analitik alt sekmeleri                                              | Deliverability, funnel, cohorts ve attribution endpoint'leri 200                                                       | Okuma katmanı çalışıyor       | Provider-confirmed deliverability ayrı; bazı sayılar seed/hesaplanmış veri                                                                        |
| `/reports` / Predictive AI-GAP                    | AI optimization, full scan, win-back, global apply, PDF export      | Butonlar render ediliyor                                                                                               | Demo / no-op alt fonksiyonlar | Save Configuration, Run AI Optimization, Run Full Scan, Win Back, Apply Globally ve PDF export handler'sız                                        |
| `/validation`                                     | Single, bulk ve audit logs                                          | Validation logs 200; POST validate integration testi geçti; Redis bulk route var                                       | Büyük ölçüde uygulanmış       | Disposable intelligence listesi mock; SMTP unavailable sonucu kesin deliverability kanıtı değil; dış DNS/SMTP kabulü yok                          |
| `/templates`                                      | Template list/create/delete/use                                     | 40 template GET 200; Templates API integration testi; Use Template -> Campaign form runtime geçti                      | Çekirdek akış doğrulandı      | Create/delete UI mutation yolculukları bu turda çalıştırılmadı                                                                                    |
| `/media`                                          | Asset upload/list/delete                                            | Assets endpoint 200; upload/delete backend route ve binary/size güvenlik testleri var                                  | Büyük ölçüde uygulanmış       | Gerçek upload-delete E2E yapılmadı; production object storage ve malware scan kabulü yok                                                          |
| `/visual-studio`                                  | AI image generation ve asset kaydı                                  | AI endpoint ve asset create zinciri var                                                                                | Yerel ortamda doğrulanmadı    | Gemini anahtarı/provider kabulü yok; üretim, maliyet ve çıktı kalitesi kanıtlanmadı                                                               |
| `/commerce`                                       | Product sync, campaign insert, shop preview, recommendation logic   | Products ve revenue 200                                                                                                | Demo/mock                     | Development sync sabit mockProducts yazar; production sync 501; Insert into Campaign, Shop Now, Configure Logic ve View Documentation handler'sız |
| `/integrations`                                   | Provider bağlantıları, webhook CRUD, API key                        | Integrations ve webhooks 200; webhook backend route'ları var                                                           | Kısmi                         | Provider kartları Not Available; gerçek provider bağlantısı yok; webhook CRUD E2E değil                                                           |
| `/collaboration`                                  | Team invite/update/delete, roles, approvals, brand kits             | Team/roles/brands/approvals endpoint'leri 200; backend CRUD var                                                        | Büyük ölçüde uygulanmış       | Edit Brand Kit ve Add New Brand no-op; invitation delivery e-postası kanıtlanmadı                                                                 |
| `/infrastructure`                                 | MFA/SSO, audit, API keys, consent/SAR                               | Keys, consent ve data requests 200; data-rights queue/crypto testleri var                                              | Kısmi ve bir görünür hata var | `/api/compliance/audit-logs` 404; API client hatayı boş listeye çeviriyor; MFA ve SSO bilinçli unavailable/501; dış/legal kabul yok               |

## Sidebar dışındaki ilişkili rotalar

| Route                 | Kanıt                                                                                 | Hüküm                                                         |
| --------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `/data-layer`         | Contacts, segments ve custom fields backend zinciri mevcut; route permission korumalı | Kısmi; sidebar'da görünmüyor ve E2E yok                       |
| `/dispatch/:id`       | Campaign analytics/content render ve engagement tracking kodu mevcut                  | Kısmi; gerçek public dispatch yolculuğu bu turda doğrulanmadı |
| `/preferences/:token` | Public preference endpoint ve hata duyurusu testi mevcut                              | Kısmi; geçerli token ile save yolculuğu bu turda doğrulanmadı |

## Kritik doğrulanmış kusurlar

### F-01 Automation template'lerinin tamamı güncel graph şemasıyla uyumsuz

Runtime:

```text
POST /api/flows/from-template -> 400
flow contains an unsupported or malformed node
```

Seed örneği:

```json
{ "id": "1", "type": "trigger", "data": { "label": "Campaign Started" } }
```

Validator sözleşmesi `node.data.type` alanında `Trigger | Action | Logic` ve izinli/executable bir `data.label` bekliyor. Seed ise React Flow `node.type` alanını kullanıyor ve birçok label güncel izinli sözlükle eşleşmiyor. Sonuç olarak template kartları görünür ama kullanılamaz.

### F-02 Growth sayfası fonksiyon değil, etkileşimli demo görünümü

`Add Tier`, `Edit` ve `View All` butonları handler'sız. Sayfa API veya persistence kullanmıyor.

### F-03 Forms builder kaydetmiyor

Form listesi backend'den okunuyor ve builder açılıyor. Ancak `Preview` ve `Save & Publish` butonları handler'sız; builder state'i backend `/api/forms` POST route'una gönderilmiyor.

### F-04 Reports birçok fonksiyon vaat ediyor ama CTA'lar no-op

Analitik okuma endpoint'leri gerçek. Buna karşın funnel save/reset, AI optimization, predictive full scan, win-back, global apply ve PDF export aksiyonları bağlı değil.

### F-05 Commerce gerçek entegrasyon değil

Development sync üç sabit mock ürün yazar. Production aynı endpoint'te 501 döndürür. Campaign insert, Shop Now, Configure Logic ve documentation butonları handler'sız.

### F-06 Infrastructure audit log görünümü sessizce bozuk

Frontend `/api/compliance/audit-logs` çağırıyor, backend route mevcut değil. Runtime 404 iki kez gözlendi. API client non-2xx sonucu `[]` yaptığı için kullanıcı boş tablo görür ve hata gizlenir.

### F-07 Collaboration brand CTA'ları eksik

Brand verisi okunuyor; fakat `Edit Brand Kit` ve `Add New Brand` aksiyonları gerçek handler/form akışına bağlı değil.

### F-08 Campaign detail gereksiz API tekrarları yapıyor

Runtime gözleminde analytics ve engagement endpoint'lerinin her biri tek açılışta dört kez çağrıldı. Veri geliyor, fakat gereksiz yük ve olası rate-limit maliyeti var.

## Dış kabul gerektiren ve “çalışıyor” denemeyecek alanlar

- Campaign gerçek e-posta gönderimi, bounce/complaint/open/click provider telemetry.
- Gemini image/content üretimi ve model maliyet/kalite kabulü.
- Shopify/WooCommerce gerçek ürün sync ve imzalı webhook kabulü.
- OIDC/SAML code exchange, token validation ve tenant konfigürasyonu.
- MFA TOTP enrollment/recovery.
- SMTP/DNS doğrulama sonucunun gerçek ağ koşullarındaki doğruluğu.
- Production object storage, malware scan ve backup/restore.
- İYS/KVKK/legal acceptance.

## Sonuç

Ürün tamamen sahte veya yalnız UI değildir: Campaigns, Templates, Contacts, workflow executor, queue, compliance ve veri katmanında ciddi gerçek implementasyon vardır. Ancak mevcut sidebar ürün sözleşmesi gerçeğin önündedir. En kritik yanıltıcı yüzeyler Automations Templates, Growth, Forms Publish, Reports CTA'ları ve Commerce'tir.

Fonksiyonel doğruluk sağlanmadan bu rotalar için “hazır” veya “tam çalışıyor” ifadesi kullanılmamalıdır.

## Önerilen kapatma sırası

1. Automation seed template'lerini güncel graph şemasına migrate et ve her template için create/activate E2E ekle.
2. Forms builder'ı `/api/forms` create/update/publish zincirine bağla; Preview ve Save & Publish E2E ekle.
3. Growth için gerçek referral/tier/leaderboard modeli geliştir veya CTA'ları açıkça demo olarak kilitle.
4. Infrastructure audit-log backend route'unu ekle ve API client'ın 404'ü gizlemesini engelle.
5. Reports no-op CTA'larını uygula veya kaldır/Coming Soon olarak işaretle.
6. Commerce mock sync'i demo etiketiyle sınırla; production provider adapter olmadan sync vaadi gösterme.
7. Collaboration brand CRUD akışını tamamla.
8. Campaign detail duplicate fetch'i gider ve network-count regresyon testi ekle.
9. Media, Audiences, Validation, Collaboration ve public preference/dispatch için gerçek E2E yolculukları ekle.
10. External provider acceptance tamamlanana kadar ilgili fonksiyonları açıkça unavailable/pending olarak göster.
