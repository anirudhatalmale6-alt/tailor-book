'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Customer } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export function useCustomers(searchQuery?: string) {
  const customers = useLiveQuery(async () => {
    let results = await db.customers.orderBy('name').toArray();
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    return results;
  }, [searchQuery]);

  return customers;
}

export function useCustomer(id: string) {
  const customer = useLiveQuery(
    () => db.customers.get(id),
    [id]
  );
  return customer;
}

export async function addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.customers.add({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
  await db.customers.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  await db.customers.delete(id);
}
