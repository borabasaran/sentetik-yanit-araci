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
4. **P4 — Yanıt üretimi:** Araç, Ek-4'teki profil-temelli prompt şablonunu kullanır ("ideal değil, gerçekçi öğrenci" yönergesi; temperature = 0.8). Yanıtlar salt-okunur gösterilir; öğrenci düzenleyemez, yalnızca yeniden üretebilir ve **deneme sayısı loglanır**.
5. **P5 — Gönderim:** Yanıtlar Google Forms'a gönderilir. Öğrenci isterse üretim kaydını (JSON: prompt, model, ham çıktı, deneme sayısı, zaman damgası) indirebilir — bu dosyanın araştırmacıya iletilmesi istenirse yönergede belirtin; `generation_log` için değerli ek veridir.

---

## 4. Teknik Notlar ve Sınırlılıklar

- **CORS proxy:** Google Forms sayfası tarayıcıdan doğrudan okunamaz (CORS). Araç, formu çekmek için sırasıyla `allorigins.win` ve `corsproxy.io` genel proxy'lerini dener. Bu ücretsiz hizmetler zaman zaman yavaş/erişilemez olabilir; uygulama öncesinde mutlaka pilot test yapın. Daha güvenilir istenirse, tek dosyalık bir Cloudflare Worker proxy'si kurulup `PROXIES` dizisindeki adres değiştirilebilir (kod içinde işaretli).
- **Gönderim mekanizması:** Yanıtlar `formResponse` uç noktasına gizli form POST'u ile iletilir. Tarayıcı güvenliği nedeniyle Google'dan dönen sonuç okunamaz; araç gönderimi "iletildi" olarak raporlar. **Pilotta mutlaka doğrulayın:** test gönderimi yapıp formun Yanıtlar sekmesinde göründüğünü kontrol edin.
- **Model listesi:** Gemini: `gemini-2.5-flash` (varsayılan), `gemini-2.5-pro`, `gemini-2.0-flash`. Model adları zamanla değişebilir; `MODELS` sabitinden güncellenebilir.
- **Gizlilik:** Sayfa hiçbir veri saklamaz (localStorage/çerez yok). LLM'e giden tek şey anonim profil + anket soruları; anonim kod dahi LLM'e gönderilmez (forma araç tarafından doğrudan yazılır — Ek-4 ile uyumlu).
- **Zorunlu soru koruması:** Model zorunlu bir soruyu geçerli seçenekle yanıtlamazsa gönderime izin verilmez; öğrenciden yeniden üretmesi istenir.

## 5. Pilot Kontrol Listesi

- [ ] Sentetik form kopyası oluşturuldu, başlığı ayrıştırıldı, oturum açma kapalı
- [ ] İlk soru "Anonim kodunuz" (kısa yanıt)
- [ ] Araç linki GitHub Pages'te açılıyor (masaüstü + telefon)
- [ ] Test profiliyle uçtan uca deneme: form çözümleme → üretim → gönderim → Yanıtlar sekmesinde kayıt
- [ ] Grid/ölçek maddeleri doğru eşleşiyor
- [ ] JSON üretim kaydı iniyor ve okunuyor
