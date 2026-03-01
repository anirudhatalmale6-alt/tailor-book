'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MeasurementField, DEFAULT_MEASUREMENT_FIELDS } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from 'react';

let seedingDone = false;
let seedingPromise: Promise<void> | null = null;

async function ensureDefaults() {
  if (seedingDone) return;
  if (seedingPromise) return seedingPromise;
  seedingPromise = (async () => {
    try {
      const count = await db.measurementFields.count();
      if (count === 0) {
        const now = new Date().toISOString();
        const defaults: MeasurementField[] = DEFAULT_MEASUREMENT_FIELDS.map((f) => ({
          ...f,
          id: uuidv4(),
          createdAt: now,
        }));
        await db.measurementFields.bulkAdd(defaults);
      }
      seedingDone = true;
    } catch (err) {
      console.error('Failed to seed default measurement fields:', err);
      seedingDone = true;
    }
  })();
  return seedingPromise;
}

export function useMeasurementFields(): MeasurementField[] | undefined {
  const [ready, setReady] = useState(seedingDone);

  useEffect(() => {
    if (!ready) {
      ensureDefaults().then(() => setReady(true));
    }
  }, [ready]);

  const fields = useLiveQuery(
    async () => {
      if (!ready) return undefined;
      return db.measurementFields.orderBy('sortOrder').toArray();
    },
    [ready]
  );

  return fields ?? undefined;
}

export function useCustomerMeasurements(customerId: string) {
  const measurements = useLiveQuery(
    () =>
      db.measurements
        .where('customerId')
        .equals(customerId)
        .reverse()
        .sortBy('createdAt'),
    [customerId]
  );
  return measurements;
}

export async function addMeasurement(
  customerId: string,
  fields: Record<string, number | string>,
  notes: string
): Promise<string> {
  const id = uuidv4();
  await db.measurements.add({
    id,
    customerId,
    fields,
    notes,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function addMeasurementField(
  data: Omit<MeasurementField, 'id' | 'createdAt'>
): Promise<string> {
  const id = uuidv4();
  await db.measurementFields.add({
    ...data,
    id,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function updateMeasurementField(
  id: string,
  data: Partial<MeasurementField>
): Promise<void> {
  await db.measurementFields.update(id, data);
}

export async function deleteMeasurementField(id: string): Promise<void> {
  await db.measurementFields.delete(id);
}
