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