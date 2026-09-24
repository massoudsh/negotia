import { createProforma } from '../models/index.js';
import { checkOffer } from '../policy/guardrails.js';
import { createApprovalRequest } from '../approval/checkpoint.js';

/**
 * وقتی مذاکره جدی شد، آماده‌سازی خروجی ساخت‌یافته برای پیش‌فاکتور/تأیید نهایی.
 * مرتبط با GitHub issue #11. همیشه پشت checkpoint تأیید انسانی (issue #10) قرار می‌گیرد.
 *
 * @param {object} conversation
 * @param {{productCode: string, quantity: number, unitPrice: number, paymentTerms: string,
 *          deliveryDays: number, destination: string, country?: string, customerId?: string}} offer
 * @param {object} policy
 * @returns {{proforma: object, approvalRequest: object}}
 */
export function prepareProforma(conversation, offer, policy) {
  const check = checkOffer(offer, policy);

  const proforma = createProforma({
    conversationId: conversation.id,
    productCode: offer.productCode,
    quantity: offer.quantity,
    unitPrice: offer.unitPrice,
    paymentTerms: offer.paymentTerms,
    deliveryDays: check.adjustedDeliveryDays ?? offer.deliveryDays,
    destination: offer.destination,
  });

  proforma.status = 'pending_approval';
  proforma.violations = check.violations;

  // طبق سیاست: ارسال هر پیش‌فاکتور نهایی همیشه نیازمند تأیید انسانی است (config/policy.example.json → requiredApprovals).
  const approvalRequest = createApprovalRequest({ type: 'proforma', payload: proforma });

  return { proforma, approvalRequest };
}
