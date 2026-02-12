// app/[slug]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PublicPage() {
    const params = useParams();
    const [data, setData] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');

    const fetchData = async () => {
        const res = await fetch(`/api/${params.slug}`);
        const json = await res.json();
        setData(json);
    };

    // Poll for updates every 2 seconds
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    // Local Countdown Logic
    useEffect(() => {
        if (!data) return;
        const timer = setInterval(() => {
            const now = Date.now();
            const diff = data.startTime - now;

            if (diff <= 0) {
                setTimeLeft('00:00');
            } else {
                const minutes = Math.floor((diff / 1000 / 60) % 60);
                const seconds = Math.floor((diff / 1000) % 60);
                setTimeLeft(`${minutes}m ${seconds}s`);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [data]);

    if (!data) return <div className="p-10 font-mono">Loading...</div>;

    // STATE 1: WAITING ROOM
    if (!data.isStarted && Date.now() < data.startTime) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
                <h1 className="text-sm uppercase tracking-widest text-gray-500 mb-4">Event Starts In</h1>
                <div className="text-9xl font-bold font-mono tracking-tighter">
                    {timeLeft}
                </div>
            </main>
        );
    }

    // STATE 2: LIVE LIST
    return (
        <main className="min-h-screen bg-white text-black p-6 font-sans max-w-2xl mx-auto">
            {/* Module: Current Spotlight */}
            <section className="mb-12 border-b-2 border-black pb-12">
                <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-2 py-1">
                    Now Serving
                </span>
                <h1 className="text-6xl font-extrabold mt-4 leading-tight">
                    {data.current ? data.current.name : "End of Queue"}
                </h1>
            </section>

            {/* Module: The Queue */}
            <section>
                <h2 className="text-sm font-bold uppercase text-gray-400 mb-6">Up Next</h2>
                <ul className="space-y-4">
                    {data.queue.map((item: any, idx: number) => {
                        // Highlight previous items or obscure them
                        const isPast = item.id !== data.current?.id && idx < data.queue.findIndex((x: any) => x.id === data.current?.id);
                        if (isPast) return null; // Don't show past items
                        if (item.id === data.current?.id) return null; // Don't show current in list

                        return (
                            <li key={item.id} className="text-xl border-l-2 border-gray-200 pl-4 py-1 text-gray-600">
                                {item.name}
                            </li>
                        )
                    })}
                </ul>
            </section>
        </main>
    );
}