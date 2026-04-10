# BlockMine on Render

Bu proje, BlockMine Minecraft bot panelini Render üzerinde 7/24 çalıştırmak için hazırlanmıştır.

## 🚀 Render'a Dağıtım

1. Bu dosyaları bir GitHub reposuna yükleyin.
2. Render.com'da "New Web Service" oluşturun.
3. Reponuzu bağlayın.
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. **Environment:** Node (>=22)
7. Deploy edin.

## ⏰ Uyku Modunu Engelleme

Render ücretsiz servisler 15 dakika işlem yapılmazsa uykuya geçer. Bunu önlemek için:

1. [UptimeRobot.com](https://uptimerobot.com) adresine gidin.
2. Yeni bir HTTP(s) monitörü oluşturun.
3. URL olarak `https://sizin-app-adresiniz.onrender.com/ping` girin.
4. İzleme aralığını **5 dakika** olarak ayarlayın.

## 📱 Mobil Kullanım

BlockMine paneli tamamen mobil uyumludur. Telefonunuzdan tarayıcı ile Render URL'nize giderek kullanabilirsiniz.

## 🧩 Eklenti Kurulumu

Panel içindeki "Mağaza" bölümünden tek tıkla yeni özellikler ekleyebilirsiniz (AI Chat, Otomatik Balık vb.)
