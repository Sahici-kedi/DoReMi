# DoReMi

Tarayıcıda piyano, akustik gitar ve davul çalmak için React ile hazırlanmış duyarlı bir mini müzik stüdyosu. Sesler anlık üretilir; kayıt yapılmaz.

## Başlatma

Klasörde herhangi bir statik dosya sunucusu çalıştırabilirsin. Örneğin VS Code Live Server eklentisiyle klasörü sunmak yeterlidir. Uygulama React ve HTM modüllerini esm.sh üzerinden yükler; npm kurulumu ya da ücretli servis gerekmez.

## Kullanım

- Üst menüden piyano, davul veya akustik gitarı seç.
- Piyanoyu ekrandaki 88 tuşla (A0–C8) veya A–J ve W/E/T/Y/U klavye kısayollarıyla çal. Klavyeyi yatay kaydır; bilgisayar kısayolları için oktavı değiştir.
- Davul pedlerine dokun veya A/S/D tuşlarını kullan.
- Gitarda akor düğmelerine veya tellere dokun.
- Adım dizicisindeki kutulara basıp ritim oluştur; “Ritmi çal” ile başlat. Tempo düğmesi her dokunuşta 8 BPM artırır, 140 BPM’den sonra 70 BPM’ye döner.

## Ses ve API

Piyano ile gitar örnekleri, `nbrosowsky/tonejs-instruments` deposunun GitHub REST API’siyle listelenir ve nota gerektiğinde indirilir. Örnekler depoda belirtilen CC BY 3.0 lisansına tabidir. Piyano örneklerinin kaynağı [Versilian Studios Community Orchestra](https://vis.versilstudios.net/vsco-community.html), akustik gitar örneklerinin kaynağı [University of Iowa Electronic Music Studios](https://theremin.music.uiowa.edu/) olarak listelenmiştir; ayrıntılı kaynak kaydı [sample-source-info.txt](https://github.com/nbrosowsky/tonejs-instruments/blob/master/sample-source-info.txt) dosyasındadır. Davul sesleri Web Audio API’si ile tarayıcıda sentezlenir. GitHub API veya örnek dosyalarına erişilemediğinde piyano ve gitar basit sentez yedeğine geçer.

## GitHub Pages ile yayınlama

Bu klasörün içeriğini `DoReMi` adlı GitHub deposunun köküne yükle. Depoda **Settings → Pages → Build and deployment → Deploy from a branch** seç; `main` dalını ve `/(root)` klasörünü işaretleyip kaydet. Birkaç dakika sonra site `https://KULLANICI-ADIN.github.io/DoReMi/` adresinde açılır. Dosya yolları depo alt yoluyla uyumludur. GitHub Pages ücretsiz statik yayın sunar; build komutu gerekmez. Vercel ve Netlify da aynı klasörü build ayarı olmadan yayınlayabilir.
