# كلمات عراقية

Boilerplate للعبة جماعية لحظية مستوحاة من Codenames ومبنية بالكامل بأسلوب Serverless:

- `Next.js` App Router
- `TypeScript`
- `Tailwind CSS`
- `Firebase Realtime Database`
- منطق اللعب على الواجهة `Client-Side Authoritative`
- جاهزة للنشر على `Vercel`

## الشاشات

- `Home`: إنشاء غرفة أو الانضمام بكود.
- `Lobby`: اختيار الفريق والدور وبدء الجولة.
- `Board`: شبكة 5x5 مع صلاحيات مختلفة بين القائد والمحقق.
- `GameOver`: إعلان الفائز وإعادة الجولة مع بقاء اللاعبين.

## التشغيل المحلي

1. انسخ ملف البيئة:

```bash
cp .env.example .env.local
```

2. املأ قيم Firebase العامة داخل `.env.local`.

3. شغل التطبيق:

```bash
npm install
npm run dev
```

4. افتح `http://localhost:3000`.

## إعداد Firebase

استخدم مشروع Firebase مجاني مع `Realtime Database`، ثم:

1. فعّل قاعدة البيانات بنمط الاختبار أثناء التطوير.
2. انسخ مفاتيح تطبيق الويب إلى `.env.local`.
3. تأكد أن `databaseURL` يشير إلى قاعدة Realtime Database.

مثال أولي لقواعد التطوير:

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true
    }
  }
}
```

هذه القواعد مناسبة فقط للتجربة الأولية. قبل الإطلاق الفعلي يجب تشديدها.

## النشر على Vercel

1. ارفع المشروع إلى Git.
2. اربطه مع Vercel.
3. أضف نفس متغيرات البيئة العامة في إعدادات المشروع على Vercel.
4. نفذ Deploy.

## هيكل مهم

- `src/context/game-room-context.tsx`: الاشتراك اللحظي وتنفيذ أوامر الغرفة.
- `src/lib/firebase.ts`: تهيئة Firebase من المتغيرات العامة.
- `src/lib/game.ts`: توليد اللوحة وكود الغرفة ومنطق إعادة الجولة.
- `src/components/*`: مكونات الشاشات واللوحة.
- `src/types/game.ts`: واجهات TypeScript الأساسية.
