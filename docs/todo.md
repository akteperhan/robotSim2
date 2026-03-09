1- yeşil bayrak tıkladığında diye kodlama editorunde komut var. ancak yeşil bayrak yerine biz de üst bar da çalıştır durdur var. bunu uygun şelişde ayarlamak gerekiyor. 


2- görev paneli sağ üstte olabilir. taşınırken de kodlama panelinin z index olarak altında kalmamalı üstünde olmalı hep. 

3-. 1.görev tamamlandığında bir görev ler panelinde 1.görev in tamamlandığı na dair 1.görev arkaplanı yeşil olabilir. text ler de ona göre renkleri ayarlabilir vs. 

görev de ileri git sağa sola dön , tahmini gereken falan gibi bilgiler olmasın .


4-kodlama paneli butonu solda daha belirgin olmalı. kodlama panelini aç kapa gibi sider bar açma kapama gibi bir buton işimizi görecektir. büyük görünüt olmalı.

5- big bot logosu vs. de görünür olmalı. bilisim garajı logosu da üst bar da ortada uygun yerde olmalı ki ürünün kimin olduğu anlaşılsun.



TODO 2:

Aşağıdaki maddeleri mevcut robot kodlama simülasyonu arayüzünde uygula. Amaç; görev akışını daha net, modern, okunabilir ve eğitsel hale getirmektir.

1) Görev paneli düzeni

1. Bölümde sadece 4 görev gösterilsin.

Görev paneli, spec’e uygun olacak şekilde yeniden düzenlensin.

İlk bölümde fazladan görev görünmesin.

Görev sıralaması net ve kontrollü olsun.

2) Görev kartı sadeleştirme

Görev kartındaki açıklamaların altında bulunan yıldızlar kaldırılsın.

Görev kartı daha sade ve okunabilir hale getirilsin.

Gereksiz görsel kalabalık azaltılsın.

3) Görev numarası görünürlüğü

Sağ ve sol okların ortasında yer alan “Görev 1, Görev 2, Görev 3...” yazıları daha büyük ve daha belirgin olsun.

Görev başlığı, kullanıcı ilk bakışta rahatça görebileceği şekilde güçlendirilsin.

Tipografi daha modern ve net olsun.

4) Görev tamamlama akışı

Robot bir görevi başarıyla tamamladığında sistem hemen bir sonraki göreve sessizce geçmesin.

Önce kısa bir duraklama olsun.

Ardından kullanıcıya net şekilde:

“1. Görev Tamamlandı”

benzeri bir başarı geri bildirimi gösterilsin.

Bu sırada görev kartının arka planı kısa süreli veya kalıcı şekilde yeşil başarı durumuna geçebilsin.

Başarı durumu kullanıcı tarafından net anlaşılmalı.

5) Görevlerin sırayla aktif olması

Aynı anda tüm görevler aktif görünmesin.

Sadece mevcut aktif görev gösterilsin veya aktif olduğu net şekilde belli olsun.

Örneğin:

görev tamamlanınca

görev aktif hale gelsin

Tüm görevler sıralı progression mantığıyla çalışsın.

Kullanıcı bir görevi bitirmeden sonraki görev aktif olmasın.

6) Başlat ve Sıfırla butonları

Başlat ve Sıfırla butonları daha modern, daha büyük ve daha güçlü görünsün.

Butonların görsel hiyerarşisi artırılsın.

Tıklanabilirlik hissi daha kuvvetli olsun.

Padding, border radius, font size ve icon dengesi iyileştirilsin.

7) Türkçe karakter problemleri

Arayüzdeki tüm metinlerde bulunan Türkçe karakter sorunları düzeltilsin.

Özellikle şu karakterler doğru görünmeli:

ş, ğ, ü, ı, ö, ç, İ

Başlat, Sıfırla, Çözümü Yükle, Çalışıyor, Şarj İstasyonu gibi tüm metinler doğru render edilsin.

Font desteği ve encoding kontrol edilsin.

8) Kapı butonu ve sahne içi yazılar

“Kapı Butonu” gibi sahne içindeki yazılar sabit ve okunabilir olsun.

Yazıların arkasındaki gereksiz ışık, glow veya dönme efekti kaldırılabilir.

Etiketler çok hareketli olmamalı.

Daha temiz, sabit ve okunaklı bir label sistemi kullanılmalı.

Etkileşimli nesne yazıları kullanıcıyı rahatsız etmeyecek şekilde sakin görünmeli.

9) Robotun şarj barı görünürlüğü

Robotun üzerindeki şarj barı daha görünür hale getirilsin.

Mevcut bar çok küçük veya zayıf görünüyorsa güçlendirilsin.

Kontrastı, boyutu ve okunabilirliği artırılsın.

10) Şarj barının yön problemi

Robot hareket ederken şarj barı bazen dik veya eğik görünmemeli.

Şarj barı her zaman yatay kalmalı.

Kamera açısı değişse bile bar kullanıcıya doğru okunabilir biçimde sabit yönlü çalışmalı.

Gerekirse screen-facing UI veya billboard sistemi kullanılmalı.

Ama barın görünümü hep yatay ve düzenli olmalı.

11) Enerji bilgisini ayrı panelde gösterme

Robot her adım attığında enerji tüketimi kullanıcıya daha net gösterilsin.

Bunun için ekranda çok yer kaplamayan ama rahat okunabilen ayrı bir bilgi paneli tasarlansın.

Bu panelde şu bilgiler büyük ve net şekilde gösterilsin:

Toplam enerji

Kalan enerji

Adım başı harcanan enerji

Mevcut enerjiyle kaç adım daha atılabileceği

Panel sade, modern, okunabilir ve eğitim odaklı olsun.

Sayfayı gereksiz kaplamasın ama görünürlüğü yüksek olsun.

12) Enerji paneli davranışı

Enerji paneli sabit bir konumda dursun.

Robot hareket ederken kullanıcı enerji verilerini anlık takip edebilsin.

Veriler canlı güncellensin.

Panel, görev paneliyle yarışmayacak şekilde yerleştirilsin.

Görsel olarak temiz ve bilgi odaklı olsun.

13) Genel UX hedefi

Arayüz daha modern, daha temiz ve daha öğretici hale getirilsin.

Görev akışı kullanıcı tarafından çok daha rahat anlaşılsın.

Hangi görevin aktif olduğu, hangisinin tamamlandığı ve sırada ne olduğu net şekilde görülsün.

Butonlar, görev kartları ve bilgi panelleri aynı tasarım dilinde birleşsin.

Hareketli ama dikkat dağıtan görseller azaltılsın.

Eğitsel deneyim güçlendirilsin.


todo 3:

Aşağıdaki geliştirmeleri mevcut 3D robot kodlama simülasyonuna uygula. Amaç; bölüm sonu geri bildirimi, görev akışı, çevre görselliği ve şehir hissini güçlendirmektir.

1. Bölüm tamamlama akışı

Robot şarj istasyonuna ulaşıp şarj değeri %100 olduğunda, bu durum 1. Bölüm Tamamlandı olarak algılansın.

Bu anda ekranda güçlü ve olumlu bir başarı geri bildirimi gösterilsin.

Konfeti efekti çalışsın.

Başarı hissini veren kısa bir kutlama animasyonu veya görsel efekti olsun.

Ardından kullanıcıya bir panel / modal gösterilsin.

Bu panelde şu tarz bir mesaj yer alsın:

1. Bölüm Tamamlandı

Tebrikler! Robotu başarıyla şarj istasyonuna ulaştırdın.

Panelde bir adet ana aksiyon butonu bulunsun:

Tekrar Oyna

İstenirse ikinci bir buton da olabilir:

Sonraki Bölüme Geç

Genel ton eğitsel, pozitif, modern ve çocuk dostu olmalı.

Görev akışı ve kapı açılma mantığı

Kullanıcıya butona basma ile ilgili görev bildirimi / bilgi kartı çıktıktan sonra, sistemde kapı açılma süreci doğru çalışmalı.

Akış şu şekilde olmalı:

Robot butonun önüne gelir

Ekranda butona basılması gerektiğini anlatan görev / bilgi mesajı görünür

Robot butonla etkileşime girer

Kapı bundan sonra açılır

Yani kapı, görev bildirimi çıkmadan veya butona basılmadan açılmamalı.

Buton etkileşimi ile kapı açılma arasında net bir ilişki kurulmalı.

Kapı açılırken mekanik ve anlaşılır bir animasyon hissi verilmeli.

Sahne içi etiket düzeltmesi

Mevcut etkileşim etiketinde Kapı Butonu yazmalı.

Yazı net, sabit ve okunaklı olmalı.

Dönen, kayan veya fazla glow veren label sistemi kullanılmamalı.

Etiket sade, temiz ve kullanıcıyı yönlendiren şekilde görünmeli.

Binaların görsel dili

Çevredeki binalar biraz daha renkli, canlı ve çeşitli olmalı.

Ama aşırı oyuncak gibi değil; temiz, modern, yarı stilize şehir görünümünde olmalı.

Binalarda daha iyi renk dengesi kurulmalı:

açık mavi

turkuaz

sıcak gri

yumuşak sarı

canlı ama dengeli turuncu

hafif yeşil tonları

Binalar şehir hissini güçlendirmeli ve çevreyi daha yaşanır göstermeli.

Gökyüzü ve atmosfer

Gökyüzü daha canlı, ferah ve enerjik görünmeli.

Çok düz gri / soluk arka plan hissi olmamalı.

Daha iyi bir sky color, gradient veya soft atmospheric background kullanılmalı.

Ortam çocuk dostu, açık hava hissi veren, pozitif bir enerji taşımalı.

Zemin ve şehir bütünlüğü

Zemin daha canlı, düzenli ve şehir hissi veren bir yapıda olmalı.

Mevcut ortam havada duran bir platform gibi görünmemeli.

Dünya daha çok sınırları belli bir şehir bloğu / mini şehir adası gibi hissettirmeli.

Şu öğelerle çevre güçlendirilmeli:

belirgin yol sınırları

kaldırım kenarları

bina oturum alanları

şehir blok sınırları

garaj çevresinde mantıklı apron / giriş alanı

zemin geçişleri

Boş ve sonsuz plane hissi azaltılmalı.

Şehir zemini tamamlanmış, oturmuş, planlanmış bir çevre gibi görünmeli.

Genel hedef

Bölüm tamamlandığında kullanıcı güçlü bir başarı hissi yaşamalı.

Görev akışı daha net ve mantıklı çalışmalı.

Buton, kapı ve etkileşim ilişkisi doğru okunmalı.

Çevre daha canlı, renkli ve inandırıcı olmalı.

Garaj ve şehir, havada duran test sahnesi gibi değil; düzenli, sınırları belli, yaşanabilir bir mini şehir ortamı gibi görünmeli.

todo 5: 

AI MASTER PROMPT — Ayarlar Paneli, Kamera Kuralları, Hız Kontrolü ve Görev Kartı UI İyileştirmeleri

Mevcut 3D robot kodlama simülasyonunun ayarlar panelini, kamera davranışlarını, hız kontrolünü ve görev kartı tasarımını daha modern, anlaşılır, öğretici ve tasarım odaklı hale getir. Amaç; paneli sadece çalışan bir debug alanı olmaktan çıkarıp, kullanıcı dostu, profesyonel ve ürün hissi veren bir kontrol merkezi haline getirmektir.

1) Ayarlar paneli genel hedefi

Ayarlar paneli mevcut haliyle fazla teknik, dağınık ve kısmen debug paneli gibi duruyor.

Panel daha tasarım odaklı, sade, net, açıklayıcı ve kullanıcı dostu hale getirilmeli.

Görsel hiyerarşi güçlendirilmeli.

Kullanıcı, hangi ayarın ne işe yaradığını ilk bakışta anlayabilmeli.

Panel; bir geliştirici test menüsü gibi değil, ürünün resmi bir parçası gibi görünmeli.

Tüm ayarlar aynı tasarım dilinde birleşmeli.

Daha modern kart yapıları, boşluk kullanımı, section ayrımı ve ikon desteği düşünülmeli.

2) FPS bilgisini ayarlar paneli içine taşı

Ekranın sağ üstünde ayrı duran FPS göstergesi, bağımsız floating bir debug kutusu gibi duruyor.

Bu FPS bilgisi ayarlar panelinin içine alınmalı.

Panel içinde ayrı bir “Performans” veya “Sistem Durumu” bölümü olarak gösterilebilir.

FPS bilgisi daha sade ve anlaşılır sunulmalı.

Gereksiz grafik karmaşası azaltılmalı.

Kullanıcı isterse detaylı performans bilgisini görebilmeli, istemezse sade görünüm kullanılmalı.

FPS alanı için öneriler

Başlık: Performans

Alt bilgiler:

Anlık FPS

Ortalama FPS

Kalite seviyesi

Gölge durumu

Yansıma durumu

İstenirse mini performans rozeti:

İyi

Orta

Düşük

3) Ayarlar paneli daha net ve anlaşılır olmalı

Panel içindeki başlıklar daha güçlü olmalı.

Section başlıkları açıkça ayrılmalı.

Her ayarın yanında kısa açıklama veya tooltip bulunmalı.

Kullanıcı ayarların ne işe yaradığını anlamalı.

Teknik kısaltmalar sadeleştirilmeli.

“Bu ayar neyi değiştiriyor?” sorusunun cevabı görünür olmalı.

Önerilen panel yapısı

Paneli şu bölümlere ayır:

A. Çalıştırma

Hız

Adım modu

Çözümü yükle

Çarpma testi

B. Kamera

Kamera modu

Takip tipi

Genel bakış / otomatik görünüm bilgisi

C. Sahne

Açık tavan / kapalı tavan

Aktif görünüm tipi

Ortam sunumu

D. Grafik Ayarları

Kalite

Gölge

Yansıma

Işık

Çözünürlük

E. Performans

FPS

Ortalama performans

Sistem önerisi

Bu yapı sayesinde panel daha kurumsal ve temiz görünür.

4) Hız kontrolü yeniden tanımlansın

Hız ayarı şu an kontrolsüz veya aşırı yüksek hissi verebilir.

Yeni kural:

Maksimum hız, ortalama hızın en fazla %20 üstü olmalı

Yani kullanıcı sahneyi doğal akışın çok üstünde bozucu bir hızla çalıştıramamalı.

Simülasyon öğretici ve takip edilebilir kalmalı.

Hız kontrolü çok geniş aralık vermemeli.

Hız UI önerileri

Sadece slider değil, yanında yazılı etiketler olsun:

Yavaş

Normal

Hızlı

Varsayılan mod:

Normal

En yüksek mod:

Normal hızın +%20 fazlası

İstenirse tooltip:

“Simülasyonun akış hızını değiştirir”

Çok ekstrem hızlar kaldırılmalı.

5) Kapalı tavan modunda kamera seçimi kısıtlanmalı

Kapalı tavan modunda farklı kamera stilleri seçilmemeli.

Çünkü bu modda görünürlük kısıtlı ve özel bir kamera mantığı gerekiyor.

Kapalı tavan seçildiğinde sistem otomatik olarak uygun kamera biçimini uygulamalı.

Bu modda kullanıcı başka kamera tipine geçmemeli ya da geçiş devre dışı bırakılmalı.

Panelde kullanıcıya bunun nedeni anlatılmalı.

Kural

Kapalı tavan aktifse, özel kapalı tavan kamerası zorunlu olarak kullanılır

Diğer kamera seçenekleri pasif görünmeli veya gizlenmeli.

Bilgilendirme metni önerisi

“Kapalı tavan modunda görünürlüğü korumak için özel kamera görünümü kullanılır.”

veya

“Bu sahne modunda kamera otomatik olarak ayarlanır.”

6) Ayarlar daha bilgilendirici gösterilsin

Şu an ayarlar sadece seçenek gibi duruyor. Daha açıklayıcı hale getirilmeli.

Her ayar için kısa açıklama ekle

Örnekler:

Kalite
Görsel detay seviyesini belirler.

Gölge
Sahnedeki gölgeleri açar veya kapatır.

Yansıma
Parlak yüzeylerdeki yansıma efektlerini kontrol eder.

Işık
Sahnenin genel aydınlatma yoğunluğunu değiştirir.

Çözünürlük
Görüntü netliği ve performans dengesini etkiler.

Kamera
Sahneyi hangi açıdan izlediğini belirler.

Sahne Modu
Açık veya kapalı tavan görünümünü değiştirir.

Hız
Robotun simülasyondaki oynatma hızını değiştirir.

Bilgilendirici tasarım fikirleri

Info icon

Tooltip

Alt açıklama satırı

Hover açıklaması

“Önerilen” etiketi

“Performans Dostu” etiketi

“Görsel Kalite” etiketi

7) Panel tasarım dili geliştirilsin

Panelin görsel dili daha premium ve net olmalı.

Öneriler

Daha net bölüm aralıkları

Kart bazlı düzen

Yumuşak gölge

Daha sakin arka plan

Primary ve secondary action ayrımı

Aktif/pasif durumların daha iyi renk sistemi

Fazla oyuncak gibi değil, modern eğitim ürünü gibi görünüm

İçerik sola hizalı ve düzenli olmalı

Label ve value ayrımı daha net yapılmalı

Renk sistemi önerisi

Ana arka plan: açık ama hafif sıcak beyaz/gri

Başlıklar: koyu lacivert veya koyu gri

Vurgular: mor + turuncu mevcut sistemle uyumlu olabilir

Aktif durum: yeşil veya mor ton

Pasif durum: açık gri

Tehlike/test aksiyonları: turuncu/kırmızı ama kontrollü

8) Panelde akla gelmeyen ama eklenmesi faydalı tasarımlar

Aşağıdaki geliştirmeler de değerlendirilsin:

A. Preset sistemi

Kullanıcı tek tek ayar yapmadan hazır seçenek kullanabilsin:

Performans Modu

Dengeli Mod

Görsel Kalite Modu

B. Varsayılan ayarlara dön

“Varsayılan Ayarlar” butonu eklenebilir

C. Yardımcı mikro açıklamalar

Bazı ayarlarda alt satırda “önerilen kullanım” gösterilebilir

D. Duruma göre devre dışı bırakma

Kapalı tavan modunda uygun olmayan ayarlar disable olsun

Devre dışı ayar gri ve açıklamalı görünsün

E. Ayar etkisinin anlık hissi

Kullanıcı ayarı değiştirdiğinde küçük bir geçiş animasyonu veya kısa görsel yanıt olsun

F. Mobil/kompakt görünüm düşüncesi

Panel ileride dar ekranlarda da çalışabilecek kadar düzenli ve modüler tasarlansın

G. Scroll yapısı iyileştirilsin

İçerik taşarsa daha şık scroll alanı olsun

Uzun panel gibi değil, kontrollü ayar merkezi gibi görünmeli

9) Görev kartı metinleri düzeltmesi

Görev kartındaki başlıklar ve açıklamalar beyaz olmalı

Bu metinlerin opacity değeri tam olmalı

Soluk, griye kaçan veya yarı saydam görünmemeli

Başlık net, güçlü ve okunabilir olmalı

Açıklama metni de tam okunaklı olmalı

Özellikle koyu görev kartı arka planı üzerinde kontrast çok güçlü kurulmalı

Tipografi önerisi

Başlık: beyaz, güçlü ağırlık, yüksek okunabilirlik

Açıklama: beyaz, tam opacity, ama başlıktan biraz daha küçük

Görev numarası: yine belirgin ve güçlü

Yardımcı metinler: açık griye kaçmadan okunabilir beyaz ton

10) Görev kartı okunabilirlik geliştirmeleri

Görev kartında içerik hiyerarşisi artırılmalı

Şu yapı net görünmeli:

Görev numarası

Görev başlığı

Kısa açıklama

Aktif görev durumu

Gerekirse satır aralığı artırılmalı

Kartın içindeki metinler daha rahat okunmalı

Fazla opaklık oyunu yapılmamalı

Bilgi gizlemek yerine açık göstermek tercih edilmeli

11) Genel UX hedefi

Ayarlar paneli kullanıcıyı yormamalı

Öğretici ama profesyonel görünmeli

“debug paneli” değil, “ürün ayar merkezi” gibi hissettirmeli

Kullanıcı hız, kamera, sahne ve kalite ayarlarını rahat anlamalı

Görev kartları daha net, daha güçlü ve daha okunaklı olmalı

Kapalı tavan modu gibi özel durumlar sistem tarafından akıllıca yönetilmeli

Görsel kalite ile kullanılabilirlik dengelenmeli