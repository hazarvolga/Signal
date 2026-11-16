import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Reusable Universal Compliant Headers & Footers
const createEditorialHeader = (badgeText = "EDİTORYAL YAYIN") => `
<div style="border-bottom: 2px solid #8B1A1A; padding-bottom: 16px; margin-bottom: 28px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
    <tr>
      <td align="left" valign="middle">
        <a href="{{ org.website | default: '/' }}" style="text-decoration: none; display: inline-block;">
          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td style="background-color: #8B1A1A; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 900; padding: 4px 9px; border-radius: 3px; letter-spacing: 1.5px;">ABC</td>
              <td style="padding-left: 8px; font-family: 'Playfair Display', Georgia, serif; font-size: 16px; font-weight: 900; color: #1A1814; letter-spacing: 0.5px;">COMPANY</td>
            </tr>
          </table>
        </a>
      </td>
      <td align="right" valign="middle" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #56534E; text-transform: uppercase; font-weight: 700; letter-spacing: 1.5px;">
        ${badgeText}
      </td>
    </tr>
  </table>
</div>
`;

const createModernHeader = (badgeText = "DUYURU") => `
<div style="background-color: #1A1814; padding: 18px 24px; border-bottom: 3px solid #8B1A1A;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
    <tr>
      <td align="left" valign="middle">
        <a href="{{ org.website | default: '/' }}" style="text-decoration: none; display: inline-block;">
          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <tr>
              <td style="background-color: #C9A84C; color: #1A1814; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 900; padding: 4px 8px; border-radius: 3px; letter-spacing: 1px;">ABC</td>
              <td style="padding-left: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 800; color: #FFFFFF; letter-spacing: 1px;">COMPANY</td>
            </tr>
          </table>
        </a>
      </td>
      <td align="right" valign="middle">
        <span style="background-color: #C9A84C; color: #1A1814; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 1px;">
          ${badgeText}
        </span>
      </td>
    </tr>
  </table>
</div>
`;

const createEditorialFooter = () => `
<div style="margin-top: 40px; border-top: 2px solid #E8E4DC; padding-top: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #736E65; font-size: 12px; line-height: 1.6;">
  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 4px 0; font-weight: bold; color: #1A1814; font-size: 13px;">{{ org.name | default: "ABC Company Inc." }}</p>
    <p style="margin: 0 0 4px 0; color: #56534E;">{{ org.address | default: "100 Innovation Way, Suite 400, Tech District" }}</p>
    <p style="margin: 0; color: #56534E;">
      Destek: <a href="mailto:{{ org.support_email | default: 'support@abccompany.test' }}" style="color: #8B1A1A; text-decoration: underline;">{{ org.support_email | default: "support@abccompany.test" }}</a>
    </p>
  </div>

  <div style="background-color: #FAF8F5; border: 1px solid #ECE7DE; border-radius: 4px; padding: 12px 16px; margin-bottom: 18px; font-size: 11px; color: #736E65; line-height: 1.6;">
    Bu ticari elektronik ileti, <strong>{{ org.name | default: "ABC Company Inc." }}</strong> bülten ve etkinlik duyurularına onay vermiş olan <strong>{{ contact.email | default: "kayıtlı e-posta adresinize" }}</strong> özel olarak iletilmiştir. Bilgileriniz 6698 sayılı KVKK ve GDPR kapsamında korunmaktadır.
  </div>

  <div style="text-align: center; border-top: 1px solid #ECE7DE; padding-top: 14px; font-size: 11px; color: #8C877D;">
    <p style="margin: 0 0 8px 0;">
      <a href="{{ unsubscribe_url | default: '/unsubscribe' }}" style="color: #8B1A1A; text-decoration: underline; font-weight: 700; margin-right: 12px;">Abonelikten Çık (Tek Tıkla)</a>
      &bull;
      <a href="{{ preference_center_url | default: '/preferences' }}" style="color: #56534E; text-decoration: underline; margin: 0 10px;">İletişim Tercihlerini Düzenle</a>
      &bull;
      <a href="{{ privacy_policy_url | default: '/privacy' }}" style="color: #56534E; text-decoration: underline; margin-left: 10px;">Gizlilik & KVKK</a>
    </p>
    <p style="margin: 0; font-size: 10px;">&copy; {{ today | date: "%Y" | default: "2026" }} {{ org.name | default: "ABC Company Inc." }}. Tüm hakları saklıdır.</p>
  </div>
</div>
`;

const createModernFooter = () => `
<div style="background-color: #F8F9FA; border-top: 1px solid #E9ECEF; padding: 28px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #6C757D; line-height: 1.6; text-align: center;">
  <div style="margin-bottom: 16px;">
    <p style="font-weight: 700; color: #212529; font-size: 13px; margin: 0 0 4px 0;">{{ org.name | default: "ABC Company Inc." }}</p>
    <p style="margin: 0 0 4px 0;">{{ org.address | default: "100 Innovation Way, Suite 400, Tech District" }}</p>
    <p style="margin: 0;">
      Müşteri İletişim: <a href="mailto:{{ org.support_email | default: 'support@abccompany.test' }}" style="color: #0D6EFD; text-decoration: none;">{{ org.support_email | default: "support@abccompany.test" }}</a>
    </p>
  </div>

  <div style="border-top: 1px dashed #DEE2E6; padding-top: 14px; margin-top: 14px; font-size: 11px; color: #868E96;">
    <p style="margin: 0 0 8px 0;">
      Bu bilgilendirme iletisi, bültenimize veya servislerimize kaydolduğunuz için <strong>{{ contact.email | default: "e-posta adresinize" }}</strong> gönderilmiştir.
    </p>
    <p style="margin: 0 0 8px 0;">
      <a href="{{ unsubscribe_url | default: '/unsubscribe' }}" style="color: #DC3545; font-weight: 700; text-decoration: underline; margin-right: 12px;">Abonelikten Çık (Tek Tıkla)</a>
      |
      <a href="{{ preference_center_url | default: '/preferences' }}" style="color: #495057; text-decoration: underline; margin: 0 10px;">Bildirim Tercihleri</a>
      |
      <a href="{{ privacy_policy_url | default: '/privacy' }}" style="color: #495057; text-decoration: underline; margin-left: 10px;">Gizlilik Politikası</a>
    </p>
    <p style="margin: 0; font-size: 10px; color: #ADB5BD;">&copy; {{ today | date: "%Y" | default: "2026" }} {{ org.name | default: "ABC Company Inc." }}. Tüm hakları saklıdır.</p>
  </div>
</div>
`;

const templates = [
  {
    name: "The Executive Welcome (Kurucu Hoş Geldiniz Mektubu)",
    category: "ONBOARDING",
    content: `<div style="background-color: #F5F2EC; padding: 40px 20px; font-family: 'Playfair Display', Georgia, serif; color: #1A1814;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #D4CFC6; padding: 40px 32px;">
    ${createEditorialHeader("KURUCU MEKTUBU")}
    <h1 style="font-size: 26px; font-weight: bold; margin-bottom: 20px; line-height: 1.3;">Aramıza Hoş Geldiniz, {{ contact.name | default: "Değerli Müşterimiz" }}.</h1>
    <p style="font-size: 15px; line-height: 1.8; color: #2C2B29; margin-bottom: 20px;">
      Gürültülü dijital dünyada, gerçek etki yaratan kurumsal iletişimin sırrı hızda değil; doğruluk, derinlik ve zarafettedir. {{ org.name | default: "ABC Company" }} topluluğuna katıldığınız için şahsen teşekkür ederim.
    </p>
    <p style="font-size: 15px; line-height: 1.8; color: #2C2B29; margin-bottom: 24px;">
      Önümüzdeki dönemde sektörün önde gelen uzmanlarından editoryal vaka analizleri, iş akışı rehberleri ve en yeni teknoloji duyurularını doğrudan gelen kutunuzda bulacaksınız.
    </p>
    <div style="background: #FAF8F5; border-left: 3px solid #C9A84C; padding: 16px 20px; margin: 28px 0;">
      <p style="font-style: italic; font-size: 14px; margin: 0; color: #4A463F; line-height: 1.6;">
        "Doğru zamanda, doğru kitleye, doğru sözcüklerle ulaşan her mesaj; bir bildirimin ötesinde kalıcı bir güven inşa eder."
      </p>
    </div>
    <div style="margin: 32px 0; text-align: center;">
      <a href="{{ preference_center_url | default: '/preferences' }}" style="background-color: #8B1A1A; color: #FFFFFF; padding: 14px 32px; font-family: -apple-system, sans-serif; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; text-decoration: none; display: inline-block;">
        İletişim Tercihlerinizi Belirleyin
      </a>
    </div>
    <div style="border-top: 1px solid #E8E4DC; padding-top: 20px; margin-top: 36px;">
      <p style="font-size: 14px; margin: 0 0 4px 0; font-weight: bold;">Yönetim Ekibi</p>
      <p style="font-size: 12px; color: #736E65; margin: 0; font-family: -apple-system, sans-serif;">{{ org.name | default: "ABC Company Inc." }}</p>
    </div>
    ${createEditorialFooter()}
  </div>
</div>`
  },
  {
    name: "Platform 3-Adımda Hızlı Başlangıç Kılavuzu",
    category: "ONBOARDING",
    content: `<div style="background-color: #F8F9FA; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 8px; border: 1px solid #E9ECEF; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    ${createModernHeader("HIZLI BAŞLANGIÇ")}
    <div style="background: #212529; color: #FFFFFF; padding: 28px 32px; text-align: center;">
      <h1 style="font-size: 22px; margin: 0 0 8px 0; color: #FFFFFF;">3 Adımda İlk Projenizi Başlatın</h1>
      <p style="color: #ADB5BD; font-size: 14px; margin: 0;">Sayın {{ contact.name | default: "Kullanıcımız" }}, hesabınız hazır!</p>
    </div>
    <div style="padding: 32px;">
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="background: #8B1A1A; color: #FFFFFF; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">1</div>
        <div>
          <h3 style="margin: 0 0 6px 0; font-size: 16px;">Hesabınızı Doğrulayın</h3>
          <p style="margin: 0; font-size: 13px; color: #6C757D; line-height: 1.5;">Panelinizden profil bilgilerinizi ve güvenlik tercihlerinizi güncelleyin.</p>
        </div>
      </div>
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="background: #8B1A1A; color: #FFFFFF; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">2</div>
        <div>
          <h3 style="margin: 0 0 6px 0; font-size: 16px;">Şablonları İnceleyin</h3>
          <p style="margin: 0; font-size: 13px; color: #6C757D; line-height: 1.5;">Hazır kütüphaneden işinize en uygun şablonu seçin.</p>
        </div>
      </div>
      <div style="display: flex; gap: 16px; margin-bottom: 32px;">
        <div style="background: #8B1A1A; color: #FFFFFF; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">3</div>
        <div>
          <h3 style="margin: 0 0 6px 0; font-size: 16px;">İlk Kampanyanızı Yayınlayın</h3>
          <p style="margin: 0; font-size: 13px; color: #6C757D; line-height: 1.5;">Metrikleri ve açılma oranlarını gerçek zamanlı takip edin.</p>
        </div>
      </div>
      <div style="text-align: center;">
        <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #8B1A1A; color: #FFFFFF; padding: 14px 32px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Hemen Başlayın</a>
      </div>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "The Curated Digest (Haftalık Editoryal Bülten)",
    category: "NEWSLETTER",
    content: `<div style="background-color: #F4F1EA; padding: 40px 16px; font-family: 'Playfair Display', Georgia, serif; color: #171614;">
  <div style="max-width: 620px; margin: 0 auto; background: #FCFAF7; border: 1px solid #D9D4CA; padding: 36px 28px;">
    ${createEditorialHeader("HAFTALIK SEÇKİ")}
    <div style="text-align: center; border-bottom: 3px double #171614; padding-bottom: 20px; margin-bottom: 28px;">
      <h1 style="font-size: 32px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">{{ org.name | default: "ABC COMPANY" }} DISPATCH</h1>
      <p style="font-family: 'Source Serif 4', Georgia, serif; font-style: italic; font-size: 13px; color: #6E685E; margin: 8px 0 0 0;">Sayı #48 • {{ today | date: "%d %B %Y" | default: "Ekim 2026" }}</p>
    </div>
    
    <div style="margin-bottom: 32px;">
      <span style="background: #8B1A1A; color: #FFFFFF; font-family: -apple-system, sans-serif; font-size: 10px; font-weight: bold; padding: 3px 8px; text-transform: uppercase;">MANŞET</span>
      <h2 style="font-size: 22px; font-weight: bold; margin: 12px 0 10px 0; line-height: 1.3;">2026'da Dijital Dönüşüm ve Verimlilik Trendleri</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #36332E; margin-bottom: 14px;">
        Kurumsal iş akışlarında üretken otomasyon ve veriye dayalı karar alma süreçleri tarihin en büyük verimlilik sıçramasını yaşatıyor. Bu haftaki sayımızda öne çıkan 3 kritik analizi paylaşıyoruz...
      </p>
      <a href="{{ preference_center_url | default: '/preferences' }}" style="font-family: -apple-system, sans-serif; font-size: 12px; font-weight: bold; color: #8B1A1A; text-decoration: none;">Bülten Detaylarını Gör &rarr;</a>
    </div>

    <div style="border-top: 1px solid #E8E4DC; padding-top: 24px; margin-bottom: 32px;">
      <h3 style="font-family: -apple-system, sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8B1A1A; margin-bottom: 16px;">Haftanın Öne Çıkan Başlıkları</h3>
      <div style="margin-bottom: 16px;">
        <h4 style="font-size: 16px; margin: 0 0 6px 0; font-weight: bold;">Sürdürülebilir Operasyon Yönetimi</h4>
        <p style="font-size: 13px; color: #56534E; margin: 0; line-height: 1.6;">Operasyonel maliyetleri %40 azaltan yeni nesil bulut stratejileri.</p>
      </div>
      <div>
        <h4 style="font-size: 16px; margin: 0 0 6px 0; font-weight: bold;">Veri Güvenliği ve Modern Uyum Standartları</h4>
        <p style="font-size: 13px; color: #56534E; margin: 0; line-height: 1.6;">KVKK ve GDPR süreçlerinde sıfır güven (Zero-Trust) mimarisi.</p>
      </div>
    </div>
    ${createEditorialFooter()}
  </div>
</div>`
  },
  {
    name: "Vaka Analizi & Müşteri Başarı Hikayesi",
    category: "NEWSLETTER",
    content: `<div style="background-color: #F8F9FA; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E9ECEF; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
    ${createModernHeader("VAKA ANALİZİ")}
    <div style="padding: 32px;">
      <span style="font-size: 11px; font-weight: 800; color: #8B1A1A; text-transform: uppercase; letter-spacing: 1px;">BAŞARI HİKAYESİ</span>
      <h1 style="font-size: 22px; font-weight: bold; margin: 10px 0 16px 0; line-height: 1.4;">Büyük Ölçekli Operasyonda 4 Ayda %45 Verimlilik Artışı</h1>
      <p style="font-size: 14px; color: #495057; line-height: 1.7; margin-bottom: 24px;">
        Sayın {{ contact.name | default: "Değerli Müşterimiz" }}, modern iletişim ve süreç optimizasyonu ile operasyonel tıkanıklıkların nasıl çözüldüğünü inceleyin.
      </p>

      <div style="background: #F8F9FA; border-left: 4px solid #8B1A1A; padding: 20px; margin-bottom: 28px;">
        <div style="display: flex; justify-content: space-around; text-align: center;">
          <div>
            <span style="font-size: 28px; font-weight: 900; color: #8B1A1A; display: block;">%45</span>
            <span style="font-size: 11px; color: #6C757D; text-transform: uppercase;">Zaman Tasarrufu</span>
          </div>
          <div>
            <span style="font-size: 28px; font-weight: 900; color: #8B1A1A; display: block;">3 Kat</span>
            <span style="font-size: 11px; color: #6C757D; text-transform: uppercase;">İşlem Hızı</span>
          </div>
          <div>
            <span style="font-size: 28px; font-weight: 900; color: #8B1A1A; display: block;">%99</span>
            <span style="font-size: 11px; color: #6C757D; text-transform: uppercase;">Müşteri Skoru</span>
          </div>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #8B1A1A; color: #FFFFFF; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 13px; text-decoration: none; display: inline-block;">Raporun Tamamını İnceleyin</a>
      </div>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "Büyük Ürün Lansmanı & Sürüm Duyurusu",
    category: "ANNOUNCEMENT",
    content: `<div style="background-color: #0E0D0B; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #FFFFFF;">
  <div style="max-width: 620px; margin: 0 auto; background: #171614; border: 1px solid #2C2B29; border-radius: 8px; overflow: hidden;">
    ${createModernHeader("YENİ SÜRÜM")}
    <div style="padding: 40px 32px; text-align: center;">
      <span style="background: #C9A84C; color: #171614; font-size: 11px; font-weight: 900; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1.5px;">RESMİ LANSMAN</span>
      <h1 style="font-size: 28px; font-weight: 900; margin: 20px 0 12px 0; letter-spacing: -0.5px;">Yeni Nesil Platform Canlıda!</h1>
      <p style="font-size: 15px; color: #A8A29E; line-height: 1.6; max-width: 480px; margin: 0 auto 32px auto;">
        Sayın {{ contact.name | default: "Değerli Kullanıcımız" }}, aylar süren yoğun geliştirme sürecinin ardından en kapsamlı güncellememizi sizlere sunmaktan mutluluk duyuyoruz.
      </p>

      <div style="background: #23221F; border: 1px solid #383632; border-radius: 6px; padding: 24px; text-align: left; margin-bottom: 32px;">
        <h3 style="color: #C9A84C; font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Öne Çıkan Başlıklar</h3>
        <p style="font-size: 13px; color: #D6D3D1; margin: 0 0 8px 0;">⚡ <strong>%200 Daha Hızlı Yükleme:</strong> Optimize edilen altyapı ile işlemler anında gerçekleşir.</p>
        <p style="font-size: 13px; color: #D6D3D1; margin: 0 0 8px 0;">🧠 <strong>Yapay Zeka Destekli Araçlar:</strong> İçerik ve analiz süreçleri otomatikleştirildi.</p>
        <p style="font-size: 13px; color: #D6D3D1; margin: 0;">🌐 <strong>Gelişmiş Çoklu Kiracı Desteği:</strong> Ekipler arası güvenli ve izole çalışma ortamı.</p>
      </div>

      <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #8B1A1A; color: #FFFFFF; padding: 16px 36px; border-radius: 4px; font-weight: bold; font-size: 14px; text-decoration: none; display: inline-block;">Sürüm Yeniliklerini Keşfedin</a>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "Yazılım Güncellemesi & Yenilikler Bülteni (Changelog)",
    category: "ANNOUNCEMENT",
    content: `<div style="background-color: #F8F9FA; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E9ECEF; border-radius: 8px; overflow: hidden;">
    ${createModernHeader("GÜNCELLEME NOTLARI")}
    <div style="padding: 32px;">
      <span style="font-size: 11px; font-weight: bold; color: #6C757D; text-transform: uppercase;">SÜRÜM V2026.4</span>
      <h1 style="font-size: 22px; font-weight: bold; margin: 8px 0 16px 0;">Son Güncellemeler ve İyileştirmeler</h1>
      <p style="font-size: 14px; color: #6C757D; margin-bottom: 28px;">
        Merhaba {{ contact.name | default: "Kullanıcımız" }}, bu ay yaptığımız geliştirmeler ve hata düzeltmeleri aşağıda özetlenmiştir:
      </p>

      <div style="margin-bottom: 24px;">
        <span style="background: #D4EDDA; color: #155724; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">YENİ</span>
        <h4 style="font-size: 15px; margin: 8px 0 4px 0;">Yeni Nesil Güvenlik ve Uyum Araçları</h4>
        <p style="font-size: 13px; color: #6C757D; margin: 0;">Tek tıkla çıkış ve gizlilik tercihleri tam otomatik hale getirildi.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <span style="background: #CCE5FF; color: #004085; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">GELİŞTİRME</span>
        <h4 style="font-size: 15px; margin: 8px 0 4px 0;">Performans ve Sayfa Yükleme Optimizasyonu</h4>
        <p style="font-size: 13px; color: #6C757D; margin: 0;">Raporlama ekranları büyük verilerde 3 kat hızlandırıldı.</p>
      </div>

      <div style="margin-bottom: 32px;">
        <span style="background: #FFF3CD; color: #856404; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">DÜZELTME</span>
        <h4 style="font-size: 15px; margin: 8px 0 4px 0;">Mobil Cihazlarda E-posta Görünüm Düzenlemesi</h4>
        <p style="font-size: 13px; color: #6C757D; margin: 0;">iOS ve Android istemcilerinde padding uyumsuzlukları giderildi.</p>
      </div>

      <div style="text-align: center;">
        <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #212529; color: #FFFFFF; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">Tüm Güncelleme Geçmişini İnceleyin</a>
      </div>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "2026 Ürün Lansmanı E-posta Şablonu",
    category: "ANNOUNCEMENT",
    content: `<div style="background-color: #F8F9FA; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E9ECEF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    ${createModernHeader("MİMARLIK & MÜHENDİSLİK LANSMANI")}
    <div style="padding: 36px 32px; text-align: center;">
      <span style="background: #8B1A1A; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">SÜRÜM 2026</span>
      <h1 style="font-size: 26px; font-weight: bold; margin: 16px 0 12px 0; color: #1A1814;">Geleceğin Dijital Dünyasına Adım Atın</h1>
      <p style="font-size: 14px; color: #6C757D; line-height: 1.6; margin-bottom: 28px;">
        Sayın {{ contact.name | default: "Değerli Müşterimiz" }}, yeni nesil 2026 sürümü ile iş akışlarınızda yüksek performans ve parametrik tasarım kolaylığı başlıyor.
      </p>

      <div style="background: #FDF9F5; border: 1px solid #F5EBE1; border-radius: 6px; padding: 20px; margin-bottom: 28px; text-align: left;">
        <h3 style="color: #8B1A1A; font-size: 14px; margin: 0 0 10px 0;">Lansmana Özel Avantajlar:</h3>
        <p style="font-size: 13px; color: #495057; margin: 0 0 6px 0;">• Ücretsiz 30 Günlük Tam Sürüm Deneme Erişimi</p>
        <p style="font-size: 13px; color: #495057; margin: 0 0 6px 0;">• 1-e-1 Uzman Teknik Danışmanlık ve Demo</p>
        <p style="font-size: 13px; color: #495057; margin: 0;">• Yıllık Yenilemelerde Özel Lansman İndirimi</p>
      </div>

      <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #8B1A1A; color: #FFFFFF; padding: 14px 32px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
        Ücretsiz Demo Talebi Oluşturun
      </a>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "Sınırlı Süreli Özel Teklif & İndirim",
    category: "PROMOTION",
    content: `<div style="background-color: #F8F9FA; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 2px solid #8B1A1A; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(139,26,26,0.08);">
    ${createModernHeader("ÖZEL KAMPANYA")}
    <div style="padding: 36px 32px; text-align: center;">
      <span style="background: #8B1A1A; color: #FFFFFF; font-size: 10px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">SINIRLI SÜRE</span>
      <h1 style="font-size: 26px; font-weight: 900; margin: 16px 0 10px 0; color: #8B1A1A;">Yıllık Planlarda %25 Özel İndirim</h1>
      <p style="font-size: 14px; color: #6C757D; margin-bottom: 24px;">
        Sayın {{ contact.name | default: "Değerli Müşterimiz" }}, bu döneme özel olarak tanımlanan avantajlı fiyatlandırmadan faydalanın.
      </p>

      <div style="background: #FDF2E9; border: 2px dashed #E67E22; border-radius: 8px; padding: 20px; margin-bottom: 28px; display: inline-block; min-width: 260px;">
        <span style="font-size: 11px; color: #D35400; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">KUPON KODUNUZ</span>
        <div style="font-size: 24px; font-weight: 900; color: #D35400; letter-spacing: 3px; margin: 6px 0;">PROMO25</div>
        <span style="font-size: 11px; color: #7F8C8D;">Son Gün: Bu Ay Sonu</span>
      </div>

      <div>
        <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #8B1A1A; color: #FFFFFF; padding: 14px 36px; border-radius: 4px; font-weight: bold; font-size: 14px; text-decoration: none; display: inline-block;">Teklifi Hemen Kullanın</a>
      </div>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "Kaldığınız Yerden Devam Edin (Browse Recovery)",
    category: "PROMOTION",
    content: `<div style="background-color: #F8F9FA; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E9ECEF; border-radius: 8px; overflow: hidden;">
    ${createModernHeader("HATIRLATMA")}
    <div style="padding: 32px;">
      <h1 style="font-size: 22px; font-weight: bold; margin: 0 0 12px 0;">İncelediğiniz Paket Sizi Bekliyor</h1>
      <p style="font-size: 14px; color: #6C757D; line-height: 1.6; margin-bottom: 24px;">
        Merhaba {{ contact.name | default: "Ziyaretçimiz" }}, ürün sayfamızı incelediğinizi fark ettik. Aklınıza takılan sorular ve demo talepleri için ekibimiz yardıma hazır.
      </p>

      <div style="border: 1px solid #E9ECEF; border-radius: 6px; padding: 20px; display: flex; gap: 16px; align-items: center; margin-bottom: 28px;">
        <div style="background: #8B1A1A; color: #FFFFFF; font-size: 24px; width: 48px; height: 48px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">🚀</div>
        <div>
          <h4 style="margin: 0 0 4px 0; font-size: 15px;">Kurumsal Enterprise Paketi</h4>
          <p style="margin: 0; font-size: 12px; color: #6C757D;">Sınırsız otomasyon, öncelikli API ve 7/24 teknik destek.</p>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #8B1A1A; color: #FFFFFF; padding: 14px 32px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">Kaldığınız Yerden Devam Edin</a>
      </div>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "Webinar & Canlı Yayın Davetiyesi",
    category: "EVENTS",
    content: `<div style="background-color: #1A1814; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #FFFFFF;">
  <div style="max-width: 600px; margin: 0 auto; background: #23221F; border: 1px solid #383632; border-radius: 8px; overflow: hidden;">
    ${createModernHeader("CANLI YAYIN DAVETİYESİ")}
    <div style="padding: 36px 32px;">
      <span style="background: #8B1A1A; color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">ONLINE ATÖLYE</span>
      <h1 style="font-size: 24px; font-weight: bold; margin: 16px 0 12px 0; line-height: 1.3;">Geleceğin Otomasyon ve Veri Akışları</h1>
      <p style="font-size: 14px; color: #A8A29E; line-height: 1.6; margin-bottom: 24px;">
        Sayın {{ contact.name | default: "Değerli Katılımcımız" }}, canlı yayında kurumsal veri akışlarının nasıl optimize edildiğini sektör uzmanlarıyla birlikte ele alacağız.
      </p>

      <div style="background: #2C2B29; border-radius: 6px; padding: 20px; margin-bottom: 28px;">
        <div style="display: flex; gap: 24px;">
          <div>
            <span style="font-size: 11px; color: #C9A84C; font-weight: bold; text-transform: uppercase;">TARİH</span>
            <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: bold;">Bu Perşembe</p>
          </div>
          <div>
            <span style="font-size: 11px; color: #C9A84C; font-weight: bold; text-transform: uppercase;">SAAT</span>
            <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: bold;">14:00 - 15:00 (TSİ)</p>
          </div>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #C9A84C; color: #171614; padding: 14px 36px; border-radius: 4px; font-weight: bold; font-size: 14px; text-decoration: none; display: inline-block;">Ücretsiz Kaydınızı Tamamlayın</a>
      </div>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "Etkinlik Başlıyor Hatırlatması (Son 1 Saat)",
    category: "EVENTS",
    content: `<div style="background-color: #F8F9FA; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 2px solid #E67E22; border-radius: 8px; overflow: hidden;">
    ${createModernHeader("SON HATIRLATMA")}
    <div style="padding: 36px 32px; text-align: center;">
      <span style="background: #FDF2E9; color: #D35400; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">⏰ BAŞLAMAK ÜZERE</span>
      <h1 style="font-size: 24px; font-weight: bold; margin: 16px 0 10px 0;">Yayınımız 1 Saat İçinde Başlıyor!</h1>
      <p style="font-size: 14px; color: #6C757D; margin-bottom: 24px;">
        Merhaba {{ contact.name | default: "Katılımcımız" }}, kayıt olduğunuz online etkinlik için yeriniz hazırlandı.
      </p>

      <div style="margin-bottom: 28px;">
        <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #8B1A1A; color: #FFFFFF; padding: 14px 36px; border-radius: 4px; font-weight: bold; font-size: 14px; text-decoration: none; display: inline-block;">
          Canlı Yayın Odasına Katılın &rarr;
        </a>
      </div>
      <p style="font-size: 12px; color: #ADB5BD; margin: 0;">Teknik sorularınız için lütfen doğrudan bu e-postayı yanıtlayın.</p>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "NPS & Müşteri Memnuniyeti Değerlendirme Anketi",
    category: "FEEDBACK",
    content: `<div style="background-color: #F8F9FA; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #DEE2E6; border-radius: 8px; padding: 36px 28px; text-align: center;">
    ${createModernHeader("GERİ BİLDİRİM")}
    <div style="padding: 24px 8px;">
      <h1 style="font-size: 22px; font-weight: bold; margin: 0 0 12px 0;">Deneyiminizi Nasıl Değerlendirirsiniz?</h1>
      <p style="font-size: 14px; color: #6C757D; line-height: 1.6; margin: 0 0 28px 0;">
        Sayın {{ contact.name | default: "Kullanıcımız" }}, {{ org.name | default: "ABC Company" }} hizmetlerini bir meslektaşınıza veya iş ortağınıza tavsiye etme olasılığınız nedir?
      </p>

      <div style="margin-bottom: 24px; text-align: center;">
        <div style="display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            .map(
              (n) =>
                `<a href="{{ preference_center_url | default: '/preferences' }}?score=${n}" style="display: inline-block; width: 34px; height: 34px; line-height: 34px; background: #F8F9FA; border: 1px solid #CED4DA; border-radius: 4px; color: #495057; font-weight: bold; font-size: 13px; text-decoration: none;">${n}</a>`
            )
            .join("\n          ")}
        </div>
        <div style="display: flex; justify-content: space-between; max-width: 400px; margin: 10px auto 0 auto; font-size: 11px; color: #ADB5BD;">
          <span>Hiç Olası Değil (1)</span>
          <span>Kesinlikle Tavsiye Ederim (10)</span>
        </div>
      </div>

      <p style="font-size: 12px; color: #ADB5BD; margin: 0;">Anketimiz sadece 30 saniye sürer.</p>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  },
  {
    name: "Sizi Aramızda Görmeyi Özledik (Win-Back)",
    category: "RETENTION",
    content: `<div style="background-color: #F8F9FA; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #212529;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #DEE2E6; border-radius: 8px; overflow: hidden; text-align: center;">
    ${createModernHeader("GERİ DÖNÜŞ FIRSATI")}
    <div style="padding: 36px 28px;">
      <span style="font-size: 36px; display: block; margin-bottom: 12px;">👋</span>
      <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 12px 0;">Sizi Özledik, {{ contact.name | default: "Değerli Müşterimiz" }}!</h1>
      <p style="font-size: 14px; color: #6C757D; line-height: 1.6; margin: 0 0 24px 0;">
        Bir süredir bültenlerimizi ve güncellemelerimizi incelemediğinizi fark ettik. Sizi sıkmak istemiyoruz; ancak son dönemde eklediğimiz yenilikleri kaçırmanızı da istemeyiz.
      </p>

      <div style="background: #FDF9F5; border-radius: 4px; padding: 20px; margin-bottom: 24px; text-align: left;">
        <h4 style="font-size: 14px; margin: 0 0 8px 0; color: #8B1A1A;">Son Dönemde Neler Oldu?</h4>
        <p style="font-size: 13px; color: #495057; margin: 0 0 6px 0;">• Yeni yapay zeka araçları ve şablon kütüphaneleri eklendi.</p>
        <p style="font-size: 13px; color: #495057; margin: 0 0 6px 0;">• Performans ve açılış süreleri 2 kat hızlandırıldı.</p>
        <p style="font-size: 13px; color: #495057; margin: 0;">• Kullanıcılarımıza özel ücretsiz kaynak havuzu açıldı.</p>
      </div>

      <div style="margin-bottom: 24px;">
        <a href="{{ preference_center_url | default: '/preferences' }}" style="background: #8B1A1A; color: #FFFFFF; padding: 14px 32px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 13px; display: inline-block;">
          Platforma Yeniden Göz Atın
        </a>
      </div>
    </div>
    ${createModernFooter()}
  </div>
</div>`
  }
];

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error("No organization found in database!");
  }

  console.log(`Seeding 13 multi-tenant generic templates for organization: ${org.name} (${org.id})`);

  for (const t of templates) {
    const existing = await prisma.template.findFirst({
      where: { name: t.name, organizationId: org.id }
    });

    if (existing) {
      await prisma.template.update({
        where: { id: existing.id },
        data: {
          content: t.content,
          category: t.category,
          status: "APPROVED"
        }
      });
      console.log(`  Updated: ${t.name}`);
    } else {
      await prisma.template.create({
        data: {
          name: t.name,
          category: t.category,
          content: t.content,
          status: "APPROVED",
          organizationId: org.id
        }
      });
      console.log(`  Created: ${t.name}`);
    }
  }

  const count = await prisma.template.count({ where: { organizationId: org.id } });
  console.log(`✅ Total templates in DB: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
