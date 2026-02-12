// lib/db.ts
import { kv } from '@vercel/kv';

export type QueueItem = {
  id: string;
  name: string;
};

export type ListData = {
  slug: string;
  startTime: number;
  currentIndex: number;
  items: QueueItem[];
};

const DEFAULT_START_DELAY = 1000 * 60 * 60; // 1 Hour

export async function getList(slug: string): Promise<ListData | null> {
  // Fetch JSON object directly from Redis key
  return await kv.get<ListData>(`queue:${slug}`);
}

export async function createList(slug: string): Promise<ListData> {
  const existing = await getList(slug);
  if (existing) return existing;

  const initial: ListData = {
    slug,
    startTime: Date.now() + DEFAULT_START_DELAY,
    currentIndex: 0,
    items: [],
  };

  // Save to Redis
  await kv.set(`queue:${slug}`, initial);
  return initial;
}

export async function updateList(slug: string, data: Partial<ListData>) {
  const current = await getList(slug);
  
  // Safety check: if list doesn't exist, create it first or return error
  if (!current) return null; 

  const updated = { ...current, ...data };
  
  // Overwrite the key with new data
  await kv.set(`queue:${slug}`, updated);
  return updated;
}