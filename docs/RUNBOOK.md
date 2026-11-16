# SIGNAL Operations Runbook

Bu runbook production olaylarında kanıt toplanmasını, geri dönüşü ve veri kaybının
önlenmesini amaçlar.

## Hızlı durum kontrolü

```bash
docker compose ps
docker compose logs --since=15m --tail=300 app
docker compose logs --since=15m --tail=200 db
docker compose logs --since=15m --tail=200 redis
curl --fail http://127.0.0.1:3000/health
```

Kontrol edilmesi gerekenler:

- Container restart sayısı
- PostgreSQL ve Redis health durumu
- Disk ve inode kullanımı
- OOM kill kayıtları
- Son deploy SHA’sı ve son migration
- E-posta kuyruğu gecikmesi, hata ve tekrar sayıları

## Backup

Backup sidecar başlangıçta ve ardından varsayılan olarak 24 saatte bir çalışır.
Dosyalar `backups` volume’unda daily/weekly/monthly olarak tutulur.

Manuel backup:

```bash
docker compose exec backup /app/backup.sh
docker compose exec backup find /backups -maxdepth 2 -type f -name '*.dump' -ls
```

Her backup:

- Custom PostgreSQL formatında üretilir.
- Atomik `.partial` dosyası üzerinden tamamlanır.
- `pg_restore --list` ile okunabilirliği kontrol edilir.
- SHA-256 checksum ile birlikte saklanır.

Local volume tek başına felaket kurtarma değildir. Coolify/Oracle volume snapshot veya
OCI/S3 uyumlu object storage kopyası ayrıca yapılandırılmalı ve farklı hesapta
saklanmalıdır.

## Restore tatbikatı

Tatbikat production database’i değiştirmez; aynı sunucuda geçici bir database
oluşturur, backup’ı yükler, temel tabloları doğrular ve geçici database’i siler.

```bash
docker compose exec backup /app/restore-test.sh
```

Tatbikat en az ayda bir ve her schema değişikliğinden sonra çalıştırılmalıdır. Çıktı,
backup dosyası, Git SHA ve süre operasyon kaydına eklenmelidir.

## Gerçek database restore

Bu işlem destructive’dır. Yalnız onaylı bakım penceresinde:

1. Olay zamanını, etkilenen tenant’ları ve hedef recovery point’i kaydedin.
2. `app` ve `backup` servislerini durdurun.
3. Mevcut bozuk database’in son güvenlik dump’ını ayrı konuma alın.
4. Hedef backup checksum’ını doğrulayın.
5. Önce `restore-test.sh` tatbikatını başarıyla çalıştırın.
6. Database’i temizleyip backup’ı `--exit-on-error --clean --if-exists` ile yükleyin.
7. `prisma migrate status`, tablo sayıları ve kritik tenant kayıtlarını doğrulayın.
8. Uygulamayı başlatın ve smoke testleri tamamlayın.

Örnek bakım komutları:

```bash
docker compose stop app backup
docker compose run --rm --entrypoint /app/backup.sh backup
docker compose run --rm --entrypoint /app/restore-test.sh backup /backups/daily/<backup>.dump
docker compose start app backup
```

Gerçek `pg_restore --clean` komutunu hedef dosya ve recovery point ikinci bir kişi
tarafından doğrulanmadan çalıştırmayın.

## Database olayı

Belirtiler: `/health` 503, `database: error`, migration veya connection timeout.

1. `docker compose logs db` ile crash, disk-full ve recovery kayıtlarını kontrol edin.
2. `docker compose exec db pg_isready` çalıştırın.
3. Disk doluysa rastgele volume veya WAL silmeyin.
4. Son deploy migration’ını `prisma migrate status` ile kontrol edin.
5. Veri bozulması şüphesinde yazma trafiğini durdurup restore prosedürünü uygulayın.

## Redis olayı

Belirtiler: `redis: error`, queue gecikmesi, `OOM command not allowed`.

1. `docker compose logs redis` ve `docker compose exec redis redis-cli INFO memory`
   çıktılarını alın.
2. Redis’i flush etmeyin; BullMQ job verileri kaybolabilir.
3. `noeviction` nedeniyle limit dolduysa önce producer trafiğini durdurun.
4. Bellek limitini kontrollü artırın veya tamamlanmış queue kayıtlarını uygulama
   politikasına göre temizleyin.
5. Redis recovery sonrasında stuck/duplicate job kontrolü yapın.

## Uygulama veya OOM olayı

```bash
docker stats --no-stream
docker inspect signal-app-1
docker compose logs --since=30m app
```

Oracle Free Tier üzerinde önce memory leak ve bundle/worker yükünü doğrulayın.
Container limitini fiziksel belleğin üstüne taşımayın. Süreç restart’ından önce
in-flight campaign job’larının idempotent olduğunu doğrulayın.

## Monitoring

- `GET /health`: Docker/Coolify dependency health.
- `GET /metrics`: `x-metrics-token` header’ı ile Prometheus scrape.
- Sentry: exception ve tracing; production sampling oranı maliyet bütçesine göre.
- Pino logs: request ID, tenant ID ve deploy SHA ile merkezi log hedefi.

Minimum alarmlar:

| Alarm               | Eşik                                                    |
| ------------------- | ------------------------------------------------------- |
| Uygulama erişilemez | 2 dakika boyunca health başarısız                       |
| HTTP 5xx            | 5 dakika boyunca %2 üzeri                               |
| PostgreSQL          | Connection veya disk alarmı                             |
| Redis               | Memory %80 veya queue lag artışı                        |
| Backup              | 26 saatte başarılı backup yok                           |
| Restore tatbikatı   | 35 günden eski                                          |
| E-posta             | Bounce/complaint eşikleri sağlayıcı limitine yaklaşıyor |

Prometheus kuralları `ops/prometheus/alerts.yml` dosyasındadır. Alertmanager routing,
alıcı adresleri ve nöbetçi sahipleri secret/config katmanında tanımlanmalıdır; repository
içine webhook, e-posta veya telefon bilgisi yazılmamalıdır.

### Uygulama erisim alarmi

`SignalTargetDown` tetiklenirse önce `/live`, ardından `/health` ve container restart
sayısını kontrol edin. Dependency sağlıklıysa son deploy'u rollback edin; dependency
bozuksa ilgili DB/Redis prosedürüne geçin.

### HTTP 5xx alarmi

`SignalHttp5xxRateHigh` için route ve status label'larıyla hata kaynağını daraltın,
aynı zaman aralığındaki request ID ve Sentry olaylarını inceleyin. Hatalı kampanya veya
provider trafiğini durdurun; bilinmeyen mutasyonları tekrar çalıştırmayın.

### Dependency alarmi

`SignalDependencyDown` label'ındaki `dependency` değerine göre PostgreSQL veya Redis
health/log kontrolünü uygulayın. Failover kanıtlanmadan servisi sağlıklı işaretlemeyin.

### PostgreSQL baglanti alarmi

`SignalDatabaseConnectionPressure` sırasında `pg_stat_activity` ile uygulama, worker,
backup ve admin bağlantılarını ayırın. Önce sızıntı/uzun sorguyu bulun; yalnızca
`max_connections` artırarak olayı maskelemeyin.

### Redis bellek alarmi

`SignalRedisMemoryPressure` için producer trafiğini ve yeni fan-out'u durdurun. Redis'i
flush etmeyin; `used_memory`, `maxmemory`, queue derinliği ve tamamlanmış iş retention'ını
inceleyin.

### Queue telemetry alarmi

`SignalQueueTelemetryMissing` scrape yetkisi, Redis bağlantısı ve BullMQ queue erişimini
kontrol eder. Telemetry yokken queue sağlığı varsayılmamalı ve büyük kampanya başlatılmamalıdır.

### Queue backlog alarmi

`SignalQueueBacklogHigh` için waiting/active/delayed dağılımını, worker concurrency ve
provider throttle durumunu karşılaştırın. Admission limitini bypass etmeyin.

### Queue lag alarmi

`SignalQueueOldestJobHigh` için en eski işin dispatch/delivery kaydını bulun; idempotency
ledger doğrulanmadan manuel retry veya job silme uygulamayın.

### Queue worker alarmi

`SignalQueueWorkerFailures` sırasında hata sınıfını provider, payload, DB veya kod olarak
ayırın. Poison job'u karantinaya alın; tüm DLQ'yu topluca replay etmeyin.

### Email provider alarmi

Provider failure oranı veya p95 latency alarmında provider dashboard, quota/throttle ve
credential durumunu kontrol edin. Bounce/complaint artışında kampanyayı durdurun; teslimat
kabul edilmeden başarılı gönderim iddiasında bulunmayın.

### AI budget alarmi

`SignalAiBudgetRejected` tetiklenirse ilgili tenant'ın `/api/ai/usage` özetini, model ve
pricing version dağılımını inceleyin. Bütçeyi otomatik artırmayın; ürün sahibi onayı,
marj kontrolü ve güncel resmi provider fiyatı doğrulanmadan limiti değiştirmeyin.

## Staging kapasite kanıtı

Yerleşik smoke yük testi health/readiness yolunu kontrollü eşiklerle ölçer:

```bash
LOAD_TEST_URL=https://staging.example.com/health \
LOAD_TEST_CONCURRENCY=10 \
LOAD_TEST_REQUESTS=500 \
LOAD_TEST_MAX_P95_MS=500 \
LOAD_TEST_MAX_ERROR_RATE=0.01 \
pnpm test:load
```

Sonuç JSON çıktısını release SHA’sı, staging kaynak limitleri ve test zamanı ile
birlikte saklayın. Bu test kampanya gönderim kapasitesini kanıtlamaz; recipient queue
yükü, SES rate limit ve veritabanı davranışı staging’de ayrıca ölçülmelidir.

## Release smoke testi

Her deploy sonrası:

1. Health ve metrics authentication.
2. Login, logout ve reverse proxy arkasında secure session cookie.
3. Container restart sonrası session devamlılığı.
4. Tenant A kullanıcısının Tenant B kaydına erişememesi.
5. Test listesine tek kampanya gönderimi ve duplicate dispatch olmaması.
6. Unsubscribe, bounce ve complaint zincirinin suppression oluşturması.
7. Queue retry/DLQ ve worker restart davranışı.
8. Manuel backup ve isolated restore tatbikatı.

Bu adımlardan biri başarısızsa release tamamlanmış sayılmaz.

## Secret rotation

- `SESSION_SECRET` rotasyonu tüm mevcut session’ları geçersiz kılar.
- Database ve Redis parolaları URL-encoded bağlantı değerleriyle birlikte atomik
  güncellenmelidir.
- E-posta sağlayıcısı key rotasyonunda eski key yalnız test gönderimi başarılı
  olduktan sonra iptal edilmelidir.
- Secret değerleri log veya incident kaydına yazılmamalıdır.
