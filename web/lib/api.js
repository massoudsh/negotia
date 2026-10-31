export const ERRORS = {
  fa: { network: 'ارتباط برقرار نشد. اتصال را بررسی و دوباره تلاش کنید؛ ورودی شما حفظ شده است.', 401: 'نشست پایان یافته است؛ دوباره وارد شوید.', 403: 'برای این اقدام دسترسی کافی ندارید.', 404: 'رکورد پیدا نشد؛ فهرست را تازه‌سازی کنید.', 409: 'رکورد تغییر کرده است؛ پیش از تلاش مجدد تازه‌سازی کنید.', server: 'سرویس پاسخ نداد؛ کمی بعد دوباره تلاش کنید.' },
  en: { network: 'Connection failed. Check your connection and retry; your input is preserved.', 401: 'Session expired. Please sign in again.', 403: 'You do not have permission for this action.', 404: 'Record not found. Refresh the list.', 409: 'Record changed. Refresh before retrying.', server: 'Service unavailable. Please retry later.' },
};
export async function api(url, { locale = 'fa', ...options } = {}) {
  const messages = ERRORS[locale] ?? ERRORS.fa;
  let response;
  try { response = await fetch(url, { cache: 'no-store', ...options }); }
  catch { throw new Error(messages.network); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(messages[response.status] ?? (response.status < 500 ? data?.error : null) ?? messages.server);
  return data;
}
export const post = (url, body) => api(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
