// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type EventData = {
    slug: string;
    owner: string;
    startTime: number;
    currentIndex: number;
    items: { id: string; name: string }[];
};

export default function AdminDashboard() {
    const router = useRouter();

    // Auth state
    const [authHeader, setAuthHeader] = useState('');
    const [currentUser, setCurrentUser] = useState('');

    // Login / register form
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // Events
    const [events, setEvents] = useState<EventData[]>([]);
    const [newSlug, setNewSlug] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Hydrate saved auth on mount
    useEffect(() => {
        const saved = localStorage.getItem('admin-auth');
        if (saved) {
            try {
                const { username, authHeader: hdr } = JSON.parse(saved);
                setCurrentUser(username);
                setAuthHeader(hdr);
            } catch {
                localStorage.removeItem('admin-auth');
            }
        }
    }, []);

    // Fetch events once authenticated
    useEffect(() => {
        if (!authHeader) return;
        fetchEvents();
    }, [authHeader]);

    const fetchEvents = async () => {
        const res = await fetch('/api/admin/events', {
            headers: { Authorization: authHeader },
        });
        if (res.ok) {
            const data = await res.json();
            setEvents(data);
        } else if (res.status === 401) {
            handleLogout();
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);

        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: loginUser, password: loginPass }),
            });

            const data = await res.json();
            if (!res.ok) {
                setAuthError(data.error || 'Authentication failed');
                return;
            }

            const hdr = 'Basic ' + btoa(loginUser + ':' + loginPass);
            setAuthHeader(hdr);
            setCurrentUser(loginUser);
            localStorage.setItem(
                'admin-auth',
                JSON.stringify({ username: loginUser, authHeader: hdr })
            );
        } finally {
            setAuthLoading(false);
        }
    };

    const handleCreateEvent = async () => {
        const slug = newSlug
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        if (!slug) return;

        setCreating(true);
        setCreateError('');

        const res = await fetch('/api/admin/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
            body: JSON.stringify({ slug }),
        });

        if (res.ok) {
            setNewSlug('');
            await fetchEvents();
        } else {
            const data = await res.json();
            setCreateError(data.error || 'Failed to create event');
        }
        setCreating(false);
    };

    const handleLogout = () => {
        setAuthHeader('');
        setCurrentUser('');
        setEvents([]);
        localStorage.removeItem('admin-auth');
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // ── Not logged in ──
    if (!authHeader) {
        return (
            <main className="fixed inset-0 flex items-center justify-center bg-black text-white">
                <form
                    onSubmit={handleAuth}
                    className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8"
                >
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {isRegister ? 'Create Account' : 'Admin Login'}
                        </h1>
                        <p className="mt-1 text-xs text-zinc-500">
                            {isRegister
                                ? 'Register a new admin account'
                                : 'Sign in to manage your events'}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                Username
                            </label>
                            <input
                                className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
                                value={loginUser}
                                onChange={(e) => setLoginUser(e.target.value)}
                                placeholder="your-username"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                Password
                            </label>
                            <input
                                type="password"
                                className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
                                value={loginPass}
                                onChange={(e) => setLoginPass(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {authError && (
                        <p className="text-xs font-medium text-red-400">{authError}</p>
                    )}

                    <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
                    >
                        {authLoading
                            ? '...'
                            : isRegister
                                ? 'Create Account'
                                : 'Sign In'}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setAuthError('');
                        }}
                        className="w-full text-center text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                        {isRegister
                            ? 'Already have an account? Sign in'
                            : "Don't have an account? Register"}
                    </button>
                </form>
            </main>
        );
    }

    // ── Dashboard ──
    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-3xl px-6 py-8 space-y-10">
                {/* Header */}
                <header className="flex items-center justify-between border-b border-zinc-800 pb-5">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Dashboard
                        </h1>
                        <p className="mt-1 text-xs text-zinc-500">
                            Signed in as{' '}
                            <span className="font-medium text-zinc-300">{currentUser}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="rounded-full border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                    >
                        Sign out
                    </button>
                </header>

                {/* Create event */}
                <section className="space-y-4 rounded-2xl border border-zinc-800 p-5">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Create new event
                    </h2>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">
                                /
                            </span>
                            <input
                                className="w-full rounded-lg border border-zinc-800 bg-black py-2.5 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
                                placeholder="event-slug"
                                value={newSlug}
                                onChange={(e) => setNewSlug(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()}
                            />
                        </div>
                        <button
                            onClick={handleCreateEvent}
                            disabled={creating || !newSlug.trim()}
                            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-40"
                        >
                            {creating ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                    {createError && (
                        <p className="text-xs font-medium text-red-400">{createError}</p>
                    )}
                </section>

                {/* Event list */}
                <section className="space-y-4">
                    <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Your events
                    </h2>

                    {events.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
                            <p className="text-sm text-zinc-600">
                                No events yet. Create one above to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {events.map((ev) => {
                                const isStarted = Date.now() >= ev.startTime;
                                return (
                                    <div
                                        key={ev.slug}
                                        className="group flex items-center justify-between rounded-xl border border-zinc-800 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-950"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5">
                                                <span className="font-medium text-sm">/{ev.slug}</span>
                                                {isStarted ? (
                                                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                        Live
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                                        Scheduled
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-600">
                                                {formatDate(ev.startTime)} · {ev.items.length} in queue
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => window.open(`/${ev.slug}`, '_blank')}
                                                className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() =>
                                                    router.push(`/${ev.slug}/admin`)
                                                }
                                                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
                                            >
                                                Manage
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
