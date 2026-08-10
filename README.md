# ربات تلگرامی متن/عکس به ویدیو (OpenRouter + Vercel)

این پروژه یک ربات تلگرامی است که:
- اگر فقط **متن** بفرستید → با API ویدیوی OpenRouter یک ویدیو از روی آن متن می‌سازد (text-to-video).
- اگر **عکس + کپشن** بفرستید → عکس را به‌عنوان فریم اول ویدیو استفاده می‌کند (image-to-video).

## معماری
چون ساخت ویدیو چند ده ثانیه تا چند دقیقه طول می‌کشد و توابع Vercel نمی‌توانند این‌قدر منتظر بمانند، از **webhook** خود OpenRouter استفاده شده، نه polling:

1. `api/telegram-webhook.js` پیام تلگرام را می‌گیرد، درخواست ساخت ویدیو را به OpenRouter می‌فرستد و شناسه‌ی کار (job id) را به همراه chat id در Vercel KV ذخیره می‌کند، بعد فوراً جواب می‌دهد.
2. وقتی ویدیو آماده شد، OpenRouter خودش به `api/video-callback.js` خبر می‌دهد؛ این تابع ویدیو را دانلود کرده و با `sendVideo` برای همان چت در تلگرام می‌فرستد.

## پیش‌نیازها
- یک ربات تلگرام از [@BotFather](https://t.me/BotFather) (توکن آن را بگیرید)
- یک کلید API از [openrouter.ai/keys](https://openrouter.ai/keys) (باید اعتبار/کردیت کافی برای ویدیو داشته باشد)
- یک حساب [Vercel](https://vercel.com)

## مراحل نصب

### ۱. دیپلوی روی Vercel
```bash
npm install -g vercel
cd telegram-video-bot
vercel
```
یا این پوشه را روی گیت‌هاب پوش کنید و از داشبورد Vercel ایمپورت کنید.

### ۲. افزودن دیتابیس Redis (Upstash)
Vercel KV مستقل دیگر وجود ندارد؛ به‌جایش:
در داشبورد پروژه → تب **Storage** → بخش **Marketplace Database Providers** → روی **Upstash** بزنید → گزینه‌ی **Redis** را بسازید و به پروژه وصل کنید.
این کار متغیرهای `KV_REST_API_URL` و `KV_REST_API_TOKEN` را خودکار به پروژه اضافه می‌کند.

### ۳. تنظیم متغیرهای محیطی
در تب **Settings → Environment Variables** پروژه، مقادیر فایل `.env.example` را وارد کنید:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` (یک رشته‌ی تصادفی دلخواه)
- `OPENROUTER_API_KEY`
- `OPENROUTER_WEBHOOK_SECRET` (اختیاری، از تنظیمات Workspace در OpenRouter)
- `VIDEO_MODEL` (پیش‌فرض `google/veo-3.1-fast`؛ مدل‌های دیگر را از [اینجا](https://openrouter.ai/collections/video-models) ببینید)
- `PUBLIC_BASE_URL` (آدرس دامنه‌ی همین پروژه روی Vercel، بدون `/` انتهایی)

بعد از اضافه کردن متغیرها یک‌بار دیگر دیپلوی کنید (`vercel --prod`) تا اعمال شوند.

### ۴. ثبت وبهوک تلگرام
```bash
TELEGRAM_BOT_TOKEN=xxxx TELEGRAM_WEBHOOK_SECRET=yyyy \
  node scripts/set-webhook.mjs https://your-app.vercel.app
```

### ۵. تست
در تلگرام به ربات پیام بدهید:
- فقط متن: `یک گربه که روی ابرها می‌دود`
- یا یک عکس با کپشن: `این تصویر را زنده کن`

ربات ابتدا پیام «⏳ در حال پردازش» می‌فرستد و در ادامه ویدیوی نهایی را در همان چت ارسال می‌کند.

## نکات مهم
- **هزینه**: هر ویدیو بسته به مدل و کیفیت هزینه دارد؛ قیمت هر مدل در [صفحه‌ی مدل‌های ویدیو](https://openrouter.ai/collections/video-models) موجود است.
- **زمان**: تولید ویدیو معمولاً چند ده ثانیه تا چند دقیقه طول می‌کشد.
- **حجم فایل**: ویدیوهای طولانی/کیفیت بالا ممکن است حجم بالایی داشته باشند؛ اگر با خطای اندازه‌ی پاسخ در Vercel مواجه شدید، `resolution` یا `duration` را در `lib/openrouter.js` کاهش دهید یا پلن Vercel را ارتقا دهید.
- **مدل‌ها**: می‌توانید مدل ویدیو را با متغیر `VIDEO_MODEL` عوض کنید (مثلاً `bytedance/seedance-2.0` یا `alibaba/wan-2.7`).
- امضای وبهوک OpenRouter اختیاری ولی توصیه‌شده است؛ اگر `OPENROUTER_WEBHOOK_SECRET` را تنظیم نکنید، بررسی امضا نادیده گرفته می‌شود.
