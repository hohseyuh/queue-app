// app/api/[slug]/route.ts
import { NextResponse } from 'next/server';
import { getList, updateList, createList } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  
  // AWAIT is now required here
  let list = await getList(slug);
  
  if (!list) list = await createList(slug);

  const now = Date.now();
  const isStarted = now >= list.startTime;

  if (!isStarted) {
    return NextResponse.json({
      startTime: list.startTime,
      isStarted: false,
      current: null,
      queue: [] // Hide queue data
    });
  }

  return NextResponse.json({
    startTime: list.startTime,
    isStarted: true,
    current: list.items[list.currentIndex] || null,
    queue: list.items
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  const body = await request.json();
  
  // AWAIT is now required here
  const updated = await updateList(slug, body);
  
  return NextResponse.json(updated);
}