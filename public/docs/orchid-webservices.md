# راهنمای استفاده از APIهای جدید

## 1. مقدمه
این سند با هدف ارائه راهنمای فنی جهت استفاده از APIهای جدید و اعلام جایگزینی APIهای قدیمی تهیه شده است. APIهای جدید با تمرکز بر افزایش امنیت، پایداری و کارایی سرویس‌ها ارائه گردیده‌اند.

## 2. جدول جایگزینی APIها
| API قدیمی | API جدید |
|-----------|----------|
| https://webservice.cinnagen.com:8180/api/GetInvCardex | https://octa.cinnagen.com/integration/lookups/fetch/01KG9DQ0P31M8ZVGT7SM3W7BXH |
| https://webservice.cinnagen.com:8180/api/v2/GetInvCardex | https://octa.cinnagen.com/integration/lookups/fetch/01KG9KZFKEQVVR8FFV7BP4GHJS |
| https://webservice.cinnagen.com:8180/api/GetInvTransactions | https://octa.cinnagen.com/integration/lookups/fetch/01KG9M3HC181JZDW6SSGEVCP6H |
| https://webservice.cinnagen.com:8180/api/InvCardex_CustomDate | https://octa.cinnagen.com/integration/lookups/fetch/01KG9M4ZAV8K5Y1VR53KX9Y8TG |
| https://webservice.cinnagen.com:8180/api/GetPlanReleaseDate | https://octa.cinnagen.com/integration/lookups/fetch/01KG9MBN71DNN2DH9N0CXT208F |

## 3. احراز هویت (Authentication)
برای فراخوانی APIهای جدید، ارسال اطلاعات احراز هویت از طریق Header الزامی است. Headerهای موردنیاز: x-client-id، x-client-secret. نمونه درخواست: 
```curl
`curl --location 'https://octa.cinnagen.com/integration/lookups/fetch/01KG9MBN71DNN2DH9N0CXT208F' 
--header 'x-client-id: YOUR_CLIENT_ID' 
--header 'x-client-secret: YOUR_CLIENT_SECRET' 
--header 'Content-Type: application/json' 
--data '{"param1":"value1","param2":"value2"}'` — لطفاً مقادیر اختصاصی خود را جایگزین نمایید.
```

## 4. پارامترهای ورودی
پارامترهای ورودی APIها نسبت به نسخه‌های قبلی از نظر نام و ساختار منطقی تغییری نکرده‌اند، اما نحوه ارسال پارامترها تغییر یافته است: متد فراخوانی از GET به POST تغییر کرده است؛ پارامترها دیگر به‌صورت Query Parameters ارسال نمی‌شوند؛ تمامی پارامترها باید در Body درخواست و در قالب JSON ارسال شوند. بنابراین نیازی به تغییر در نام پارامترها وجود ندارد، مقادیر باید در Body قرار گیرند و Header مربوط به Content-Type: application/json الزامی است.

## 5. مزایا
افزایش سطح امنیت؛ بهبود پایداری و عملکرد؛ مدیریت و مانیتورینگ بهتر سرویس‌ها؛ قابلیت توسعه‌پذیری بیشتر.

## 6. نکات مهم
آدرس‌های قدیمی در آینده غیرفعال خواهند شد. اطلاعات احراز هویت اختصاصی بوده و باید محرمانه نگهداری شوند.
