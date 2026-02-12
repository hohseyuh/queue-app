// app/[slug]/admin/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

type AdminData = {
  slug: string;
  startTime: number;
  isStarted: boolean;
  currentIndex: number;
  current: { id: string; name: string } | null;
  queue: { id: string; name: string }[];
};

export default function AdminPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Auth state – pulled from localStorage (set by /admin dashboard)
  const [authHeader, setAuthHeader] = useState('');
  const [currentUser, setCurrentUser] = useState('');

  // Fallback login form (if no stored auth)
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [data, setData] = useState<AdminData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [startTimeInput, setStartTimeInput] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // Track whether the user is actively editing the date input
  // so we don't overwrite their changes with polling data
  const isEditingTime = useRef(false);

  // Try to hydrate auth from localStorage on mount
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

  const fetchData = async (hdr: string) => {
    if (!slug || !hdr) return;
    const res = await fetch(`/api/${slug}`, {
      headers: { Authorization: hdr },
    });

    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (res.status === 401) {
      // Stored credentials are invalid
      setAuthHeader('');
      setCurrentUser('');
      localStorage.removeItem('admin-auth');
      return;
    }

    const json = await res.json();
    setData(json);

    // Only update the time input if the user is NOT actively editing it
    if (!isEditingTime.current && json.startTime) {
      const dt = new Date(json.startTime);
      const y = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      const h = String(dt.getHours()).padStart(2, '0');
      const mi = String(dt.getMinutes()).padStart(2, '0');
      setStartTimeInput(`${y}-${mo}-${d}T${h}:${mi}`);
    }
  };

  // Poll for data when authenticated
  useEffect(() => {
    if (!authHeader) return;
    fetchData(authHeader);
    const interval = setInterval(() => fetchData(authHeader), 5000);
    return () => clearInterval(interval);
  }, [authHeader, slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Validate credentials via the login API
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUser, password: loginPass }),
    });

    if (!res.ok) {
      const data = await res.json();
      setLoginError(data.error || 'Invalid credentials');
      return;
    }

    const hdr = 'Basic ' + btoa(loginUser + ':' + loginPass);
    setAuthHeader(hdr);
    setCurrentUser(loginUser);
    localStorage.setItem(
      'admin-auth',
      JSON.stringify({ username: loginUser, authHeader: hdr })
    );
  };

  const saveList = async (partial: Partial<AdminData>) => {
    if (!slug || !authHeader) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(partial),
      });

      if (res.status === 403) {
        setForbidden(true);
        return;
      }

      await fetchData(authHeader);
    } finally {
      setSaving(false);
    }
  };

  const handleStartTimeSave = async () => {
    if (!startTimeInput) return;
    const ts = new Date(startTimeInput).getTime();
    if (Number.isNaN(ts)) return;
    isEditingTime.current = false;
    await saveList({ startTime: ts });
  };

  const handleAddName = async () => {
    const name = newName.trim();
    if (!name || !data) return;
    const newItem = {
      id: crypto.randomUUID(),
      name,
    };
    const updatedQueue = [...(data.queue || []), newItem];
    await saveList({ queue: updatedQueue });
    setNewName('');
  };

  const handleRemove = async (id: string) => {
    if (!data) return;
    const updatedQueue = data.queue.filter((item) => item.id !== id);

    let newCurrentIndex = data.currentIndex;
    const currentId = data.current?.id;
    if (currentId) {
      const idx = updatedQueue.findIndex((x) => x.id === currentId);
      newCurrentIndex = idx === -1 ? 0 : idx;
    } else {
      newCurrentIndex = 0;
    }

    await saveList({
      currentIndex: newCurrentIndex,
      queue: updatedQueue,
    });
  };

  const handleNext = async () => {
    if (!data || !data.queue.length) return;
    const maxIndex = data.queue.length - 1;
    const nextIndex = Math.min(data.currentIndex + 1, maxIndex);
    await saveList({ currentIndex: nextIndex });
  };

  // ── Login form ──
  if (!authHeader) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-8"
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Event Admin
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Sign in to manage{' '}
              <span className="font-mono text-zinc-300">/{slug}</span>
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
              />
            </div>
          </div>

          {loginError && (
            <p className="text-xs font-medium text-red-400">{loginError}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="w-full text-center text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Don&apos;t have an account? Register at /admin
          </button>
        </form>
      </main>
    );
  }

  // ── Forbidden ──
  if (forbidden) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white gap-4">
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-sm text-zinc-500">
          You don&apos;t own this event.
        </p>
        <button
          onClick={() => router.push('/admin')}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
        >
          Back to dashboard
        </button>
      </main>
    );
  }

  // ── Event not found ──
  if (notFound) {
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white gap-4">
        <h1 className="text-xl font-semibold">Event Not Found</h1>
        <p className="text-sm text-zinc-500">
          <span className="font-mono">/{slug}</span> does not exist.
        </p>
        <button
          onClick={() => router.push('/admin')}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 transition-colors"
        >
          Back to dashboard
        </button>
      </main>
    );
  }

  // ── Loading ──
  if (!data) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </main>
    );
  }

  // ── Admin panel ──
  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans max-w-3xl mx-auto space-y-10">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Managing event{' '}
            <span className="font-mono">/{slug}</span>
            {' · '}
            <span className="text-zinc-500">{currentUser}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin')}
            className="rounded-full border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={handleNext}
            className="rounded-full bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-40"
            disabled={saving || !data.queue.length}
          >
            Next in queue
          </button>
        </div>
      </header>

      {/* Event time */}
      <section className="space-y-3 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
            Event start time
          </h2>
          <span className="text-xs text-zinc-500">
            {data.isStarted ? 'Started' : 'Scheduled'}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="datetime-local"
            className="rounded-md bg-black border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            value={startTimeInput}
            onFocus={() => (isEditingTime.current = true)}
            onBlur={() => {
              // Keep editing flag for a bit so fetchData doesn't overwrite immediately
              setTimeout(() => (isEditingTime.current = false), 6000);
            }}
            onChange={(e) => {
              isEditingTime.current = true;
              setStartTimeInput(e.target.value);
            }}
          />
          <button
            onClick={handleStartTimeSave}
            className="rounded-full bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-40"
            disabled={saving}
          >
            Save time
          </button>
        </div>
      </section>

      {/* Queue editor */}
      <section className="space-y-4 border border-zinc-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
          Queue
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 rounded-md bg-black border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            placeholder="Add name to queue"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddName()}
          />
          <button
            onClick={handleAddName}
            className="rounded-full bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-40"
            disabled={saving}
          >
            Add
          </button>
        </div>

        <ul className="space-y-2">
          {data.queue.map((item, index) => {
            const isCurrent = index === data.currentIndex;
            return (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {index + 1}. {item.name}
                  </div>
                  {isCurrent && (
                    <div className="text-[10px] uppercase tracking-widest text-emerald-400">
                      Current
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                  disabled={saving}
                >
                  Remove
                </button>
              </li>
            );
          })}
          {data.queue.length === 0 && (
            <li className="text-xs text-zinc-500">
              No names yet. Add someone above to start the queue.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}