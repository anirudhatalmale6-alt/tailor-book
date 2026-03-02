'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Project, type ProjectItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export function useProjects() {
  const projects = useLiveQuery(async () => {
    const results = await db.projects.toArray();
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, []);
  return projects;
}

export function useProject(id: string) {
  const project = useLiveQuery(() => db.projects.get(id), [id]);
  return project;
}

export function useCustomerProjects(customerId: string) {
  const projects = useLiveQuery(
    () =>
      db.projects
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
  return projects;
}

export async function addProject(
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.projects.add({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<void> {
  await db.projects.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteProject(id: string): Promise<void> {
  // Delete all project items first
  const items = await db.projectItems.where('projectId').equals(id).toArray();
  const itemIds = items.map((i) => i.id);
  if (itemIds.length > 0) {
    await db.projectItems.bulkDelete(itemIds);
  }
  // Delete expenses linked to this project
  const expenses = await db.expenses.where('projectId').equals(id).toArray();
  const expenseIds = expenses.map((e) => e.id);
  if (expenseIds.length > 0) {
    await db.expenses.bulkDelete(expenseIds);
  }
  await db.projects.delete(id);
}

export function useProjectItems(projectId: string) {
  const items = useLiveQuery(
    () =>
      db.projectItems
        .where('projectId')
        .equals(projectId)
        .toArray()
        .then((arr) =>
          arr.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        ),
    [projectId]
  );
  return items;
}

export function useProjectItem(id: string) {
  const item = useLiveQuery(() => db.projectItems.get(id), [id]);
  return item;
}

export async function addProjectItem(
  data: Omit<ProjectItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.projectItems.add({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateProjectItem(
  id: string,
  data: Partial<ProjectItem>
): Promise<void> {
  await db.projectItems.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteProjectItem(id: string): Promise<void> {
  await db.projectItems.delete(id);
}

export function useProjectExpenses(projectId: string) {
  const expenses = useLiveQuery(
    () =>
      db.expenses
        .where('projectId')
        .equals(projectId)
        .toArray()
        .then((arr) =>
          arr.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        ),
    [projectId]
  );
  return expenses;
}
