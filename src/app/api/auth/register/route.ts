// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { createAdmin } from '../../../../lib/db';

export async function POST(request: Request) {
    const { username, password } = await request.json();

    if (!username || !password) {
        return NextResponse.json(
            { error: 'Username and password are required' },
            { status: 400 }
        );
    }

    if (username.length < 3) {
        return NextResponse.json(
            { error: 'Username must be at least 3 characters' },
            { status: 400 }
        );
    }

    if (password.length < 4) {
        return NextResponse.json(
            { error: 'Password must be at least 4 characters' },
            { status: 400 }
        );
    }

    const admin = await createAdmin(username, password);
    if (!admin) {
        return NextResponse.json(
            { error: 'Username already taken' },
            { status: 409 }
        );
    }

    return NextResponse.json({ username: admin.username });
}
