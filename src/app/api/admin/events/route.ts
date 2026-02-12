// app/api/admin/events/route.ts
import { NextResponse } from 'next/server';
import { validateAuth } from '../../../../lib/auth';
import { getEventsByOwner, createList, getList } from '../../../../lib/db';

const RESERVED_SLUGS = ['admin', 'api', 'auth', 'dashboard', '_next'];

export async function GET(request: Request) {
    const username = await validateAuth(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await getEventsByOwner(username);
    return NextResponse.json(events);
}

export async function POST(request: Request) {
    const username = await validateAuth(request);
    if (!username) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await request.json();

    if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
        return NextResponse.json(
            { error: 'Invalid slug — use lowercase letters, numbers, and hyphens' },
            { status: 400 }
        );
    }

    if (RESERVED_SLUGS.includes(slug)) {
        return NextResponse.json(
            { error: 'This slug is reserved' },
            { status: 400 }
        );
    }

    // Check if slug is already taken
    const existing = await getList(slug);
    if (existing) {
        return NextResponse.json(
            { error: 'An event with this slug already exists' },
            { status: 409 }
        );
    }

    const event = await createList(slug, username);
    return NextResponse.json(event);
}
