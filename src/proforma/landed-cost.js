export const CURRENCIES = ['IRT', 'IRR', 'USD', 'EUR', 'AED', 'CNY'];

function amount(value, label, positive = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value > Number.MAX_SAFE_INTEGER || (positive ? value <= 0 : value < 0)) {
    throw new Error(`${label} باید عدد ${positive ? 'مثبت' : 'نامنفی'} و در محدوده مجاز باشد.`);
  }
  return value;
}

export function snapshotLandedCost(input) {
  const result = calculateLandedCost(input);
  const currencies = [...new Set([input.currency, input.freight.currency, input.insurance.currency])].filter((code) => !['IRT', 'IRR'].includes(code));
  return {
    inputs: {
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      currency: input.currency,
      freight: { amount: input.freight.amount, currency: input.freight.currency },
      insurance: { amount: input.insurance.amount, currency: input.insurance.currency },
      customsCost: input.customsCost,
      otherCost: input.otherCost,
      rates: Object.fromEntries(currencies.map((code) => [code, input.rates[code]])),
    },
    ...result,
  };
}

export function calculateLandedCost({ quantity, unitPrice, currency, freight, insurance, customsCost, otherCost, rates }) {
  amount(quantity, 'مقدار سفارش', true);
  amount(unitPrice, 'قیمت واحد');

  function convert(value, code) {
    amount(value, 'مبلغ');
    if (!CURRENCIES.includes(code)) throw new Error('ارز انتخاب‌شده پشتیبانی نمی‌شود.');
    const rate = code === 'IRT' ? 1 : code === 'IRR' ? 0.1 : rates?.[code];
    amount(rate, `نرخ تبدیل ${code}`, true);
    return value * rate;
  }

  const goods = convert(unitPrice * quantity, currency);
  const shipping = convert(freight.amount, freight.currency);
  const insuranceCost = convert(insurance.amount, insurance.currency);
  const customs = amount(customsCost, 'هزینه گمرکی و مالیات');
  const other = amount(otherCost, 'سایر هزینه‌ها');
  const total = goods + shipping + insuranceCost + customs + other;
  const perUnit = total / quantity;
  amount(total, 'جمع هزینه‌ها');
  amount(perUnit, 'هزینه هر واحد');

  return {
    currency: 'IRT',
    breakdown: { goods, shipping, insurance: insuranceCost, customs, other },
    total,
    perUnit,
  };
}
