// app/[slug]/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const ADMIN_AUTH_HEADER = 'Basic YWRtaW46YWRtaW4=';

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
  const slug = params.slug as string;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [data, setData] = useState<AdminData | null>(null);
  const [startTimeInput, setStartTimeInput] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!slug) return;
    const res = await fetch(`/api/${slug}`, {
      headers: {
        Authorization: ADMIN_AUTH_HEADER,
      },
    });
    const json = await res.json();
    setData(json);

    if (json.startTime) {
      const dt = new Date(json.startTime);
      // datetime-local wants yyyy-MM-ddTHH:mm
      setStartTimeInput(dt.toISOString().slice(0, 16));
    }
  };

  useEffect(() => {
    if (!isAuthed) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isAuthed, slug]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      setIsAuthed(true);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const saveList = async (partial: Partial<AdminData>) => {
    if (!slug) return;
    setSaving(true);
    try {
      await fetch(`/api/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: ADMIN_AUTH_HEADER,
        },
        body: JSON.stringify(partial),
      });
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleStartTimeSave = async () => {
    if (!startTimeInput) return;
    const ts = new Date(startTimeInput).getTime();
    if (Number.isNaN(ts)) return;
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

  if (!isAuthed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <form
          onSubmit={handleLogin}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 w-full max-w-sm space-y-6"
        >
          <h1 className="text-xl font-semibold tracking-tight">Admin Login</h1>
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest text-zinc-400">
              Username
            </label>
            <input
              className="w-full rounded-md bg-black border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest text-zinc-400">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-md bg-black border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {loginError && (
            <p className="text-xs text-red-400">{loginError}</p>
          )}
          <button
            type="submit"
            className="w-full rounded-full bg-white text-black py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            Sign in
          </button>
        </form>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-sm font-mono">Loading admin data...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans max-w-3xl mx-auto space-y-10">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Managing event <span className="font-mono">/{slug}</span>
          </p>
        </div>
        <button
          onClick={handleNext}
          className="rounded-full bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-40"
          disabled={saving || !data.queue.length}
        >
          Next in queue
        </button>
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
            onChange={(e) => setStartTimeInput(e.target.value)}
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