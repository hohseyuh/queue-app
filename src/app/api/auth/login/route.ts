// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { getAdmin } from '../../../../lib/db';

export async function POST(request: Request) {
    const { username, password } = await request.json();

    if (!username || !password) {
        return NextResponse.json(
            { error: 'Username and password are required' },
            { status: 400 }
        );
    }

    const admin = await getAdmin(username);
    if (!admin || admin.password !== password) {
        return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
        );
    }

    return NextResponse.json({ username: admin.username });
}
