/** @type {import('next').NextConfig} */
const nextConfig = {
  // src/ منطق دامنه بیرون از web/ (در ریشه‌ی مونوریپو) قرار دارد و مستقیماً import می‌شود.
  outputFileTracingRoot: new URL('..', import.meta.url).pathname,
};

export default nextConfig;
