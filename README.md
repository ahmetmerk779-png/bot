# Minecraft AFK Bot Kontrol Paneli

Bu proje, Minecraft sunucularında AFK kalmak için gelişmiş bir bot ve onu yönetmek için mobil uyumlu bir web paneli içerir.

## 🚀 Render'a Dağıtım

1. Bu dosyaları bir GitHub reposuna yükleyin.
2. [Render.com](https://render.com) üzerinden "New Web Service" oluşturun.
3. Reponuzu bağlayın.
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. **Environment:** Node (>=18)
7. Deploy edin.

## 🔧 Uyku Modunu Engelleme

Ücretsiz Render servisleri 15 dakika işlem yapılmazsa uykuya geçer. Bunu önlemek için [cron-job.org](https://cron-job.org) veya [UptimeRobot](https://uptimerobot.com) ile her 5 dakikada bir `https://sizin-app-adresiniz.onrender.com` adresine ping atın.

## 📱 Özellikler

- Microsoft / Mojang / Çevrimdışı hesap desteği
- Otomatik yeniden bağlanma
- Anti-AFK baş sallama
- Can, açlık, konum, ping takibi
- Sohbet ve komut gönderme
- Mobil uyumlu arayüz (Tailwind CSS)

## 📄 Lisans

MIT
