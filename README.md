# تریدر پرو — Trading Journal App

اپلیکیشن ژورنال معاملاتی برای تریدرهای XAU/USD

## راه‌اندازی

### پیش‌نیازها
- Node.js 18+
- npm یا yarn

### نصب

```bash
npm install -g expo-cli eas-cli
npm install
```

### اجرا

```bash
# وب (مرورگر)
npm run web

# اندروید
npm run android

# iOS
npm run ios
```

### ساخت APK (اندروید)

```bash
# ابتدا به Expo ثبت‌نام کن: expo.dev
eas login
eas build --platform android --profile preview
```

## ساختار پروژه

```
app/
  (tabs)/
    index.tsx        — چک‌لیست
    journal.tsx      — ژورنال معاملات
    strategies.tsx   — استراتژی‌ها
    stats.tsx        — آمار
    academy.tsx      — آکادمی آموزشی
    settings.tsx     — تنظیمات
  trade-form.tsx     — فرم ثبت معامله
  strategy-edit.tsx  — ویرایش استراتژی
components/
context/
  AppContext.tsx     — state management
constants/
  defaultStrategies.ts
  i18n.ts
  colors.ts
```

## قابلیت‌ها
- چک‌لیست ماژور تریدینگ و سشن تریدینگ
- ژورنال معاملات با تصویر و ویدیو
- آمار کامل: وین ریت، R:R، خطاها
- آکادمی آموزشی
- پشتیبانی از فارسی/انگلیسی
- ذخیره آفلاین (AsyncStorage)
