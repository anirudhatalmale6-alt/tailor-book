'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ColleagueJob, type ColleaguePayment } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export function useColleagueJobs(colleagueId: string) {
  return useLiveQuery(
    () => db.colleagueJobs.where('colleagueId').equals(colleagueId).sortBy('createdAt'),
    [colleagueId]
  );
}

export function useColleaguePayments(colleagueId: string) {
  return useLiveQuery(
    () => db.colleaguePayments.where('colleagueId').equals(colleagueId).sortBy('createdAt'),
    [colleagueId]
  );
}

export function useJobPayments(jobId: string) {
  return useLiveQuery(
    () => db.colleaguePayments.where('jobId').equals(jobId).sortBy('createdAt'),
    [jobId]
  );
}

export async function addColleagueJob(data: Omit<ColleagueJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.colleagueJobs.add({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateColleagueJob(id: string, data: Partial<ColleagueJob>): Promise<void> {
  await db.colleagueJobs.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function addColleaguePayment(data: Omit<ColleaguePayment, 'id' | 'createdAt'>): Promise<string> {
  const id = uuidv4();
  await db.colleaguePayments.add({
    ...data,
    id,
    createdAt: new Date().toISOString(),
  });
  return id;
}
