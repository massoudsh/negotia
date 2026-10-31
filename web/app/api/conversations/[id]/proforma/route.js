import { NextResponse } from 'next/server';
import { getConversation, makeProforma } from '../../../../../lib/store.js';

import { withSession } from '../../../../../lib/auth.js';
import { validateOffer } from '../../../../../lib/validation.js';

export const POST = withSession(async (req, { params }, user) => {
  const { id } = await params;
  if (!getConversation(id)) return NextResponse.json({ error: 'مکالمه پیدا نشد' }, { status: 404 });
  try {
    const body = await req.json();
    const errors = validateOffer(body ?? {});
    if (Object.keys(errors).length) return NextResponse.json({ error: 'فیلدهای پیش‌فاکتور را اصلاح کنید.', fields: errors }, { status: 400 });
    const offer = {
      productCode: body.productCode,
      quantity: Number(body.quantity),
      unitPrice: Number(body.unitPrice),
      paymentTerms: body.paymentTerms,
      deliveryDays: Number(body.deliveryDays),
      destination: body.destination,
      country: body.country || undefined,
      customerId: body.customerId || undefined,
      costEstimateId: body.costEstimateId,
    };
    return NextResponse.json(makeProforma(id, offer, user.id));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
});
