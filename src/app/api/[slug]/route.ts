// app/api/[slug]/route.ts
import { NextResponse } from 'next/server';
import { getList, updateList, createList } from '../../../lib/db';

// Hardcoded basic auth for demo: admin / admin
const ADMIN_AUTH = 'Basic YWRtaW46YWRtaW4=';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;

  const authHeader = request.headers.get('authorization');
  const isAdmin = authHeader === ADMIN_AUTH;

  let list = await getList(slug);
  if (!list) list = await createList(slug);

  const now = Date.now();
  const isStarted = now >= list.startTime;

  // Public users cannot see the queue before the event starts
  if (!isAdmin && !isStarted) {
    return NextResponse.json({
      startTime: list.startTime,
      isStarted: false,
      current: null,
      queue: []
    });
  }

  // Admins (and anyone after start) see full details
  return NextResponse.json({
    slug: list.slug,
    startTime: list.startTime,
    isStarted,
    currentIndex: list.currentIndex,
    current: list.items[list.currentIndex] || null,
    queue: list.items
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== ADMIN_AUTH) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = (await params).slug;
  const body = await request.json();

  const updated = await updateList(slug, body);
  return NextResponse.json(updated);
}

