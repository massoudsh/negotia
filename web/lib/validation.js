const numeric = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value));

export function validateOffer(offer) {
  const errors = {};
  if (!numeric(offer.quantity) || Number(offer.quantity) <= 0 || Number(offer.quantity) > Number.MAX_SAFE_INTEGER) errors.quantity = 'مقدار سفارش باید عدد مثبت معتبر باشد.';
  for (const [key, label] of [['unitPrice', 'قیمت واحد'], ['deliveryDays', 'مهلت تحویل']]) {
    if (!numeric(offer[key]) || Number(offer[key]) < 0 || Number(offer[key]) > Number.MAX_SAFE_INTEGER) errors[key] = `${label} باید عدد نامنفی معتبر باشد.`;
  }
  if (typeof offer.destination !== 'string' || !offer.destination.trim() || offer.destination.length > 300) errors.destination = 'مقصد را با حداکثر ۳۰۰ نویسه وارد کنید.';
  if (typeof offer.paymentTerms !== 'string' || !offer.paymentTerms.trim() || offer.paymentTerms.length > 100) errors.paymentTerms = 'شرایط پرداخت معتبر را انتخاب کنید.';
  if (!errors.quantity && !errors.unitPrice && Number(offer.quantity) * Number(offer.unitPrice) > Number.MAX_SAFE_INTEGER) errors.unitPrice = 'مبلغ کل از محدوده محاسبه دقیق بیشتر است.';
  return errors;
}
