import fs from 'node:fs';
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

import { initializeWorkspace, readWorkspace, updateWorkspace } from '../../src/storage/database.js';
import { reviewer } from '../../src/auth/accounts.js';

const policy = JSON.parse(fs.readFileSync(new URL('../../config/policy.example.json', import.meta.url), 'utf8'));
initializeWorkspace(() => process.env.NEGOTIA_SEED_DEMO === '1' ? seed() : { contacts: [], products: [], conversations: [], approvals: [] });

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
