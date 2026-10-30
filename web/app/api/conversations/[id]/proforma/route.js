import { NextResponse } from 'next/server';
import { getConversation, makeProforma } from '../../../../../lib/store.js';

export async function POST(req, { params }) {
  const { id } = await params;
  if (!getConversation(id)) return NextResponse.json({ error: 'مکالمه پیدا نشد' }, { status: 404 });
  try {
    const body = await req.json();
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
    return NextResponse.json(makeProforma(id, offer));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
