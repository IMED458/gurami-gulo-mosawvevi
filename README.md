# გურამი & გულო — ქორწილის ციფრული მოსაწვევი

ახალციხე · 24 ოქტომბერი 2026

სტატიკური გვერდი (იგივე სტრუქტურა და ანიმაციები, რაც მონიკა & თაზოს მოსაწვევში),
ახალციხის თემატიკაზე: დალუქული კონვერტის გახსნა, რაბათის ციხის ცოცხალი სცენა,
დღიდან მზის ჩასვლის გავლით ღამემდე გადასვლა სქროლვისას, გალერეა, განრიგი,
ლოკაციები და RSVP — პასუხები Firebase-ში ინახება და ორგანიზატორი ხედავს `admin.html`-ზე.

## სტრუქტურა

```
index.html                მოსაწვევი (HTML + CSS + JS)
admin.html                ორგანიზატორის პანელი — სტუმრების პასუხები
firebase-config.js        Firebase-ის პარამეტრები (პროექტი guramigulo-71947)
firestore.rules           ვის რისი უფლება აქვს ბაზაში
firebase.json             rules-ის deploy-სთვის
assets/js/rsvp-store.js   სტუმრის პასუხის ჩაწერა Firestore-ში
assets/js/admin.js        პანელის ლოგიკა (შესვლა, სია, CSV, წაშლა)
assets/photos/1..7.jpg    წყვილის ფოტოები
assets/akhaltsikhe/       ლოკაციების ფოტოები (ეკლესია, რაბათი, Inn, რომანტიკა)
assets/audio/music.mp3    ფონური მუსიკა — Indila, Love Story
assets/og-v2.jpg          ლინკის preview (Messenger/WhatsApp/Instagram)
tools/rabati_svg.py       რაბათის სილუეტის გენერატორი
tools/paint.py            ფოტო → ნახატისებრი ილუსტრაცია
```

## რა სად შევცვალო

| რა | სად |
|---|---|
| ტექსტები | `index.html`-ში პირდაპირ, თითოეულ `<section>`-ში |
| თარიღი (countdown) | `index.html` → `var TARGET = new Date("2026-10-24T13:00:00+04:00")` |
| დღე/ღამის ფერები | `index.html` → JS-ში `DAY` და `NIGHT` ობიექტები |
| მუსიკა | ჩაანაცვლე `assets/audio/music.mp3` (იგივე სახელით) |
| ლოკაციის ფოტო | `assets/akhaltsikhe/`-ში იგივე სახელით ჩაანაცვლე |
| რაბათის სილუეტი | `tools/rabati_svg.py` → `python3 tools/rabati_svg.py` |
| ლინკის preview მისამართი | `index.html`-ის `<head>`-ში `og:url` / `og:image` — რეპოს სახელის მიხედვით |

## Firebase — ერთჯერადი დაყენება

პროექტი: `guramigulo-71947` (კონფიგი უკვე ჩასმულია `firebase-config.js`-ში).

1. **Build → Firestore Database → Create database** (production mode, რეგიონი `europe-west`).
2. **Build → Authentication → Get started → Email/Password → Enable.**
   შემდეგ **Users → Add user**:
   - Email: `admin@guramigulo.app`
   - Password: `admin#gg2026`

   `admin.html`-ზე შესვლა ხდება **admin / admin**-ით — გვერდი თავად გარდაქმნის
   მას ზემოთ მოცემულ ანგარიშად (Firebase-ს ელ-ფოსტა და 6+ სიმბოლოიანი პაროლი სჭირდება).
3. Rules-ის ატვირთვა — ან Firestore → **Rules** ჩანართში ჩააკოპირე და **Publish**, ან:
   ```bash
   firebase deploy --only firestore:rules --project guramigulo-71947
   ```
4. **Authentication → Settings → Authorized domains** — დაამატე საიტის დომენი
   (მაგ. `imed458.github.io`).

წესები: სტუმარს (შესვლის გარეშე) შეუძლია მხოლოდ **დაამატოს** სწორი ფორმის პასუხი;
წაკითხვა/წაშლა შეუძლია მხოლოდ `isAdmin()` სიაში მყოფ ანგარიშს.

სანამ `firebase-config.js` შეუვსებელია, პასუხები ინახება ბრაუზერის `localStorage`-ში
და `admin.html` აჩვენებს მხოლოდ იმავე ბრაუზერის სატესტო პასუხებს — ასე ლოკალურად
მთელი ნაკადი შეიძლება გაიტესტოს.

## ლოკალურად გაშვება

```bash
python3 -m http.server 8791
```

შემდეგ: http://localhost:8791 (მოსაწვევი) და http://localhost:8791/admin.html (პანელი).
