'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Payment } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export function usePayments() {
  const payments = useLiveQuery(async () => {
    const results = await db.payments.toArray();
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);
  return payments;
}

export function useOrderPayments(orderId: string) {
  const payments = useLiveQuery(
    () =>
      db.payments
        .where('orderId')
        .equals(orderId)
        .toArray()
        .then((arr) =>
          arr.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        ),
    [orderId]
  );
  return payments;
}

export function useCustomerPayments(customerId: string) {
  const payments = useLiveQuery(
    () =>
      db.payments
        .where('customerId')
        .equals(customerId)
        .toArray()
        .then((arr) =>
          arr.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        ),
    [customerId]
  );
  return payments;
}

export async function addPayment(
  data: Omit<Payment, 'id' | 'createdAt'>
): Promise<string> {
  const id = uuidv4();
  await db.payments.add({
    ...data,
    id,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function deletePayment(id: string): Promise<void> {
  await db.payments.delete(id);
}
