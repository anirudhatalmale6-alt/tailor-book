import { db } from './db';

const BACKUP_FILENAME = 'stitchmanager-backup.json';

export async function exportAllData() {
  const data = {
    version: 7,
    exportedAt: new Date().toISOString(),
    customers: await db.customers.toArray(),
    measurementFields: await db.measurementFields.toArray(),
    measurements: await db.measurements.toArray(),
    orders: await db.orders.toArray(),
    payments: await db.payments.toArray(),
    expenses: await db.expenses.toArray(),
    settings: await db.settings.toArray(),
    invoices: await db.invoices.toArray(),
    projects: await db.projects.toArray(),
    projectItems: await db.projectItems.toArray(),
    colleagueJobs: await db.colleagueJobs.toArray(),
    colleaguePayments: await db.colleaguePayments.toArray(),
  };
  return JSON.stringify(data);
}

export async function importAllData(jsonString: string) {
  const data = JSON.parse(jsonString);

  await db.transaction('rw',
    [db.customers, db.measurementFields, db.measurements,
    db.orders, db.payments, db.expenses, db.settings,
    db.invoices, db.projects, db.projectItems,
    db.colleagueJobs, db.colleaguePayments],
    async () => {
      // Clear all tables
      await db.customers.clear();
      await db.measurementFields.clear();
      await db.measurements.clear();
      await db.orders.clear();
      await db.payments.clear();
      await db.expenses.clear();
      await db.settings.clear();
      await db.invoices.clear();
      await db.projects.clear();
      await db.projectItems.clear();
      await db.colleagueJobs.clear();
      await db.colleaguePayments.clear();

      // Import all data
      if (data.customers?.length) await db.customers.bulkAdd(data.customers);
      if (data.measurementFields?.length) await db.measurementFields.bulkAdd(data.measurementFields);
      if (data.measurements?.length) await db.measurements.bulkAdd(data.measurements);
      if (data.orders?.length) await db.orders.bulkAdd(data.orders);
      if (data.payments?.length) await db.payments.bulkAdd(data.payments);
      if (data.expenses?.length) await db.expenses.bulkAdd(data.expenses);
      if (data.settings?.length) await db.settings.bulkAdd(data.settings);
      if (data.invoices?.length) await db.invoices.bulkAdd(data.invoices);
      if (data.projects?.length) await db.projects.bulkAdd(data.projects);
      if (data.projectItems?.length) await db.projectItems.bulkAdd(data.projectItems);
      if (data.colleagueJobs?.length) await db.colleagueJobs.bulkAdd(data.colleagueJobs);
      if (data.colleaguePayments?.length) await db.colleaguePayments.bulkAdd(data.colleaguePayments);
    }
  );
}

// Find existing backup file in appDataFolder
async function findBackupFile(accessToken: string): Promise<string | null> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

// Upload backup to Google Drive appDataFolder
export async function backupToGoogleDrive(accessToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const jsonData = await exportAllData();
    const existingFileId = await findBackupFile(accessToken);

    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
      ...(!existingFileId && { parents: ['appDataFolder'] }),
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([jsonData], { type: 'application/json' }));

    const url = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

    const method = existingFileId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error?.message || 'Upload failed' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Restore backup from Google Drive appDataFolder
export async function restoreFromGoogleDrive(accessToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const fileId = await findBackupFile(accessToken);
    if (!fileId) {
      return { success: false, error: 'No backup found in your Google Drive' };
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to download backup' };
    }

    const jsonData = await response.text();
    await importAllData(jsonData);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Get backup info (last backup date)
export async function getBackupInfo(accessToken: string): Promise<{ exists: boolean; lastModified?: string }> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILENAME}'&fields=files(id,name,modifiedTime)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return { exists: true, lastModified: data.files[0].modifiedTime };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}
