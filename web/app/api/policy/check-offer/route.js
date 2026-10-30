import { NextResponse } from 'next/server';
import { checkOfferPreview } from '../../../../lib/store.js';

import { withSession } from '../../../../lib/auth.js';

export const POST = withSession(async (req) => {
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
});
