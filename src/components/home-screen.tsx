"use client";

import { useState } from "react";

import { useGameRoom } from "@/context/game-room-context";

export function HomeScreen() {
  const { createRoom, joinRoom, playerName, isBusy, firebaseReady } = useGameRoom();
  const [name, setName] = useState(playerName);
  const [roomCode, setRoomCode] = useState("");

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row">
      <div className="flex-1 rounded-3xl bg-slate-950 p-6 text-white shadow-2xl md:p-10">
        <p className="text-sm text-amber-300">لعبة جماعية لحظية بطابع عراقي</p>
        <h1 className="mt-3 text-3xl font-black md:text-5xl">كلمات عراقية</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
          تطبيق Serverless مبني على Next.js وFirebase Realtime Database، مخصص للهواتف أولاً
          ويعمل من المتصفح مباشرة بدون سيرفر مخصص.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-slate-200 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">5x5 كروت بكلمات عراقية مفردة</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">القائد يرى الألوان الحقيقية</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">المحقق يكشف الكروت لحظياً</div>
        </div>
      </div>

      <div className="flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
        <div>
          <h2 className="text-2xl font-black text-slate-950">ابدأ الجولة</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            اكتب اسمك ثم أنشئ غرفة جديدة أو انضم بكود الغرفة.
          </p>
        </div>

        {!firebaseReady ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            متغيرات Firebase غير موجودة بعد. انسخ القيم إلى ملف <code>.env.local</code> اعتماداً على{" "}
            <code>.env.example</code> ثم أعد تشغيل التطبيق.
          </div>
        ) : null}

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          اسم اللاعب
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="مثال: علي"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none ring-0 transition focus:border-slate-400"
          />
        </label>

        <button
          type="button"
          onClick={() => createRoom(name)}
          disabled={isBusy || !firebaseReady}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          إنشاء غرفة
        </button>

        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          أو
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
          كود الغرفة
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="مثال: A7K9D"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-base uppercase outline-none transition focus:border-slate-400"
          />
        </label>

        <button
          type="button"
          onClick={() => joinRoom(roomCode, name)}
          disabled={isBusy || !firebaseReady}
          className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          انضمام إلى الغرفة
        </button>
      </div>
    </section>
  );
}
