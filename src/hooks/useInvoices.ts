'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Invoice } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export function useInvoices() {
  const invoices = useLiveQuery(async () => {
    const results = await db.invoices.toArray();
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);
  return invoices;
}

export function useInvoice(id: string) {
  const invoice = useLiveQuery(() => db.invoices.get(id), [id]);
  return invoice;
}

export function useOrderInvoice(orderId: string) {
  const invoice = useLiveQuery(
    () =>
      db.invoices
        .where('orderId')
        .equals(orderId)
        .first(),
    [orderId]
  );
  return invoice;
}

export async function generateInvoiceNumber(): Promise<string> {
  const allInvoices = await db.invoices.toArray();
  const maxNum = allInvoices.reduce((max, inv) => {
    const match = inv.invoiceNumber.match(/^INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  const next = maxNum + 1;
  return `INV-${next.toString().padStart(3, '0')}`;
}

export async function addInvoice(
  data: Omit<Invoice, 'id' | 'createdAt'>
): Promise<string> {
  const id = uuidv4();
  await db.invoices.add({
    ...data,
    id,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function updateInvoice(
  id: string,
  data: Partial<Invoice>
): Promise<void> {
  await db.invoices.update(id, data);
}

export async function deleteInvoice(id: string): Promise<void> {
  await db.invoices.delete(id);
}
