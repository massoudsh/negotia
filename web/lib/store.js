import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { snapshotLandedCost } from '../../src/proforma/landed-cost.js';
import {
  createContact,
  createProduct,
  createConversation,
  createMessage,
} from '../../src/models/index.js';
import { summarizeConversation } from '../../src/negotiation/summarize.js';
import { draftReply } from '../../src/negotiation/draftReply.js';
import { buildAgentBrief, createNegotiationPlan, getDealReadiness } from '../../src/negotiation/agent-tools.js';
import { scheduleFollowUp } from '../../src/followup/scheduler.js';
import { checkOffer } from '../../src/policy/guardrails.js';
import { prepareProforma } from '../../src/proforma/prepare.js';
import { approve, reject, createApprovalRequest } from '../../src/approval/checkpoint.js';

import { initializeWorkspace, readWorkspace, updateWorkspace, database } from '../../src/storage/database.js';
import { reviewer } from '../../src/auth/accounts.js';

// Read the policy with a plain path: webpack rewrites new URL(..., import.meta.url)
// literals into build assets, which breaks the server bundle.
const policyPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'config', 'policy.example.json');
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
initializeWorkspace(() => isDemoMode() ? seed() : { contacts: [], products: [], conversations: [], approvals: [] });

// Demo mode is opt-in through NEGOTIA_DEMO_MODE=1 (NEGOTIA_SEED_DEMO=1 is kept as an
// alias for older deployments). It only ever fills a brand-new, empty workspace.
export function isDemoMode(env = process.env) {
  return env.NEGOTIA_DEMO_MODE === '1' || env.NEGOTIA_SEED_DEMO === '1';
}

function seed() {
  const now = Date.now();
  const at = (days, hours = 0) => new Date(now - days * 86400000 - hours * 3600000).toISOString();

  const buyerAe = createContact({ name: 'Ahmed Al-Farsi', email: 'ahmed@farsitrading.ae', company: 'Al-Farsi Trading LLC', country: 'AE', role: 'buyer' });
  const supplierRu = createContact({ name: 'Elena Petrova', email: 'elena@baltictools.ru', company: 'Baltic Tools OÜ', country: 'RU', role: 'supplier' });
  const buyerTr = createContact({ name: 'Mert Yılmaz', email: 'mert@anadolugida.com.tr', company: 'Anadolu Gıda A.Ş.', country: 'TR', role: 'buyer' });
  const supplierCn = createContact({ name: 'Li Wei', email: 'li.wei@ningbopack.cn', company: 'Ningbo Packaging Co.', country: 'CN', role: 'supplier' });
  const buyerGulf = createContact({ name: 'Sara Haddad', email: 'sara@gulfretail.ae', company: 'Gulf Retail Group', country: 'AE', role: 'buyer' });

  const pistachio = createProduct({ code: 'PISTACHIO-500G', name: 'Pistachio 500g Pack', unit: 'carton' });
  const carton = createProduct({ code: 'PKG-BOX-STD', name: 'Standard Export Carton', unit: 'pcs' });
  const saffron = createProduct({ code: 'SAFFRON-1G', name: 'Saffron 1g Jar', unit: 'jar' });
  const dates = createProduct({ code: 'DATES-MAZAFATI-5KG', name: 'Mazafati Dates 5kg', unit: 'box' });

  // 1) Export deal in negotiation, waiting on a human decision.
  const exportAe = createConversation({ contactId: buyerAe.id, productCode: pistachio.code, direction: 'export' });
  pushMessage(exportAe, { sender: 'contact', text: 'Hello, we are interested in 2000 cartons of pistachio 500g, spec grade A. Destination port: Jebel Ali, UAE.', at: at(6) });
  pushMessage(exportAe, { sender: 'company', text: 'Thank you for reaching out. Could you please confirm your preferred payment terms and delivery timeline?', at: at(5) });
  pushMessage(exportAe, { sender: 'contact', text: 'We can do LC at sight. We need delivery within 30 days if possible.', at: at(1) });
  exportAe.status = 'serious';
  exportAe.activity = [
    { id: randomUUID(), at: at(6), actor: 'Demo Operator', actorId: 'demo', type: 'note', text: 'Buyer confirmed grade A and Jebel Ali as the destination port.' },
  ];

  // 2) Import deal with a saved landed-cost estimate and an approved proforma.
  const importRu = createConversation({ contactId: supplierRu.id, productCode: carton.code, direction: 'import' });
  pushMessage(importRu, { sender: 'contact', text: 'We can supply standard export cartons, MOQ 10000 pcs, price negotiable based on quantity.', at: at(9) });
  pushMessage(importRu, { sender: 'company', text: 'Please confirm the unit price for 10000 pcs and the earliest shipment date.', at: at(8) });
  pushMessage(importRu, { sender: 'contact', text: 'USD 0.55 per piece for 10000 pcs, shipment within 45 days.', at: at(7) });
  importRu.status = 'open';
  const estimate = {
    ...snapshotLandedCost({
      quantity: 10000,
      unitPrice: 0.42,
      currency: 'USD',
      freight: { amount: 1800, currency: 'USD' },
      insurance: { amount: 120, currency: 'USD' },
      customsCost: 450000000,
      otherCost: 25000000,
      rates: { USD: 920000 },
    }),
    id: randomUUID(),
    conversationId: importRu.id,
    productCode: carton.code,
    createdAt: at(5),
  };
  importRu.costEstimate = estimate;

  // 3) Export deal that needs a follow-up: the company replied four days ago.
  const exportTr = createConversation({ contactId: buyerTr.id, productCode: saffron.code, direction: 'export' });
  pushMessage(exportTr, { sender: 'contact', text: 'We would like 300 jars of saffron 1g for our retail chain. What is your best price?', at: at(8) });
  pushMessage(exportTr, { sender: 'company', text: 'Our price is USD 6.40 per jar for 300 jars. Could you confirm the payment terms you prefer?', at: at(4) });
  exportTr.status = 'awaiting_reply';

  // 4) Import inquiry that has not been answered yet.
  const importCn = createConversation({ contactId: supplierCn.id, productCode: dates.code, direction: 'import' });
  pushMessage(importCn, { sender: 'contact', text: 'We can offer Mazafati dates 5kg boxes at USD 11.20 per box, MOQ 500 boxes.', at: at(2) });
  importCn.status = 'open';

  // 5) Closed deal kept for history.
  const closedGulf = createConversation({ contactId: buyerGulf.id, productCode: pistachio.code, direction: 'export' });
  pushMessage(closedGulf, { sender: 'contact', text: 'Thanks, the samples arrived and the quality is good.', at: at(20) });
  pushMessage(closedGulf, { sender: 'company', text: 'Glad to hear it. We will keep this file open for your next season order.', at: at(19) });
  closedGulf.status = 'closed';

  const approvals = [];

  const pending = prepareProforma(exportAe, { productCode: pistachio.code, quantity: 2000, unitPrice: 5.2, paymentTerms: 'lc', deliveryDays: 30, destination: 'Jebel Ali' }, policy).approvalRequest;
  pending.createdAt = at(1);
  approvals.push(pending);

  const approved = prepareProforma(importRu, { productCode: carton.code, quantity: 10000, unitPrice: 0.55, paymentTerms: 'advance_payment', deliveryDays: 45, destination: 'Bandar Abbas' }, policy, { costEstimate: estimate }).approvalRequest;
  approved.createdAt = at(5);
  approvals.push(approve(approved, 'Demo Operator'));

  const rejected = prepareProforma(exportTr, { productCode: saffron.code, quantity: 300, unitPrice: 6.4, paymentTerms: 'credit_90', deliveryDays: 21, destination: 'Istanbul' }, policy).approvalRequest;
  rejected.createdAt = at(3);
  approvals.push(reject(rejected, 'Demo Operator', 'شرایط پرداخت ۹۰ روزه خارج از سیاست شرکت است.'));

  exportAe.activity.push({ id: randomUUID(), at: at(1), actor: 'Demo Operator', actorId: 'demo', type: 'proforma', text: 'پیش‌فاکتور برای بررسی ثبت شد.', referenceId: pending.id });
  importRu.activity = [
    { id: randomUUID(), at: at(5), actor: 'Demo Operator', actorId: 'demo', type: 'cost-estimate', text: 'نسخه جدید برآورد بهای تمام‌شده ذخیره شد.', referenceId: estimate.id },
    { id: randomUUID(), at: at(5), actor: 'Demo Operator', actorId: 'demo', type: 'approval', text: 'درخواست تأیید شد؛ ارسال خارجی انجام نشده است.', referenceId: approved.id },
  ];
  exportTr.activity = [
    { id: randomUUID(), at: at(3), actor: 'Demo Operator', actorId: 'demo', type: 'approval', text: 'درخواست رد شد.', referenceId: rejected.id },
  ];

  return {
    contacts: [buyerAe, supplierRu, buyerTr, supplierCn, buyerGulf],
    products: [pistachio, carton, saffron, dates],
    conversations: [exportAe, importRu, exportTr, importCn, closedGulf],
    approvals,
  };
}

function pushMessage(conversation, { sender, text, channel = 'email', at }) {
  const message = createMessage({ conversationId: conversation.id, channel, sender, text, at });
  conversation.messages.push(message);
  conversation.lastMessageAt = message.at;
  return message;
}

export function listConversations() {
  const store = readWorkspace();
  return store.conversations.map((conversation) => withContact(conversation, store));
}

export function getConversation(id) {
  const store = readWorkspace();
  const conversation = store.conversations.find((c) => c.id === id);
  return conversation ? withContact(conversation, store) : null;
}

function withContact(conversation, store) {
  return { ...conversation, contact: store.contacts.find((c) => c.id === conversation.contactId) ?? null };
}

export function addMessage(conversationId, { sender, text, channel = 'email' }, actorId) {
  return updateWorkspace((store) => {
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error('مکالمه پیدا نشد');
    const message = pushMessage(conversation, { sender, text, channel });
    if (actorId) { const actor = reviewer(actorId); message.recordedBy = actor.id; message.recordedByName = actor.name; }
    if (conversation.status === 'closed') conversation.status = 'open';
    return message;
  });
}

export function summarize(conversationId) {
  const conversation = getConversation(conversationId);
  if (!conversation) throw new Error('مکالمه پیدا نشد');
  return summarizeConversation(conversation);
}

export function draft(conversationId) {
  const conversation = getConversation(conversationId);
  if (!conversation) throw new Error('مکالمه پیدا نشد');
  const summary = summarizeConversation(conversation);
  return { summary, draft: draftReply(conversation, summary) };
}

export function followUp(conversationId) {
  const conversation = getConversation(conversationId);
  if (!conversation) throw new Error('مکالمه پیدا نشد');
  return scheduleFollowUp(conversation);
}

function getAgentConversation(conversationId) {
  const conversation = getConversation(conversationId);
  if (!conversation) throw new Error('مکالمه پیدا نشد');
  return conversation;
}

export function getAgentBrief(conversationId) {
  return buildAgentBrief(getAgentConversation(conversationId), policy);
}

export function getDealReadinessForConversation(conversationId) {
  return getDealReadiness(getAgentConversation(conversationId), policy);
}

export function getNegotiationPlan(conversationId) {
  return createNegotiationPlan(getAgentConversation(conversationId), policy);
}

export function checkOfferPreview(offer) {
  return checkOffer(offer, policy);
}

export function saveCostEstimate(conversationId, input, actorId) {
  return updateWorkspace((store) => {
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error('مکالمه پیدا نشد');
    if (conversation.direction !== 'import') throw new Error('برآورد واردات فقط به پرونده وارداتی متصل می‌شود.');
    const estimate = { ...snapshotLandedCost(input), id: randomUUID(), conversationId, productCode: conversation.productCode, createdAt: new Date().toISOString() };
    conversation.costEstimate = estimate;
    if (actorId) { const actor = reviewer(actorId); (conversation.activity ??= []).push({ id: randomUUID(), at: estimate.createdAt, actor: actor.name, actorId, type: 'cost-estimate', text: 'نسخه جدید برآورد بهای تمام‌شده ذخیره شد.', referenceId: estimate.id }); }
    return estimate;
  });
}

export function makeProforma(conversationId, offer, actorId) {
  return updateWorkspace((store) => {
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error('مکالمه پیدا نشد');
    let costEstimate;
    if (offer.costEstimateId) {
      costEstimate = conversation.costEstimate;
      if (!costEstimate || costEstimate.id !== offer.costEstimateId) throw new Error('برآورد تغییر کرده یا موجود نیست؛ پرونده را تازه‌سازی کنید.');
    }
    const result = prepareProforma(conversation, offer, policy, { costEstimate });
    store.approvals.push(result.approvalRequest);
    if (actorId) { const actor = reviewer(actorId); (conversation.activity ??= []).push({ id: randomUUID(), at: result.approvalRequest.createdAt, actor: actor.name, actorId, type: 'proforma', text: 'پیش‌فاکتور برای بررسی ثبت شد.', referenceId: result.approvalRequest.id }); }
    return result;
  });
}

export function listApprovals() {
  return readWorkspace().approvals.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function decideApproval(id, decision, approverId, reason) {
  return updateWorkspace((store) => {
    reviewer(approverId);
    if (!['approved', 'rejected'].includes(decision)) throw new Error('تصمیم معتبر نیست.');
    const idx = store.approvals.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('درخواست تأیید پیدا نشد');
    const current = store.approvals[idx];
    if (current.status !== 'pending') throw new Error('این درخواست قبلاً بررسی شده است.');
    const updated = decision === 'approved' ? approve(current, approverId) : reject(current, approverId, reason ?? 'رد شده از داشبورد');
    store.approvals[idx] = updated;
    const conversation = store.conversations.find(item => item.id === current.payload.conversationId);
    if (conversation) (conversation.activity ??= []).push({ id: randomUUID(), at: updated.decidedAt, actor: reviewer(approverId).name, actorId: approverId, type: 'approval', text: decision === 'approved' ? 'درخواست تأیید شد؛ ارسال خارجی انجام نشده است.' : 'درخواست رد شد.', referenceId: id });
    return updated;
  });
}

export function getPolicy() {
  return policy;
}

export function requestMessageApproval(conversationId, { text, originalText }, actorId) {
  const actor = reviewer(actorId);
  if (typeof text !== 'string' || !text.trim() || text.length > 20000 || typeof originalText !== 'string' || originalText.length > 20000) throw new Error('متن پیش‌نویس معتبر نیست.');
  return updateWorkspace((store) => {
    const conversation = store.conversations.find(item => item.id === conversationId);
    if (!conversation) throw new Error('مکالمه پیدا نشد');
    const contact = store.contacts.find(item => item.id === conversation.contactId);
    const request = createApprovalRequest({ type: 'message', payload: { conversationId, text: text.trim(), originalText, recipient: contact?.email ?? '', requestedBy: actor.id, origin: 'assistant-draft-reviewed', sourceMessageIds: conversation.messages.map(message => message.id) } });
    store.approvals.push(request);
    (conversation.activity ??= []).push({ id: randomUUID(), at: request.createdAt, actor: actor.name, actorId: actor.id, type: 'draft-review', text: 'پیش‌نویس برای تأیید ثبت شد؛ هیچ پیامی ارسال نشده است.', referenceId: request.id });
    return request;
  });
}

export function addNote(conversationId, text, actorId) {
  const actor = reviewer(actorId);
  if (typeof text !== 'string' || !text.trim() || text.length > 10000) throw new Error('یادداشت باید بین ۱ تا ۱۰۰۰۰ نویسه باشد.');
  return updateWorkspace((store) => {
    const conversation = store.conversations.find(item => item.id === conversationId);
    if (!conversation) throw new Error('مکالمه پیدا نشد');
    const note = { id: randomUUID(), at: new Date().toISOString(), actor: actor.name, actorId, type: 'note', text: text.trim() };
    (conversation.activity ??= []).push(note);
    return note;
  });
}

export function getLibrary() {
  const store = readWorkspace();
  return { contacts: store.contacts, products: store.products, terms: policy.acceptedPaymentTerms, source: 'config/policy.example.json' };
}

// Demo mode also provisions a shared, clearly-labelled account so the sample
// workspace can be opened without running the account CLI. It is created only
// when demo mode is on and the account does not exist yet.
export const DEMO_ACCOUNT = { email: 'demo@negotia.local', name: 'Demo Operator', role: 'admin', password: 'demo-mode-password' };

export async function ensureDemoAccount() {
  if (!isDemoMode()) return null;
  const { createUser } = await import('../../src/auth/accounts.js');
  const existing = database.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_ACCOUNT.email);
  if (existing) return null;
  return createUser(DEMO_ACCOUNT);
}
