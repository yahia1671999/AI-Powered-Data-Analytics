# إعدادات النشر على Vercel / Deployment Instructions

لضمان عمل الذكاء الاصطناعي عند نشر التطبيق على Vercel، يرجى اتباع الخطوات التالية:

1. اذهب إلى لوحة تحكم مشروعك في **Vercel Dashboard**.
2. اختر التبويب **Settings** ثم **Environment Variables**.
3. أضف متغيراً جديداً:
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** (ضع مفتاح Gemini الخاص بك هنا والذي يبدأ بـ AIza...)
4. اضغط على **Save**.
5. قم بإعادة بناء المشروع (Redeploy) لكي يتعرف النظام على المفتاح الجديد.

---

To make the AI work on Vercel, follow these steps:

1. Go to your **Vercel Dashboard**.
2. Navigate to **Settings** > **Environment Variables**.
3. Add a new variable:
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** (Paste your Gemini API Key starting with AIza...)
4. Click **Save**.
5. Trigger a **Redeploy** to apply the changes.
