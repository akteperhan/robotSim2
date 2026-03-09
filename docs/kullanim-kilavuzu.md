# BIG-BOT Coding Adventure — Kullanım Kılavuzu

> **BIG-BOT**, blok tabanlı görsel programlama ile kontrol edilen bir 3D robot simülasyonudur. Kullanıcı kod yazar, robot sahnede gerçek zamanlı olarak hareket eder.

---

## Ekran Düzeni

```
┌─────────────────────────────────────────────────────┐
│  [Görev Kartı]   [3D Sahne]   [Blockly Editör]     │
│                                                      │
│  [Pil / Durum]              [▶ Çalıştır] [↻ Sıfırla]│
│                              [Log Paneli]            │
│                    [⚙ Ayarlar Paneli]               │
└─────────────────────────────────────────────────────┘
```

---

## 1. Başlangıç Ekranı (Intro)

Sayfa açıldığında sinematik bir giriş ekranı gelir:
- Arka planda 3D sahne görünür, robot görülür
- **"Sistem Uyarısı: Pil Seviyesi Kritik!"** yazısı görev hikayesini anlatır
- **🚀 Göreve Başla!** butonuna tıklanınca intro kaybolur, kamera yumuşak bir hareketle çalışma konumuna gelir ve oyun başlar

---

## 2. Görev Kartı (Sol Üst)

Her adımda robotun ne yapması gerektiğini anlatır.

| Alan | Açıklama |
|------|----------|
| **📋 Görev 1** | Hangi adımda olduğunu gösterir |
| **Başlık** | Görevin kısa adı (örn. "Garaj Kapısını Aç") |
| **Açıklama** | Ne yapılacağı anlatılır |
| **◀ / ▶ okları** | Önceki/sonraki göreve manuel geçiş (test amaçlı) |

Görev tamamlandığında kart üstünde yeşil bir **"Görev Başarılı!"** banner'ı belirir ve birkaç saniye sonra bir sonraki göreve otomatik geçilir.

---

## 3. Pil Göstergesi (Sol)

- Robotun mevcut enerji seviyesini **%** olarak gösterir
- Başlangıçta **%5** ile başlar (düşük pil hikaye unsuru)
- Her komut çalıştırıldığında pil tükenir:
  - İleri/Geri/Dön: **−0.1%** / komut
  - Butona Bas: **−0.2%**
  - Şarj: pil tüketmez, tam doldurur
- **%2'nin altına düşünce** kırmızıya döner (kritik)
- **%0'a ulaşınca** → Enerji Tükendi ekranı açılır

---

## 4. Durum Çubuğu

Robotun anlık konumunu ve yönünü gösterir:

```
Konum: (5, 8) | Yön: K
```

Yön kısaltmaları: **K** = Kuzey, **G** = Güney, **D** = Doğu, **B** = Batı

---

## 5. Blockly Kod Editörü (Sağ Panel)

Robot bu panele yerleştirilen bloklarla programlanır.

### Mevcut Bloklar

| Blok | Renk | Açıklama |
|------|------|----------|
| **İleri Git** | Mavi | Robotu 1 adım öne hareket ettirir |
| **Geri Git** | Mavi | Robotu 1 adım geri hareket ettirir |
| **Sola Dön** | Yeşil | 90° sola döner (hareket etmez) |
| **Sağa Dön** | Yeşil | 90° sağa döner (hareket etmez) |
| **Butona Bas** | Mor | Yakındaki sarı butona basar → kapı açılır |
| **Şarj Ol** | Sarı | Şarj istasyonundayken pili %100'e doldurur |
| **Tekrarla N kez** | Turuncu | İçine yerleştirilen blokları N kez çalıştırır |

### Blok Nasıl Eklenir?
1. Sol araç kutusundan bir blok sürükle → editör alanına bırak
2. Blokları alt alta bağlayarak sıra oluştur
3. `Tekrarla` bloğunun içine başka bloklar koyulabilir (döngü)

---

## 6. Kontrol Butonları

### 🚀 Çalıştır / ⏹ Durdur
- **Çalıştır**: Blockly'deki bloklar sırayla çalıştırılır, robot hareket eder
- Çalışırken buton **"Durdur"** olur → tıklanırsa program anında durur

### ↻ Sıfırla
- Robot başlangıç noktasına döner
- Pil %5'e sıfırlanır
- Bloklar **silinmez**, kod korunur

---

## 7. Ayarlar Paneli (⚙ ikonu, sağ alt)

Tıklanınca sağdan açılır. Beş bölümden oluşur:

### A. Çalıştırma

| Kontrol | Açıklama |
|---------|----------|
| **Hız Slider** | Yavaş ↔ Hızlı (400ms – 1200ms arası) |
| **👣 Adım Modu** | Her komut öncesi program bekler, **⏭ Adım** butonuyla tek tek ilerlenir |
| **💡 Çözümü Yükle** | Mevcut görevin örnek çözümünü editöre yükler |
| **💥 Çarpma Testi** | Duvara çarpma senaryosunu yükler |
| **🔋 Batarya Testi** | Pil bitim senaryosunu yükler (hiçbir engele çarpmadan pil biter) |

### B. Kamera

| Kontrol | Açıklama |
|---------|----------|
| **Kamera Modu** | Genel Bakış / Takip / Üstten / Yakın Plan |
| **🔄 Kamerayı Sıfırla** | Kamerayı varsayılan açıya döndürür |

> Kapalı tavan modunda kamera otomatik ayarlanır, dropdown devre dışı kalır.

### C. Sahne

| Kontrol | Açıklama |
|---------|----------|
| **Garaj Modu** | **Açık Tavan** = dışarısı + gökyüzü görünür / **Kapalı Tavan** = sadece garaj içi |

### D. Grafik Ayarları

| Kontrol | Açıklama |
|---------|----------|
| **Kalite Presetleri** | Performans / Dengeli / Görsel Kalite |
| **Gölge** | Sahnedeki gölgeleri açar/kapatır |
| **Yansıma** | Zemin yansıma efektini açar/kapatır |
| **☀️ 🌑 Işık Slider** | Sol (güneş) = parlak, Sağ (ay) = loş |
| **Çözünürlük Slider** | Düşük (SD) ↔ Yüksek (HD) — performansı etkiler |

### E. Performans

- **FPS** (anlık kare hızı), **Ortalama FPS** ve durum rozeti: İyi / Orta / Düşük

### 🔄 Varsayılan Ayarlar
Tüm ayarları fabrika değerine sıfırlar.

---

## 8. Adım Modu Nasıl Çalışır?

1. Ayarlar → **👣 Adım Modu** butonuna tıkla (aktif = turuncu)
2. **🚀 Çalıştır**'a bas
3. Program ilk blokta bekler, robot aydınlatılır
4. **⏭ Adım** butonuna her bastığında bir sonraki komut çalışır
5. Adım modunu kapatmak için tekrar **👣 Adım Modu**'na tıkla

> Blokların tek tek ne yaptığını incelemek, hata ayıklamak için kullanışlıdır.

---

## 9. Kamera Kontrolleri (3D Sahne)

| Hareket | Nasıl |
|---------|-------|
| Döndür | Sol tık + sürükle |
| Yakınlaş/Uzaklaş | Fare tekerleği |
| Kaydır | Sağ tık + sürükle |

---

## 10. Kapı Açma Animasyonu

1. Robot sarı butona yakın konuma gelir
2. **"Kapı Açma Butonu"** bloğu çalıştırılır
3. Kapı yavaşça yukarı kalkar (~2.5 saniye animasyon)
4. Kapı açıldığında dışarıdan ışık girer, toz partikülleri uçar
5. Kapı açıldıktan sonra robot kapıdan geçebilir

---

## 11. Şarj Olma

1. Robot yeşil şarj istasyonunun üzerine hareket eder
2. **"Şarj Ol"** bloğu çalıştırılır
3. Pil dolum animasyonu başlar: ~3.5 saniyede %0→%100
4. Şarj tamamlanınca **konfeti** yağar, başarı ekranı açılır

---

## 12. Başarı ve Geçiş Ekranları

### Ara Görev Tamamlandı
- Kart üstünde yeşil banner: **"X. Görev Başarılı!"**
- 2 saniye sonra otomatik sonraki göreve geçer

### Bölüm Tamamlandı (Final)
Büyük başarı ekranı açılır:
- Toplam kullanılan komut sayısı
- Son pil seviyesi
- **🔄 Tekrar Başla** → en baştan başlar
- **▶ Sonraki Bölüm** → bir sonraki bölüme geçer

---

## 13. Başarısızlık Ekranları

### Enerji Tükendi (🪫)
Pil %0'a ulaştığında:
- Robot endişeli ifadeye geçer
- Ekran kırmızı parlar, kamera sallanır
- **"Enerji Tükendi!"** kartı açılır: batarya = %0, kullanılan komut sayısı
- **Tekrar Dene** → sıfırla (bloklar korunur)
- **Kodu Düzenle** → modalı kapat, editöre dön

### Duvara Çarpma (💥)
Robot duvara çarptığında:
- Ekran kırmızı titrer, çarpma sesi çalar
- Robot geri zıplar
- **"Çarpıldı!"** modalı açılır
- **Tekrar Dene** veya **Kodu Düzenle** seçenekleri

---

## 14. Log Paneli

Ekranın sağ alt köşesindeki panel:
- Her komutun sonucunu gerçek zamanlı gösterir
- Hata, başarı, uyarı mesajlarını renkli gösterir
- **Çalıştır** tuşuna basıldığında log temizlenir

---

## 15. Bölüm 1 Görev Sırası

| Adım | Görev | Kazanma Koşulu |
|------|-------|----------------|
| 1 | Garaj Kapısını Aç | Butona ulaş |
| 2 | Sistemi Aktif Et | Butona bas |
| 3 | Enerjiye Ulaş | Şarj istasyonuna ulaş |
| 4 | Şarj Ol! | Pili %100 yap |

Tüm 4 görev tek program çalıştırmasında tamamlanabilir. Görevler sırayla kontrol edilir; bir koşul sağlandığında otomatik bir sonrakine geçilir.

---

## İpuçları

- Robotu sıfırlamak blokları silmez — kodu korur, sadece konumu resetler
- Pil az olduğunda önce Sıfırla, sonra kodunu kısalt ve tekrar çalıştır
- Adım modu ile hangi blokta hata olduğunu kolayca bulabilirsin
- **💡 Çözümü Yükle** ile örnek kodu görebilir, üzerinde değişiklik yapabilirsin
- Hız slider'ı yavaşa aldığında animasyonları daha net izleyebilirsin
