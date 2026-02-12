// lib/auth.ts
import { getAdmin } from './db';

/**
 * Parse the Basic Auth header and validate against stored admin credentials.
 * Returns the admin username on success, null otherwise.
 */
export async function validateAuth(
    request: Request
): Promise<string | null> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Basic ')) return null;

    try {
        const decoded = Buffer.from(authHeader.slice(6), 'base64').toString(
            'utf-8'
        );
        const colonIndex = decoded.indexOf(':');
        if (colonIndex === -1) return null;

        const username = decoded.slice(0, colonIndex);
        const password = decoded.slice(colonIndex + 1);

        const admin = await getAdmin(username);
        if (!admin || admin.password !== password) return null;

        return username;
    } catch {
        return null;
    }
}
