import fs from 'node:fs';
import path from 'node:path';
import {
  createContact,
  createProduct,
  createConversation,
  createMessage,
} from '../../src/models/index.js';
import { summarizeConversation } from '../../src/negotiation/summarize.js';
import { draftReply } from '../../src/negotiation/draftReply.js';
import { scheduleFollowUp } from '../../src/followup/scheduler.js';
import { checkOffer } from '../../src/policy/guardrails.js';
import { prepareProforma } from '../../src/proforma/prepare.js';
import { approve, reject } from '../../src/approval/checkpoint.js';

// این لایه، store در-حافظه‌ی نسخه‌ی دمو/MVP رابط کاربری است.
// طبق docs/adr/0001-tech-stack.md هنوز DB واقعی وجود ندارد؛
// منطق دامنه (src/) همان کدی است که در آینده پشت repository واقعی قرار می‌گیرد.

const POLICY_PATH = path.join(process.cwd(), '..', 'config', 'policy.example.json');
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));

// از globalThis استفاده می‌کنیم تا در حالت dev (HMR) وضعیت بین reloadها از بین نرود.
const g = globalThis;
if (!g.__negotiaStore) {
  g.__negotiaStore = seed();
}
const store = g.__negotiaStore;

function seed() {
  const buyer = createContact({
    name: 'Ahmed Al-Farsi',
    email: 'ahmed@farsitrading.ae',
    company: 'Al-Farsi Trading LLC',
    country: 'AE',
    role: 'buyer',
  });
  const supplier = createContact({
    name: 'Elena Petrova',
    email: 'elena@baltictools.ru',
    company: 'Baltic Tools OÜ',
    country: 'RU',
    role: 'supplier',
  });

  const pistachio = createProduct({ code: 'PISTACHIO-500G', name: 'Pistachio 500g Pack', unit: 'carton' });
  const packaging = createProduct({ code: 'PKG-BOX-STD', name: 'Standard Export Carton', unit: 'pcs' });

  const conv1 = createConversation({ contactId: buyer.id, productCode: pistachio.code, direction: 'export' });
  pushMessage(conv1, {
    sender: 'contact',
    text: 'Hello, we are interested in 2000 cartons of pistachio 500g, spec grade A. Destination port: Jebel Ali, UAE.',
  });
  pushMessage(conv1, {
    sender: 'company',
    text: 'Thank you for reaching out. Could you please confirm your preferred payment terms and delivery timeline?',
  });
  pushMessage(conv1, {
    sender: 'contact',
    text: 'We can do LC at sight. We need delivery within 30 days if possible.',
  });
  conv1.status = 'serious';

  const conv2 = createConversation({ contactId: supplier.id, productCode: packaging.code, direction: 'import' });
  pushMessage(conv2, {
    sender: 'contact',
    text: 'We can supply standard export cartons, MOQ 10000 pcs, price negotiable based on quantity.',
  });
  conv2.status = 'open';

  return {
    contacts: [buyer, supplier],
    products: [pistachio, packaging],
    conversations: [conv1, conv2],
    approvals: [],
  };
}

function pushMessage(conversation, { sender, text, channel = 'email', at }) {
  const message = createMessage({ conversationId: conversation.id, channel, sender, text, at });
  conversation.messages.push(message);
  conversation.lastMessageAt = message.at;
  return message;
}

export function listConversations() {
  return store.conversations.map(withContact);
}

export function getConversation(id) {
  const conversation = store.conversations.find((c) => c.id === id);
  return conversation ? withContact(conversation) : null;
}

function withContact(conversation) {
  return { ...conversation, contact: store.contacts.find((c) => c.id === conversation.contactId) ?? null };
}

export function addMessage(conversationId, { sender, text, channel = 'email' }) {
  const conversation = store.conversations.find((c) => c.id === conversationId);
  if (!conversation) throw new Error('مکالمه پیدا نشد');
  const message = pushMessage(conversation, { sender, text, channel });
  if (conversation.status === 'closed') conversation.status = 'open';
  return message;
}

export function summarize(conversationId) {
  const conversation = store.conversations.find((c) => c.id === conversationId);
  if (!conversation) throw new Error('مکالمه پیدا نشد');
  return summarizeConversation(conversation);
}

export function draft(conversationId) {
  const conversation = store.conversations.find((c) => c.id === conversationId);
  if (!conversation) throw new Error('مکالمه پیدا نشد');
  const summary = summarizeConversation(conversation);
  return { summary, draft: draftReply(conversation, summary) };
}

export function followUp(conversationId) {
  const conversation = store.conversations.find((c) => c.id === conversationId);
  if (!conversation) throw new Error('مکالمه پیدا نشد');
  return scheduleFollowUp(conversation);
}

export function checkOfferPreview(offer) {
  return checkOffer(offer, policy);
}

export function makeProforma(conversationId, offer) {
  const conversation = store.conversations.find((c) => c.id === conversationId);
  if (!conversation) throw new Error('مکالمه پیدا نشد');
  const { proforma, approvalRequest } = prepareProforma(conversation, offer, policy);
  store.approvals.push(approvalRequest);
  return { proforma, approvalRequest };
}

export function listApprovals() {
  return [...store.approvals].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function decideApproval(id, decision, approverId = 'demo-reviewer', reason) {
  const idx = store.approvals.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('درخواست تأیید پیدا نشد');
  const current = store.approvals[idx];
  const updated =
    decision === 'approved' ? approve(current, approverId) : reject(current, approverId, reason ?? 'رد شده از داشبورد');
  store.approvals[idx] = updated;
  return updated;
}

export function getPolicy() {
  return policy;
}
