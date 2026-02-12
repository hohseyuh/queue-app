// lib/db.ts
import Redis from 'ioredis';

export type QueueItem = {
  id: string;
  name: string;
};

export type ListData = {
  slug: string;
  owner: string;
  startTime: number;
  currentIndex: number;
  items: QueueItem[];
};

export type AdminUser = {
  username: string;
  password: string;
};

const DEFAULT_START_DELAY = 1000 * 60 * 60; // 1 hour

// Re-use a single Redis connection across calls
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not set');
}
const redis = new Redis(redisUrl);

// ── Key helpers ──
const keyFor = (slug: string) => `queue:${slug}`;
const adminKeyFor = (username: string) => `admin:${username}`;
const adminEventsKeyFor = (username: string) => `admin-events:${username}`;

// ── Admin functions ──

export async function createAdmin(
  username: string,
  password: string
): Promise<AdminUser | null> {
  const existing = await getAdmin(username);
  if (existing) return null; // username taken
  const admin: AdminUser = { username, password };
  await redis.set(adminKeyFor(username), JSON.stringify(admin));
  return admin;
}

export async function getAdmin(
  username: string
): Promise<AdminUser | null> {
  const raw = await redis.get(adminKeyFor(username));
  if (!raw) return null;
  return JSON.parse(raw) as AdminUser;
}

// ── Event / Queue functions ──

export async function getList(slug: string): Promise<ListData | null> {
  const raw = await redis.get(keyFor(slug));
  if (!raw) return null;
  return JSON.parse(raw) as ListData;
}

export async function createList(
  slug: string,
  owner: string
): Promise<ListData> {
  const existing = await getList(slug);
  if (existing) return existing;

  const initial: ListData = {
    slug,
    owner,
    startTime: Date.now() + DEFAULT_START_DELAY,
    currentIndex: 0,
    items: [],
  };

  await redis.set(keyFor(slug), JSON.stringify(initial));
  await redis.sadd(adminEventsKeyFor(owner), slug);
  return initial;
}

export async function updateList(
  slug: string,
  data: Partial<ListData>
): Promise<ListData | null> {
  const current = await getList(slug);
  if (!current) return null;

  const updated: ListData = { ...current, ...data };
  await redis.set(keyFor(slug), JSON.stringify(updated));
  return updated;
}

export async function deleteList(slug: string): Promise<boolean> {
  const list = await getList(slug);
  if (!list) return false;
  await redis.del(keyFor(slug));
  if (list.owner) {
    await redis.srem(adminEventsKeyFor(list.owner), slug);
  }
  return true;
}

export async function getEventsByOwner(
  username: string
): Promise<ListData[]> {
  const slugs = await redis.smembers(adminEventsKeyFor(username));
  const events: ListData[] = [];
  for (const slug of slugs) {
    const list = await getList(slug);
    if (list) events.push(list);
  }
  return events;
}