// app/[slug]/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';

export default function PublicPage() {
    const params = useParams();
    const [data, setData] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
    const [isStarted, setIsStarted] = useState(false);

    const fetchData = async () => {
        const res = await fetch(`/api/${params.slug}`);
        const json = await res.json();
        setData(json);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    // Countdown logic
    useEffect(() => {
        if (!data) return;
        const tick = () => {
            const now = Date.now();
            const diff = data.startTime - now;
            if (diff <= 0) {
                setIsStarted(true);
                setTimeLeft({ h: 0, m: 0, s: 0 });
            } else {
                setIsStarted(false);
                const h = Math.floor(diff / 1000 / 60 / 60);
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);
                setTimeLeft({ h, m, s });
            }
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [data]);

    // Upcoming queue items (excluding past & current)
    const upcomingItems = useMemo(() => {
        if (!data || !data.queue) return [];
        const currentIdx = data.queue.findIndex(
            (x: any) => x.id === data.current?.id
        );
        return data.queue.filter((_: any, idx: number) => idx > currentIdx);
    }, [data]);

    const pad = (n: number) => String(n).padStart(2, '0');

    if (!data) {
        return (
            <main className="fixed inset-0 flex items-center justify-center bg-black">
                <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </main>
        );
    }

    return (
        <>
            {/* Load Satoshi font */}
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://api.fontshare.com/v2/css?f[]=satoshi@700,900&display=swap"
                rel="stylesheet"
            />

            <style jsx global>{`
        .font-satoshi {
          font-family: 'Satoshi', sans-serif;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out both;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .queue-item {
          animation: fadeInUp 0.4s ease-out both;
        }
      `}</style>

            <main className="fixed inset-0 bg-black text-white font-satoshi overflow-hidden flex flex-col">
                {/* ── Top Bar ── */}
                <header className="flex items-center justify-between px-6 py-5 sm:px-10">
                    {/* Logo: DES / INF / TEC stacked */}
                    <div className="leading-[0.85] text-[clamp(1rem,2.5vw,1.4rem)] font-black tracking-tight select-none text-right">
                        <span className="block">DES</span>
                        <span className="block">INF</span>
                        <span className="block">TEC</span>
                    </div>

                    {/* Live pill or countdown pill */}
                    {data.isStarted || isStarted ? (
                        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                            Live
                        </div>
                    ) : (
                        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                            {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
                        </div>
                    )}
                </header>

                {/* ── Main Content ── */}
                <div className="flex flex-1 flex-col justify-center px-6 sm:px-10 pb-10">
                    {/* STATE 1 — Waiting Room */}
                    {!data.isStarted && !isStarted ? (
                        <div className="animate-fade-in-up text-center sm:text-left">
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40 mb-4">
                                Starts in
                            </p>
                            <div className="flex items-baseline justify-center sm:justify-start gap-3 sm:gap-5">
                                {/* Hours */}
                                <div className="flex flex-col items-center">
                                    <span className="text-[clamp(4rem,15vw,10rem)] font-black leading-none tracking-tighter">
                                        {pad(timeLeft.h)}
                                    </span>
                                    <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                        Hr
                                    </span>
                                </div>
                                <span className="text-[clamp(2rem,8vw,5rem)] font-black leading-none text-white/20 animate-pulse-glow">
                                    :
                                </span>
                                {/* Minutes */}
                                <div className="flex flex-col items-center">
                                    <span className="text-[clamp(4rem,15vw,10rem)] font-black leading-none tracking-tighter">
                                        {pad(timeLeft.m)}
                                    </span>
                                    <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                        Min
                                    </span>
                                </div>
                                <span className="text-[clamp(2rem,8vw,5rem)] font-black leading-none text-white/20 animate-pulse-glow">
                                    :
                                </span>
                                {/* Seconds */}
                                <div className="flex flex-col items-center">
                                    <span className="text-[clamp(4rem,15vw,10rem)] font-black leading-none tracking-tighter">
                                        {pad(timeLeft.s)}
                                    </span>
                                    <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                        Sec
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* STATE 2 — Live Queue */
                        <div className="animate-fade-in-up space-y-10 sm:space-y-14">
                            {/* Current / Now Serving */}
                            <section>
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40 mb-3">
                                    Time for
                                </p>
                                <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-black leading-[0.95] tracking-tight">
                                    {data.current ? data.current.name : 'Queue Complete'}
                                </h1>
                            </section>

                            {/* Up Next */}
                            {upcomingItems.length > 0 && (
                                <section>
                                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40 mb-5">
                                        Up next
                                    </p>
                                    <ol className="space-y-3">
                                        {upcomingItems.map((item: any, idx: number) => (
                                            <li
                                                key={item.id}
                                                className="queue-item flex items-baseline gap-4"
                                                style={{ animationDelay: `${idx * 80}ms` }}
                                            >
                                                <span className="text-sm font-bold text-white/20 tabular-nums w-6 text-right shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <span
                                                    className="text-xl sm:text-2xl font-bold transition-colors"
                                                    style={{ opacity: Math.max(1 - idx * 0.15, 0.25) }}
                                                >
                                                    {item.name}
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                </section>
                            )}

                            {upcomingItems.length === 0 && data.current && (
                                <p className="text-sm text-white/30 font-bold uppercase tracking-widest">
                                    Last in queue
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Bottom Bar ── */}
                <footer className="px-6 py-4 sm:px-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20 border-t border-white/5">
                    <span>Queue</span>
                    <span>{data.queue?.length ?? 0} total</span>
                </footer>
            </main>
        </>
    );
}