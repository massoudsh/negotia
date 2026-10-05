/**
 * موتور اعمال سیاست شرکت روی پیشنهاد قیمت/شرایط.
 * مرتبط با GitHub issue #8 و edge caseهای `.noqte/wiki/concepts/company-policy-guardrails.md`.
 *
 * @param {{productCode: string, unitPrice: number, quantity: number, paymentTerms: string,
 *          deliveryDays: number, country?: string, customerId?: string}} offer
 * @param {object} policy - نگاه کن به config/policy.schema.json
 * @returns {{allowed: boolean, requiresHumanApproval: boolean, violations: string[], adjustedDeliveryDays?: number}}
 */
export function checkOffer(offer, policy) {
  const violations = [];
  let requiresHumanApproval = false;
  let adjustedDeliveryDays;

  const minPrice = policy.minPrice[offer.productCode] ?? policy.minPrice.default;
  if (minPrice != null && offer.unitPrice < minPrice) {
    violations.push('below_min_price');
    requiresHumanApproval = true; // edge case: رد نمی‌کنیم، به تأیید انسانی ارجاع می‌دهیم
  }

  if (!policy.acceptedPaymentTerms.includes(offer.paymentTerms)) {
    violations.push('non_standard_payment_terms');
    requiresHumanApproval = true;
  }

  const isSensitiveCountry = offer.country && (policy.sensitiveCountries ?? []).includes(offer.country);
  const isSensitiveCustomer = offer.customerId && (policy.sensitiveCustomers ?? []).includes(offer.customerId);
  if (isSensitiveCountry || isSensitiveCustomer) {
    violations.push('sensitive_party');
    requiresHumanApproval = true; // edge case: پرچم‌گذاری و توقف تا بررسی انسانی
  }

  const capacity = policy.productionCapacity[offer.productCode];
  if (capacity && offer.quantity > 0 && offer.deliveryDays > 0) {
    const requiredMonthlyRate = offer.quantity / (offer.deliveryDays / 30);
    if (requiredMonthlyRate > capacity.maxPerMonth) {
      // edge case: اصلاح خودکار پیشنهاد بر اساس ظرفیت ثبت‌شده (بدون تعهد بیشتر از ظرفیت واقعی)
      adjustedDeliveryDays = Math.ceil((offer.quantity / capacity.maxPerMonth) * 30);
      violations.push('delivery_beyond_capacity');
    }
  }

  const allowed = violations.length === 0;
  return {
    allowed,
    requiresHumanApproval,
    violations,
    paymentRecommendation: recommendPaymentMethod(offer, policy),
    ...(adjustedDeliveryDays ? { adjustedDeliveryDays } : {}),
  };
}

const DEFAULT_PAYMENT_GUIDANCE = {
  largeDealThreshold: 50000,
  highRiskMethods: ['lc', 'advance_payment'],
  mediumRiskMethods: ['lc', 'advance_payment'],
  lowRiskMethods: ['credit_30', 'credit_60', 'lc', 'advance_payment'],
};

/**
 * راهنمای انتخاب روش دریافت وجه صادراتی بر اساس ریسک کشور/مشتری و حجم معامله.
 * فقط پیشنهاد است؛ انتخاب نهایی و تأیید همچنان با `checkOffer` و تأیید انسانی است.
 *
 * @param {{productCode: string, unitPrice: number, quantity: number, country?: string, customerId?: string}} offer
 * @param {object} policy - می‌تواند `policy.paymentGuidance` اختیاری برای override آستانه‌ها/گزینه‌ها داشته باشد
 * @returns {{riskLevel: 'high'|'medium'|'low', recommendedPaymentTerms: string[], reason: string}}
 */
export function recommendPaymentMethod(offer, policy) {
  const guidance = { ...DEFAULT_PAYMENT_GUIDANCE, ...(policy.paymentGuidance ?? {}) };

  const isSensitiveCountry = offer.country && (policy.sensitiveCountries ?? []).includes(offer.country);
  const isSensitiveCustomer = offer.customerId && (policy.sensitiveCustomers ?? []).includes(offer.customerId);
  const dealValue = (offer.unitPrice ?? 0) * (offer.quantity ?? 0);

  if (isSensitiveCountry || isSensitiveCustomer) {
    return {
      riskLevel: 'high',
      recommendedPaymentTerms: guidance.highRiskMethods,
      reason: 'کشور یا مشتری در فهرست حساس قرار دارد — فقط پیش‌پرداخت کامل یا LC تأییدشده پیشنهاد می‌شود.',
    };
  }

  if (dealValue > guidance.largeDealThreshold) {
    return {
      riskLevel: 'medium',
      recommendedPaymentTerms: guidance.mediumRiskMethods,
      reason: `ارزش معامله (${dealValue}) از آستانه معاملات بزرگ (${guidance.largeDealThreshold}) بیشتر است — LC یا پیش‌پرداخت توصیه می‌شود.`,
    };
  }

  return {
    riskLevel: 'low',
    recommendedPaymentTerms: guidance.lowRiskMethods.filter((m) => policy.acceptedPaymentTerms.includes(m)),
    reason: 'ریسک پایین — شرایط اعتباری استاندارد شرکت نیز قابل قبول است.',
  };
}
