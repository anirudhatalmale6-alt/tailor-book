'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Order } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export function useOrders(statusFilter?: string) {
  const orders = useLiveQuery(async () => {
    let results: Order[];
    if (statusFilter && statusFilter !== 'all') {
      results = await db.orders.where('status').equals(statusFilter).toArray();
    } else {
      results = await db.orders.toArray();
    }
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [statusFilter]);
  return orders;
}

export function useOrder(id: string) {
  const order = useLiveQuery(() => db.orders.get(id), [id]);
  return order;
}

export function useCustomerOrders(customerId: string) {
  const orders = useLiveQuery(
    () =>
      db.orders
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
  return orders;
}

export async function addOrder(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.orders.add({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
  await db.orders.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteOrder(id: string): Promise<void> {
  await db.orders.delete(id);
}
