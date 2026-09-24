import { NextResponse } from 'next/server';
import { checkOfferPreview } from '../../../../lib/store.js';

// پیش‌نمایش زنده‌ی نتیجه guardrails قبل از ثبت نهایی پیش‌فاکتور (بدون ساخت approval request).
export async function POST(req) {
  const body = await req.json();
  const offer = {
    productCode: body.productCode,
    quantity: Number(body.quantity),
    unitPrice: Number(body.unitPrice),
    paymentTerms: body.paymentTerms,
    deliveryDays: Number(body.deliveryDays),
    country: body.country || undefined,
    customerId: body.customerId || undefined,
  };
  return NextResponse.json(checkOfferPreview(offer));
}
