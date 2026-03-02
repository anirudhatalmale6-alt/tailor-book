'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export function useExpenses() {
  const expenses = useLiveQuery(async () => {
    const results = await db.expenses.toArray();
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);
  return expenses;
}

export async function addExpense(
  data: Omit<Expense, 'id' | 'createdAt'>
): Promise<string> {
  const id = uuidv4();
  await db.expenses.add({
    ...data,
    expenseType: data.expenseType || 'business',
    id,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
}
