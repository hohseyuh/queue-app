// lib/db.ts
import Redis from 'ioredis';

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

// Re‑use a single Redis connection across calls
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not set');
}
const redis = new Redis(redisUrl);

const keyFor = (slug: string) => `queue:${slug}`;

export async function getList(slug: string): Promise<ListData | null> {
  const raw = await redis.get(keyFor(slug));
  if (!raw) return null;
  return JSON.parse(raw) as ListData;
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

  await redis.set(keyFor(slug), JSON.stringify(initial));
  return initial;
}

export async function updateList(slug: string, data: Partial<ListData>) {
  const current = await getList(slug);
  if (!current) return null;

  const updated: ListData = { ...current, ...data };
  await redis.set(keyFor(slug), JSON.stringify(updated));
  return updated;
}