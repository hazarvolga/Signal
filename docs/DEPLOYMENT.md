# SIGNAL Production Deployment

Bu doküman Coolify üzerinde Oracle Cloud Free Tier hedefini esas alır. Production
dağıtımı yalnız CI içindeki quality, security ve Docker kapıları başarılı olduğunda
yapılmalıdır.

## Mimari

- `app`: Derlenmiş Node.js 22 uygulaması; non-root kullanıcı ve read-only filesystem.
- `db`: PostgreSQL 16; yalnız internal Docker ağına açık.
- `redis`: Redis 7; parola, AOF ve `noeviction` politikasıyla yalnız internal ağa açık.
- `backup`: Günlük doğrulanmış `pg_dump` üretir; `backups` volume’unda saklar.
- Coolify reverse proxy: TLS sonlandırma ve public HTTP erişimi.

Uygulama container’ı her başlangıçta `prisma migrate deploy` çalıştırır. `db push`
production akışının bir parçası değildir.

## Gereksinimler

- Docker Engine 24+ ve Docker Compose v2 veya Coolify
- En az 2 GB RAM ve swap alanı
- Public DNS kaydı ve Coolify tarafından yönetilen TLS sertifikası
- Production e-posta sağlayıcısı kimlik bilgileri
- Volume snapshot veya object-storage tabanlı ikinci bir off-site backup kopyası

## Zorunlu ortam değişkenleri

| Değişken                     | Örnek/amaç                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`          | En az 32 karakter rastgele parola                                                                                                  |
| `DATABASE_URL`               | `postgresql://signal:<url-encoded-password>@db:5432/signal?connection_limit=10&pool_timeout=5`; replica başına 10 bağlantı bütçesi |
| `REDIS_PASSWORD`             | En az 32 karakter rastgele parola                                                                                                  |
| `REDIS_URL`                  | `redis://:<url-encoded-password>@redis:6379`                                                                                       |
| `SESSION_SECRET`             | En az 64 karakter rastgele değer                                                                                                   |
| `METRICS_TOKEN`              | Prometheus endpoint’i için rastgele token                                                                                          |
| `APP_URL`                    | `https://signal.example.com`                                                                                                       |
| `DATA_EXPORT_ENCRYPTION_KEY` | `openssl rand -hex 32`; export dosyaları için AES-256 anahtarı                                                                     |
| `CONSENT_TEXT_VERSION`       | Yayındaki izin metninin değişmez sürüm etiketi                                                                                     |
| `EMAIL_PROVIDER`             | `AMAZON_SES`, `SMTP`, `SENDGRID`, `MAILGUN` veya `RESEND`                                                                          |
| `EMAIL_TRACKING_SECRET`      | En az 32 karakter bağımsız HMAC secret                                                                                             |
| `S3_BACKUP_BUCKET`           | Off-site yedeklerin yazılacağı zorunlu bucket                                                                                      |
| `AI_MONTHLY_BUDGET_USD`      | Tenant başına aylık provider çağrı bütçesi; varsayılan `$25`                                                                       |
| `AI_PRICING_VERSION`         | Ledger'a yazılan değişmez fiyat sürümü; fiyat değişiminde yeni değer kullanın                                                      |
| `AI_RESERVATION_TTL_MINUTES` | Çöken AI çağrılarının bütçe rezervini güvenle serbest bırakma süresi; varsayılan `15` dakika                                       |

AI fiyat varsayılanları Google'ın `14 Ağustos 2026` tarihinde doğrulanan standart paid-tier
liste fiyatlarını temel alır. Fiyat override değerlerini değiştirdiğinizde
`AI_PRICING_VERSION` değerini de değiştirin; geçmiş ledger kayıtlarını yeniden hesaplamayın.
Süresi dolmuş `STARTED` reservation kayıtları bir sonraki aynı-tenant bütçe işlemi içinde
`STALE_RESERVATION` olarak kapatılır; manuel ledger silme veya bütçe sayacı sıfırlama yapmayın.

PostgreSQL kapasitesini `uygulama replica sayısı x connection_limit + worker/backup/admin rezervi`
olarak bütçeleyin. Varsayılan Coolify/Oracle profili her uygulama/worker replica'sı için `10`
bağlantı ve `5` saniye pool timeout kullanır; replica sayısını artırmadan önce veritabanı
`max_connections` rezervini ve `pg_stat_activity` tepe değerini doğrulayın.

Parolalar URL içinde kullanıldığında percent-encoding uygulanmalıdır. Secret değerleri
Git’e, image katmanına veya Coolify build argümanlarına yazılmamalıdır.

İsteğe bağlı değişkenler:

- `SIGNAL_IMAGE`: Daha önce CI tarafından yayınlanmış immutable GHCR image.
- `APP_BIND_ADDRESS`: Lokal Compose için varsayılan `127.0.0.1`; Coolify gerektiğinde
  `0.0.0.0`.
- `APP_PORT`: Varsayılan `3000`.
- `SENTRY_DSN`, `LOG_LEVEL`, `GEMINI_API_KEY`.
- E-posta sağlayıcısına göre `AWS_*`, `SENDGRID_API_KEY`, `MAILGUN_*`,
  `RESEND_API_KEY` veya `SMTP_*`. SES kullanıldığında `SES_SNS_TOPIC_ARNS`
  zorunludur.
- `EMAIL_TRACKING_TTL_DAYS`, `AB_MIN_SAMPLE_PER_VARIATION`.
- `APP_MEMORY_LIMIT`, `DB_MEMORY_LIMIT`, `REDIS_MEMORY_LIMIT`.

## İlk kurulum

```bash
cp .env.example .env
openssl rand -hex 32
openssl rand -hex 64
docker compose config
docker compose build --pull app
docker compose up -d
docker compose ps
curl --fail http://127.0.0.1:3000/health
```

Üretilen secret değerlerini `.env` içine elle yerleştirin. Komut çıktısını shell
history’ye veya issue kaydına kopyalamayın.

İlk owner hesabı image içinde seed edilmez. Migration sonrasında, henüz hiç kullanıcı
yokken tek seferlik bootstrap çalıştırın:

```bash
docker compose run --rm \
  -e BOOTSTRAP_ADMIN_EMAIL=owner@example.com \
  -e BOOTSTRAP_ADMIN_PASSWORD='<password-manager-generated>' \
  -e BOOTSTRAP_ORGANIZATION_NAME='Organization Name' \
  app pnpm bootstrap:admin
```

Script herhangi bir kullanıcı bulursa fail-closed durur. Parolayı komut satırı
history’sine yazmak yerine Coolify’nin tek seferlik secret/env mekanizmasını kullanın.

Beklenen health cevabı database ve Redis kontrollerini `ok` göstermelidir. Health
cevabı tek başına release kabulü değildir; runbook içindeki smoke testler de
çalıştırılmalıdır.

## Coolify / Oracle Cloud

1. Repository veya CI tarafından yayınlanan GHCR image ile bir Docker Compose
   kaynağı oluşturun.
2. Zorunlu değişkenleri Coolify secret alanlarında tanımlayın.
3. Public domain’i yalnız `app:3000` servisine bağlayın.
4. PostgreSQL ve Redis için public port mapping eklemeyin.
5. `pgdata`, `redisdata` ve `backups` volume’larını kalıcı disk üzerinde doğrulayın.
6. Oracle firewall/security-list üzerinde yalnız 22, 80 ve 443 portlarını gerektiği
   kadar açın.
7. VPS üzerinde en az 2 GB swap yapılandırın; container limitlerini toplam fiziksel
   belleğin altında tutun.
8. İlk dağıtımdan sonra `docker compose ps`, health, login, session ve backup/restore
   testlerini tamamlayın.
9. İYS manuel mutabakat sorumlusu ve kayıt kanıtını
   `docs/COMPLIANCE_OPERATIONS.md` uyarınca atayın.

## Baseline migration

`20260729170000_baseline` migration’ı mevcut Prisma şemasından deterministik olarak
üretilmiştir.

### Yeni ve boş PostgreSQL

Ek işlem gerekmez. Entrypoint migration’ı uygular. Manuel doğrulama:

```bash
docker compose run --rm app pnpm exec prisma migrate deploy
docker compose run --rm app pnpm exec prisma migrate status
```

### Daha önce `prisma db push` ile oluşturulmuş mevcut PostgreSQL

Baseline SQL mevcut tabloların üstüne uygulanmamalıdır.

1. Bakım penceresi açın ve yazma trafiğini durdurun.
2. Backup alın ve `scripts/restore-test.sh` ile ayrı bir veritabanına geri yükleyin.
3. Mevcut database ile `prisma/schema.prisma` arasında drift olmadığını migration
   diff çıktısını tek tek inceleyerek doğrulayın.
4. Yalnız diff boşsa baseline’ı uygulanmış olarak işaretleyin:

```bash
pnpm exec prisma migrate resolve --applied 20260729170000_baseline
pnpm exec prisma migrate status
```

Drift varsa baseline’ı zorla resolve etmeyin. Önce ayrı ve veri-korumalı bir migration
planı hazırlayın.

## Deploy

```bash
docker compose pull
docker compose build app
docker compose up -d --remove-orphans
docker compose ps
docker compose logs --tail=200 app
curl --fail http://127.0.0.1:3000/health
```

`docker compose down -v` production ortamında kullanılmamalıdır; kalıcı veriyi siler.

## Rollback

Image rollback yalnız migration geriye uyumluysa güvenlidir.

```bash
SIGNAL_IMAGE=ghcr.io/<owner>/signal:<previous-sha> docker compose up -d app
docker compose logs --tail=200 app
curl --fail http://127.0.0.1:3000/health
```

Destructive veya geriye uyumsuz migration sonrası rollback, doğrulanmış database
backup’ının geri yüklenmesini gerektirir. Adımlar `docs/RUNBOOK.md` içindedir.

## Release kabul kapıları

- `pnpm install --frozen-lockfile`
- `prisma migrate deploy` temiz PostgreSQL üzerinde iki kez başarılı
- ESLint ve TypeScript exit code `0`
- Tüm unit/property/integration testleri başarılı
- Production audit içinde high/critical açık `0`
- Web ve server production build başarılı
- Docker runtime image build başarılı
- Health, auth/session, campaign idempotency ve backup/restore smoke testleri başarılı
- Coolify staging üzerinde en az 24 saat hata vermeyen soak testi
- `LOAD_TEST_URL=https://staging.example.com/health pnpm test:load` eşiklerinin geçmesi
