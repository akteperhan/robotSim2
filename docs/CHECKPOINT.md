# BIG-BOT — Geliştirme Checkpoint

> Son güncelleme: 2026-03-09
> Bu dosya her yeni geliştirme oturumunda ilk okunacak referans noktasıdır.

---

## Projenin Özeti

**BIG-BOT Coding Adventure** — Three.js tabanlı 3D robot kodlama simülasyonu.
Kullanıcı Blockly editöründe blok kod yazar, robot 3D sahnede gerçek zamanlı hareket eder.
Hedef kitle: çocuklar / öğrenciler (eğitsel, blok kodlama mantığını öğretmek).

**Tech Stack:**
- Three.js (3D sahne, kamera, ışık, partiküller)
- Blockly (görsel kod editörü)
- TypeScript + Vite
- Vanilla CSS + DOM

**Proje klasörü:** `/Users/erhanaktepe/Desktop/SevilayH-Works/robotSim2`
**Build:** `npm run build` → `dist/` (Vite)
**Dev server:** `npm run dev`

---

## Tamamlanan TODO'lar

### TODO 1 — Temel UI Düzeltmeleri ✅
- Yeşil bayrak → Çalıştır/Durdur butonu
- Görev paneli z-index sorunu
- Tamamlanan görevin arka planı yeşil
- Kodlama paneli sidebar butonu
- BIG-BOT logosu ve Bilişim Garajı logosu üst barda

### TODO 2 — Görev Akışı ve UX ✅
- Bölüm 1: sadece 4 görev (Döngüler bölümü gizli başlangıçta)
- Görev kartı sadeleştirildi (yıldızlar kaldırıldı)
- Görev numarası daha büyük ve belirgin
- Görev tamamlama → yeşil banner + 2 sn sonra sonraki göreve geçiş
- Başlat/Sıfırla butonları yeniden tasarlandı
- Türkçe karakter sorunları giderildi
- Kapı Butonu sahne içi etiketi düzeltildi
- Robotun üzerindeki şarj barı güçlendirildi (billboard sistemi)
- Enerji bilgi paneli eklendi (toplam/kalan/adım başı/kalan adım)

### TODO 3 — Bölüm Sonu + Çevre ✅
- Robot şarj %100 → "1. Bölüm Tamamlandı" modal
- Konfeti efekti (Three.js ParticleSystem)
- "Tekrar Oyna" / "Sonraki Bölüme Geç" butonları
- Garaj kapısı açılma → buton etkileşimi ile bağlı
- Şehir binaları renklendirildi, gökyüzü gradient güncellendi
- Zemin: kaldırım, yol, bina oturumları, yeşil bantlar eklendi

### TODO 5 — Ayarlar Paneli Yeniden Tasarımı ✅
- Panel 5 bölüme ayrıldı: Çalıştırma / Kamera / Sahne / Grafik / Performans
- FPS göstergesi panele taşındı (anlık + ortalama + İyi/Orta/Düşük rozeti)
- Hız slider: 400ms–1200ms (Yavaş/Normal/Hızlı etiketleri)
- Kapalı tavan modunda kamera dropdown devre dışı
- Her ayara kısa açıklama satırı eklendi
- Preset butonları: Performans / Dengeli / Görsel Kalite
- "Varsayılan Ayarlar" butonu
- Görev kartı metin opaklıkları düzeltildi (tam beyaz)

### TODO 6 — Environment Yeniden Tasarımı ✅
- Zemin: asfalt yollar, kaldırım taşları, bordürler, yaya geçitleri
- Boş beyaz alanlar giderildi
- Çevreden arka plan binaları eklendi (şehir silueti)
- Gökyüzü gradient güncellendi (canlı mavi)
- Bulutlar, kuşlar, uçak animasyonları eklendi
- Garaj çevresi: apron, servis girişi, ağaçlar

### TODO 7 — Son Düzeltmeler ✅
- **Kapı etiketi:** "KAPI BUTONU" → "KAPI AÇMA BUTONU"
- **Kapı animasyon gecikmesi:** `+4000ms` → `+500ms` (PressButtonCommand.ts)
- **Çözünürlük default:** SD(50) → HD(200) — slider en yüksekten başlıyor

### Konfeti + Tekrar Başla Sistemi ✅
- Robot şarj olunca konfeti yağıyor (DOM canvas overlay, 10 renk, 3.5sn)
- "Tekrar Oyna" → "Tekrar Başla" olarak yeniden adlandırıldı
- **Bug fix:** 4 görev tek programda tamamlanınca `program:complete` yanlış mission index kontrol ediyordu → `gameState === COMPLETE` kontrolü eklendi, final success doğrudan gösteriliyor

### Işık Slider Düzeltmeleri ✅
- Kapalı tavan: slider ortaya (100) gelir → `lightMultiplier = 1.0`
- Açık tavan: slider sola (0) gelir → `lightMultiplier = 2.0` (en parlak)
- **Icon sırası:** ☀️ sol, 🌑 sağ
- **Formül:** `lightMultiplier = (200 - value) / 100`
- `applyLightMultiplier()` artık `initGame()` sonrası da çağrılıyor (başlangıç senkronizasyonu)

### Batarya Tükendi Modalı ✅
- Eski `failure-overlay` yerine özel `battery-dead-overlay` modal
- 🪫 ikon, "Enerji Tükendi!" başlığı, %0 batarya + komut sayısı istatistikleri
- Robot: WORRIED ifadesi + ekran flash + kamera sarsıntısı (450ms)
- "Tekrar Dene" ve "Kodu Düzenle" butonları

### Batarya Drain Demo Butonu ✅
- Ayarlar > Çalıştırma: 🔋 Batarya Testi butonu
- `loadBatteryDrainDemo()` — Blockly'e kare hareketi (5×) yükler
- Hiçbir engele çarpmadan ~50. komutta batarya biter

---

## Mevcut Durum (Bu Checkpoint Anı)

- ✅ Son build başarılı (`dist/` güncel)
- ✅ TypeScript hatası yok (`npx tsc --noEmit` temiz)
- ✅ Kullanım kılavuzu yazıldı: `docs/kullanim-kilavuzu.md`
- ✅ Bölüm 1 (4 görev) tam çalışıyor
- ✅ Bölüm 2 tanımlandı (missions.ts'te) ama henüz aktif değil

---

## Sonraki Potansiyel Geliştirmeler

Aşağıdakiler henüz yapılmadı / todo listesine girmedi:

- [ ] **Bölüm 2 aktivasyonu** — Döngüler bölümü (5 görev tanımlı ama erişilemiyor)
- [ ] **Mobil/kompakt görünüm** — Dar ekran desteği
- [ ] **Ses sistemi genişletme** — Daha fazla ses efekti
- [ ] **Yardım/tutorial overlay** — İlk kez açan kullanıcıya rehber
- [ ] **Puan sistemi görünür hale getirme** — ScoreSystem var ama UI'da yıldız gösterimi kaldırıldı

---

## Kritik Dosyalar

| Dosya | İçerik |
|-------|--------|
| `index.html` | Tüm HTML yapısı + CSS (tek dosyada ~3000 satır) |
| `src/demo/main.ts` | Ana oyun döngüsü, event handler'lar, kamera, UI bağlantısı |
| `src/demo/UIManager.ts` | Modal, toast, pil, görev kartı UI metodları |
| `src/demo/BlocklyManager.ts` | Blockly workspace, blok tanımları, demo yükleyiciler |
| `src/demo/scene/EnvironmentBuilder.ts` | Dış sahne (binalar, gökyüzü, yollar) |
| `src/demo/scene/GarageBuilder.ts` | Garaj, kapı, buton, şarj istasyonu 3D |
| `src/demo/ParticleSystem.ts` | Toz, kıvılcım, konfeti partikülleri |
| `src/missions/missions.ts` | Tüm görev tanımları (Bölüm 1+2) |
| `src/core/Constants.ts` | Grid boyutları, pozisyonlar, pil maliyetleri, animasyon süreleri |
| `src/systems/ProgramExecutor.ts` | Komut kuyruğu, adım modu, hız kontrolü |
| `src/systems/BatterySystem.ts` | Pil tüketimi, şarj animasyonu, event'ler |
| `src/systems/EventBus.ts` | Singleton olay sistemi (battery:dead, program:complete, vb.) |

---

## Önemli Sabitler (Constants.ts)

```
GRID_W = 12,  GRID_H = 34
ROBOT_START = { x: 5, y: 8 }   (grid merkezi, y=8)
BUTTON_POS  = { x: 0, y: 14 }
CHARGE_POS  = { x: 5, y: 32 }
DOOR_ROW    = 20

INITIAL_BATTERY_LEVEL = 5      (başlangıç %5)
BATTERY_COST.MOVE = 0.1        (her hareket %0.1)
BATTERY_COST.PRESS_BUTTON = 0.2
DEFAULT_EXECUTION_SPEED = 800ms

DOOR_ANIMATION_DURATION = 2500ms
PressButtonCommand delay = DOOR_ANIMATION_DURATION + 500ms = 3000ms toplam
```

---

## EventBus Olayları

| Olay | Ne zaman |
|------|----------|
| `battery:updated` | Her komut sonrası |
| `battery:critical` | Pil ≤ %2 |
| `battery:dead` | Pil = %0 |
| `battery:full` | Şarj tamamlandı → konfeti |
| `program:complete` | Tüm bloklar çalıştı |
| `program:stopped` | Kullanıcı durdurdu |
| `door:opening` | Buton basıldı, kapı açılıyor |
| `robot:expression` | NORMAL/HAPPY/WORRIED/EXCITED |
| `command:highlight` | Çalışan blok vurgulanıyor |
