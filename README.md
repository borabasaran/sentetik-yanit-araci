# Sentetik Öğrenci Yanıtı Üretim Aracı — Kurulum ve Kullanım Kılavuzu

Tek dosyalık (`index.html`) statik web uygulaması. Öğrenci, araştırmacının gönderdiği Google Forms linkini yapıştırır, kendi LLM API anahtarını (varsayılan: Gemini) girer; araç formu çözümler, LLM'e öğrencinin profiline dayanarak doldurtur ve üretilen yanıtları forma gönderir.

---

## 1. GitHub Pages'e Yükleme

1. GitHub'da yeni bir depo oluşturun (ör. `sentetik-yanit-araci`), **Public** seçin.
2. `index.html` dosyasını deponun kök dizinine yükleyin (Add file → Upload files).
3. Depo → **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main` / `(root)` → Save.
4. Birkaç dakika içinde adres hazır olur: `https://KULLANICIADI.github.io/sentetik-yanit-araci/`
5. Bu linki öğrencilere 2. oturum yönergesiyle birlikte gönderin.

---

## 2. Google Forms Tarafında Yapılması Gerekenler (Araştırmacı)

**KRİTİK — Metodolojik ayrım:** Bu araca yapıştırılacak form, öğrencilerin kendi doldurduğu ana anket **DEĞİL**, sentetik yanıtlar için açtığınız **ayrı kopya form** olmalıdır (ör. ana formun kopyası, başlığı "… — Sentetik Yanıt Formu"). Böylece insan verisi ile sentetik veri hiçbir zaman aynı yanıt havuzuna karışmaz (bkz. Ek-4 LLM Protokolü, ilke 1).

Sentetik formda ayarlar:
- **Ayarlar → Yanıtlar:** "E-posta adreslerini topla" **KAPALI**; "Oturum açma gerekli / kuruluşla sınırla" **KAPALI**; "Yanıtları 1 ile sınırla" **KAPALI**. (Aksi hâlde araç formu okuyamaz ve gönderemez.)
- Formun **ilk sorusu** kısa yanıtlı "**Anonim kodunuz**" olmalıdır. Araç, başlığında "anonim" veya "kod" geçen ilk kısa-yanıt sorusunu otomatik olarak öğrencinin girdiği kodla doldurur ve bu soruyu LLM'e göndermez.
- Desteklenen soru türleri: kısa yanıt, paragraf, çoktan seçmeli, açılır liste, onay kutuları, doğrusal ölçek, çoktan seçmeli tablo (grid). Tarih/saat/dosya yükleme soruları atlanır — sentetik formda bunları kullanmayın.
- Ölçek/grid seçenek etiketleri sade tutulursa ("1"–"5") eşleştirme en sağlıklı çalışır.

---

## 3. Öğrenci Akışı (P1–P5)

1. **P1 — Kod ve profil:** Anonim kod + kısa profil + A10 tanıtım metni (1. oturumdakiyle aynı).
2. **P2 — Anket linki:** Sentetik form linki yapıştırılır; araç formu getirir, soruları ve `entry` kimliklerini listeler.
3. **P3 — Yapay zekâ erişimi:** Sağlayıcı (Gemini varsayılan; OpenAI ve Claude da desteklenir), model ve API anahtarı. Anahtar yalnızca tarayıcıdan doğrudan sağlayıcıya gider; sayfada saklanmaz, hiçbir sunucuya iletilmez.
4. **P4 — Yanıt üretimi:** Araç, kısa profil ve A10 metnini prompta açıkça ekler; modelden bu bilgilerle çelişmeyen, idealize edilmemiş öğrenci yanıtları ister (temperature = 0.8). Yanıtlar salt-okunur gösterilir; öğrenci düzenleyemez, yalnızca yeniden üretebilir ve **deneme sayısı loglanır**. Üretim 45 saniyede zaman aşımına uğrar ve kullanıcı işlemi iptal edebilir.
5. **P5 — Gönderim:** Yanıtlar Google Forms'a gizli form POST'u ile iletilir. Google sonucu farklı kökenden olduğu için tarayıcı kesin teslim bilgisini okuyamaz; uygulama yalnızca **iletim denendi** der. Araştırmacı yanıtı Forms → Yanıtlar bölümünde doğrulamalıdır. Öğrenci isterse üretim kaydını (JSON: prompt, model, ham çıktı, deneme sayısı, zaman damgası) indirebilir.

---

## 4. Teknik Notlar ve Sınırlılıklar

- **Form okuma aracısı:** Google Forms sayfası tarayıcıdan doğrudan okunamadığı için araç yalnızca `DEFAULT_PROXY` ile yapılandırılmış Google Apps Script aracısını kullanır. Genel, üçüncü taraf CORS proxy'lerine veri göndermez. Form bağlantısı ve form soruları bu aracıdan geçer; araştırma öncesinde aracının sahipliği ve erişim politikası doğrulanmalıdır.
- **Gönderim mekanizması:** Yanıtlar `formResponse` uç noktasına gizli form POST'u ile iletilir. Tarayıcı güvenliği nedeniyle Google'dan dönen sonuç okunamaz; araç kesin başarı iddiasında bulunmaz. **Pilotta ve uygulamada doğrulayın:** gönderimden sonra formun Yanıtlar sekmesinde kaydın göründüğünü kontrol edin.
- **Model listesi:** Gemini, OpenAI ve Anthropic için model zincirleri `MODEL_CHAIN` sabitinde tanımlıdır. Model adları zamanla değişebileceği için pilot öncesinde sağlayıcı hesaplarıyla doğrulanmalıdır.
- **Gizlilik:** Sayfa kalıcı tarayıcı depolaması kullanmaz. Form bağlantısı ve sorular Google Apps Script aracısından geçer. LLM'e kısa profil, A10 metni ve anket soruları gider; anonim kod LLM'e gönderilmez ve yalnız forma yazılır. API anahtarı yalnız seçilen model sağlayıcısına gönderilir. İndirilen üretim kaydı profil/A10 içeren promptu ve anonim kodu içerir; güvenli saklanmalıdır.
- **Zorunlu soru koruması:** Model zorunlu bir soruyu geçerli seçenekle yanıtlamazsa gönderime izin verilmez; öğrenciden yeniden üretmesi istenir.

## 5. Pilot Kontrol Listesi

- [ ] Sentetik form kopyası oluşturuldu, başlığı ayrıştırıldı, oturum açma kapalı
- [ ] İlk soru "Anonim kodunuz" (kısa yanıt)
- [ ] Araç linki GitHub Pages'te açılıyor (masaüstü + telefon)
- [ ] Test profiliyle uçtan uca deneme: form çözümleme → üretim → gönderim → Yanıtlar sekmesinde kayıt
- [ ] Grid/ölçek maddeleri doğru eşleşiyor
- [ ] JSON üretim kaydı iniyor ve okunuyor

---

## 6. Form Aracısı: Google Apps Script

Araç yalnızca formu Google'ın altyapısı üzerinden okuyan bir Apps Script aracısı kullanır:

1. **script.google.com** → New project
2. Editöre şunu yapıştırın:
```javascript
function doGet(e) {
  var url = e.parameter.url;
  var cb = e.parameter.callback;
  var out;
  if (!url || (url.indexOf("https://docs.google.com/forms/") !== 0 && url.indexOf("https://forms.gle/") !== 0)) {
    out = "invalid url";
  } else {
    out = UrlFetchApp.fetch(url, {followRedirects: true, muteHttpExceptions: true}).getContentText();
  }
  if (cb) {
    return ContentService.createTextOutput(cb + "(" + JSON.stringify(out) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.TEXT);
}
```

Not: Kodu güncellediyseniz **Deploy → Manage deployments → (kalem) Edit → Version: New version → Deploy** yapmalısınız; aksi hâlde eski kod çalışmaya devam eder. Web app URL'si değişmez.
3. **Deploy → New deployment → Web app** → Execute as: *Me* · Who has access: **Anyone** → Deploy
4. Çıkan `https://script.google.com/macros/s/…/exec` adresini kopyalayın
5. `index.html` içinde en üstteki `const CUSTOM_PROXY = "";` satırını şöyle doldurun:
   `const CUSTOM_PROXY = "https://script.google.com/macros/s/…/exec?url=";`
6. Değişikliği depoya kaydedin — araç artık önce sizin proxy'nizi kullanır, genel proxy'ler yedekte kalır.
