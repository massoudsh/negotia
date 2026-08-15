import { randomUUID } from 'node:crypto';

/** @see docs/data-model.md */

export function createContact({ name, email, company, country, role }) {
  return {
    id: randomUUID(),
    name,
    email,
    company,
    country,
    role, // 'buyer' | 'supplier'
    createdAt: new Date().toISOString(),
  };
}

export function createProduct({ code, name, unit }) {
  return { id: randomUUID(), code, name, unit, createdAt: new Date().toISOString() };
}

export function createConversation({ contactId, productCode, direction = 'export' }) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    contactId,
    productCode,
    direction, // 'export' | 'import'
    status: 'open', // 'open' | 'awaiting_reply' | 'serious' | 'closed'
    messages: [],
    lastMessageAt: now,
    createdAt: now,
  };
}

export function createMessage({ conversationId, channel, sender, text, at }) {
  return {
    id: randomUUID(),
    conversationId,
    channel, // 'email' | 'whatsapp' | ...
    sender, // 'contact' | 'company'
    text,
    at: at || new Date().toISOString(),
  };
}

export function createProforma({ conversationId, productCode, quantity, unitPrice, paymentTerms, deliveryDays, destination }) {
  return {
    id: randomUUID(),
    conversationId,
    productCode,
    quantity,
    unitPrice,
    totalPrice: Number((quantity * unitPrice).toFixed(2)),
    paymentTerms,
    deliveryDays,
    destination,
    status: 'draft', // 'draft' | 'pending_approval' | 'approved' | 'rejected'
    violations: [],
    createdAt: new Date().toISOString(),
  };
}
