// app/api/[slug]/route.ts
import { NextResponse } from 'next/server';
import { getList, updateList } from '../../../lib/db';
import { validateAuth } from '../../../lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  const username = await validateAuth(request);

  const list = await getList(slug);
  if (!list) {
    return NextResponse.json(
      { error: 'Event not found', startTime: 0, isStarted: false, current: null, queue: [] },
      { status: 404 }
    );
  }

  const now = Date.now();
  const isStarted = now >= list.startTime;
  const isOwner = username !== null && list.owner === username;

  // Public users cannot see the queue before the event starts
  if (!isOwner && !isStarted) {
    return NextResponse.json({
      startTime: list.startTime,
      isStarted: false,
      current: null,
      queue: [],
    });
  }

  // Admins (and anyone after start) see full details
  return NextResponse.json({
    slug: list.slug,
    startTime: list.startTime,
    isStarted,
    currentIndex: list.currentIndex,
    current: list.items[list.currentIndex] || null,
    queue: list.items,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const username = await validateAuth(request);
  if (!username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = (await params).slug;

  // Verify event exists and admin owns it
  const list = await getList(slug);
  if (!list) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  if (list.owner !== username) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // The frontend uses "queue" but the DB schema uses "items" —
  // translate back so the merge in updateList hits the right key.
  const { queue, ...rest } = body;
  const patch: Record<string, unknown> = { ...rest };
  if (queue !== undefined) {
    patch.items = queue;
  }

  const updated = await updateList(slug, patch as Partial<typeof list>);
  return NextResponse.json(updated);
}
