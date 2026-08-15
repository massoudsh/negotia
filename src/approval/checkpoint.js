import { randomUUID } from 'node:crypto';

/**
 * رابط تأیید انسانی: هیچ پیام یا پیش‌فاکتوری بدون تأیید صریح یک انسان ارسال نمی‌شود.
 * مرتبط با GitHub issue #10.
 */

/** @param {{type: 'message'|'proforma', payload: object}} params */
export function createApprovalRequest({ type, payload }) {
  return {
    id: randomUUID(),
    type,
    payload,
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    approvedBy: null,
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };
}

export function approve(request, approverId) {
  return { ...request, status: 'approved', approvedBy: approverId, decidedAt: new Date().toISOString() };
}

export function reject(request, approverId, reason) {
  return { ...request, status: 'rejected', approvedBy: approverId, decidedAt: new Date().toISOString(), reason };
}

/** فقط اگر approval تأیید شده باشد اجازه ارسال می‌دهد؛ در غیر این‌صورت خطا می‌دهد. */
export function guardSend(request) {
  if (request.status !== 'approved') {
    throw new Error(`ارسال مسدود شد: این ${request.type} هنوز تأیید انسانی نگرفته (status: ${request.status})`);
  }
  return request.payload;
}
