# Sentetik Öğrenci Yanıtı Üretim Aracı: Kurulum ve Kullanım Kılavuzu

Tek sayfalık (`index.html`) statik web uygulaması. Öğrenci, araştırmacının gönderdiği sentetik form bağlantısını yapıştırır ve kendi Google Gemini API anahtarını girer. Araç formu çözümler, öğrencinin profiline dayanarak formu Gemini'ye doldurtur ve üretilen yanıtları forma gönderir.

Tüm sentetik yanıtlar **tek ve sabit bir modelden** üretilir (`gemini-3.8-flash`). Başka bir modele veya sağlayıcıya geçiş yoktur; model yanıt vermezse öğrenci açık bir hata mesajı görür.

---

## 1. GitHub Pages'te Yayın

1. Depo **Public** olmalıdır.
2. Depo → **Settings → Pages** → Source: `Deploy from a branch`, Branch: `main` / `(root)` → Save.
3. Adres: `https://borabasaran.github.io/sentetik-yanit-araci/`
4. Bu bağlantıyı öğrencilere 2. oturum yönergesiyle birlikte gönderin.

`main` dalına yapılan her değişiklik birkaç dakika içinde yayına yansır. Görünür her değişiklikte sürüm üç yerde birlikte artırılır: `index.html` içindeki `TOOL_VERSION`, `imza.js` içindeki `SURUM` ve `package.json`. Testler bu üçünün uyumunu denetler.

---

## 2. Google Forms Tarafında Yapılması Gerekenler (Araştırmacı)

**Metodolojik ayrım:** Araca yapıştırılacak form, öğrencilerin kendi doldurduğu ana anket **değil**, sentetik yanıtlar için açılan **ayrı kopya form** olmalıdır (ör. başlığı "… Sentetik Yanıt Formu"). Böylece insan verisi ile sentetik veri hiçbir zaman aynı yanıt havuzuna karışmaz (bkz. Ek-4 LLM Protokolü, ilke 1).

### Ayarlar

**Ayarlar → Yanıtlar:** "E-posta adreslerini topla" **kapalı**; "Oturum açma gerekli / kuruluşla sınırla" **kapalı**; "Yanıtları 1 ile sınırla" **kapalı**. Aksi hâlde araç formu okuyamaz ve gönderemez.

### Sistem alanları (zorunlu)

Formun başına aşağıdaki **kısa yanıt** sorularını ekleyin. Başlıklar tam olarak böyle yazılmalıdır (büyük/küçük harf önemli değil). Araç bunları kendisi doldurur ve yapay zekâya göndermez.

| Soru başlığı | Araç ne yazar | Zorunlu mu |
|---|---|---|
| `Anonim kodunuz` | Öğrencinin girdiği anonim kod | Evet |
| `Model` | Kullanılan model adı (`gemini-3.8-flash`) | Evet |
| `Deneme sayısı` | Öğrencinin gönderdiği yanıta kadar kaç üretim yaptığı | Evet |
| `Araç sürümü` | Aracın sürümü (ör. `10.0`) | İsteğe bağlı |

Bu alanlardan biri eksikse araç formu kabul etmez ve öğrenciye "araştırmacına bildir" der. Böylece eşleştirme ve protokol kayıtları eksik veri toplanmadan önce yakalanır. `Model` ve `Deneme sayısı` sorularını Forms'ta zorunlu işaretlemeniz gerekmez; araç her gönderimde doldurur.

### Desteklenen soru türleri

Kısa yanıt, paragraf, çoktan seçmeli, açılır liste, onay kutuları, doğrusal ölçek, çoktan seçmeli tablo (grid).

- Tarih, saat, dosya yükleme, yıldızlı derecelendirme gibi türler **kullanılmamalıdır**. Bunlardan biri zorunlu ise araç formu baştan reddeder; zorunlu değilse atlar.
- Sorulara **yanıt doğrulama kuralı** (en az karakter, sayı aralığı vb.) koymayın. Google böyle bir kurala uymayan gönderimi sessizce reddeder ve araç bunu göremez.
- Seçenekli sorularda **"Diğer" seçeneğini** kullanmayın.
- Ölçek ve tablo seçenek etiketleri sade tutulursa ("1"–"5") eşleştirme en sağlıklı çalışır.

---

## 3. Öğrenci Akışı

1. **Gemini API anahtarı:** Öğrenci Google AI Studio'dan aldığı anahtarı girer. Anahtar yalnızca tarayıcıdan doğrudan Google'a gider; saklanmaz, başka hiçbir yere iletilmez. ChatGPT veya Claude anahtarı girilirse araç uyarır.
2. **Form bağlantısı:** Sentetik form bağlantısı yapıştırılır.
3. **Anonim kod (zorunlu), kısa profil ve A10 tanıtım metni** (1. oturumdakiyle aynı) girilir.
4. **Yanıt üretimi:** Araç formu okur, sistem alanlarını denetler, profil ve A10 metnini prompta ekler ve modelden bu bilgilerle çelişmeyen, idealize edilmemiş öğrenci yanıtları ister. Yanıtlar salt okunur gösterilir; öğrenci düzenleyemez, yalnızca yeniden ürettirebilir. Her üretim deneme sayısını bir artırır.
5. **Gönderim:** Yanıtlar, anonim kod, model adı ve deneme sayısıyla birlikte forma iletilir. Google sonucu farklı kökenden olduğu için tarayıcı kesin teslim bilgisini okuyamaz; araç yalnızca **iletim denendi** der. Öğrenci isterse üretim kaydını (JSON) indirebilir.

---

## 4. Teknik Notlar

- **Model:** `gemini-3.8-flash`, sıcaklık `1.0`, düşünme düzeyi `low`. Google, Gemini 3 ailesinde sıcaklığın varsayılan 1.0'da bırakılmasını öneriyor; düşürülmesi döngüye girme ve kalite kaybına yol açabiliyor. Düşük düşünme düzeyi yanıt süresini kısaltır. Bu üç değer `index.html` başındaki yapılandırma bölümündedir.
- **Yedek model yoktur.** Model kullanılamazsa (404) öğrenci "araştırmacına bildir" mesajı görür; kota aşımı (429) ve yoğunluk (5xx) için ayrı, açık mesajlar vardır.
- **API anahtarı** istek başlığında (`x-goog-api-key`) gönderilir, adres satırında yer almaz.
- **Zaman aşımı:** Yapay zekâ yanıtı için 60 saniye. Öğrenci işlemi iptal edebilir.
- **Form okuma aracısı:** Google Forms sayfası tarayıcıdan doğrudan okunamadığı için araç yalnızca `FORM_PROXY` sabitinde tanımlı Google Apps Script aracısını kullanır. Bu adres sayfa bağlantısıyla değiştirilemez; genel, üçüncü taraf CORS aracılarına veri gönderilmez.
- **Gönderim:** Yanıtlar `formResponse` uç noktasına gizli form POST'u ile iletilir. Tarayıcı güvenliği nedeniyle Google'dan dönen sonuç okunamaz; araç kesin başarı iddiasında bulunmaz.
- **Zorunlu soru koruması:** Model zorunlu bir soruyu geçerli seçenekle yanıtlamazsa gönderime izin verilmez; öğrenciden yeniden üretmesi istenir.
- **Gizlilik:** Sayfa kalıcı tarayıcı depolaması kullanmaz. Gemini'ye kısa profil, A10 metni ve anket soruları gider; anonim kod gönderilmez, yalnız forma yazılır. İndirilen üretim kaydı profil ve A10 içeren promptu ve anonim kodu içerir; güvenli saklanmalıdır.
- **Üretim kaydı (JSON):** Araç sürümü, model ayarları, form yapısı, gönderilen yanıtlar, deneme sayısı, başarılı üretimlerin prompt ve ham çıktıları ile başarısız denemelerin hata bilgisi.

### Analiz notu

Aynı öğrenci sayfayı yenileyip yeniden gönderebilir. Yanıtlar sayfasında aynı anonim kodla birden fazla satır görürseniz hangi kaydın esas alınacağını (ör. ilk gönderim) analizden önce belirleyin ve raporlayın.

---

## 5. Pilot Kontrol Listesi

- [ ] Sentetik form kopyası oluşturuldu, başlığı ayrıştırıldı, oturum açma ve e-posta toplama kapalı
- [ ] `Anonim kodunuz`, `Model`, `Deneme sayısı` kısa yanıt soruları eklendi
- [ ] Desteklenmeyen soru türü, yanıt doğrulama kuralı ve "Diğer" seçeneği yok
- [ ] Araç bağlantısı GitHub Pages'te açılıyor (masaüstü ve telefon); sayfa altında güncel sürüm görünüyor
- [ ] **Ücretsiz** bir Gemini anahtarıyla `gemini-3.8-flash` yanıt veriyor (kota hatası alınmıyor)
- [ ] Uçtan uca deneme: form çözümleme → üretim → gönderim → Yanıtlar sekmesinde kayıt
- [ ] Yanıtlar sekmesinde `Model` ve `Deneme sayısı` sütunları dolu geliyor
- [ ] Grid ve ölçek maddeleri doğru eşleşiyor
- [ ] JSON üretim kaydı iniyor ve okunuyor

---

## 6. Form Aracısı: Google Apps Script

Araç, formu Google'ın altyapısı üzerinden okuyan bir Apps Script aracısı kullanır. Mevcut aracı `index.html` içindeki `FORM_PROXY` sabitinde tanımlıdır. Yeniden kurmak gerekirse:

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
3. **Deploy → New deployment → Web app** → Execute as: *Me* · Who has access: **Anyone** → Deploy
4. Çıkan `https://script.google.com/macros/s/…/exec` adresini kopyalayın.
5. `index.html` içindeki `FORM_PROXY` sabitine bu adresi (sonunda `?url=` olmadan) yazın ve değişikliği depoya kaydedin.

Not: Kodu güncellediyseniz **Deploy → Manage deployments → (kalem) Edit → Version: New version → Deploy** yapmalısınız; aksi hâlde eski kod çalışmaya devam eder. Web app adresi değişmez.

---

## Test

```
npm test
```

Her `main` itmesinde GitHub Actions testleri otomatik çalıştırır.
