"use client";

import { useMemo, useState } from "react";

import { useGameRoom } from "@/context/game-room-context";

export function HomeScreen() {
  const { createRoom, joinRoom, playerName, isBusy, firebaseReady, savePlayerName } = useGameRoom();
  const [roomCode, setRoomCode] = useState("");
  const [draftName, setDraftName] = useState(playerName);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(!playerName);
  const [nameError, setNameError] = useState<string | null>(null);

  const nameHint = useMemo(() => {
    if (!playerName) {
      return "احفظ اسمك أولاً للمتابعة.";
    }

    return `مرحباً ${playerName}`;
  }, [playerName]);

  function handleSaveName() {
    try {
      savePlayerName(draftName);
      setNameError(null);
      setIsNameDialogOpen(false);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "تعذر حفظ الاسم.");
    }
  }

  function handleRoomCodeChange(value: string) {
    setRoomCode(value.replace(/\D/g, "").slice(0, 5));
  }

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-6 text-center">
      <div className="w-full">
        <h1 className="text-3xl font-black text-slate-950 md:text-4xl">كلمات عراقية</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{nameHint}</p>
        <button
          type="button"
          onClick={() => {
            setDraftName(playerName);
            setNameError(null);
            setIsNameDialogOpen(true);
          }}
          className="mt-4 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-white/50"
        >
          تعديل الاسم
        </button>
      </div>

      {!firebaseReady ? (
        <div className="w-full rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
          متغيرات Firebase غير موجودة بعد. أكمل ملف <code>.env.local</code> ثم أعد تشغيل التطبيق.
        </div>
      ) : null}

      <div className="grid w-full gap-4">
        <button
          type="button"
          onClick={() => createRoom(playerName)}
          disabled={isBusy || !firebaseReady || !playerName}
          className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          إنشاء غرفة
        </button>

        <label className="flex flex-col gap-2 text-right text-sm font-semibold text-slate-700">
          كود الغرفة
          <input
            value={roomCode}
            onChange={(event) => handleRoomCodeChange(event.target.value)}
            placeholder="مثال: 12345"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-center text-base tracking-[0.25em] outline-none transition focus:border-slate-400"
          />
        </label>

        <button
          type="button"
          onClick={() => joinRoom(roomCode, playerName)}
          disabled={isBusy || !firebaseReady || !playerName}
          className="rounded-2xl border border-slate-300 bg-white/70 px-5 py-4 text-sm font-bold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:text-slate-400"
        >
          الانضمام الى غرفة
        </button>
      </div>

      {isNameDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <h2 className="text-2xl font-black text-slate-950">اكتب اسمك</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              سيتم حفظ الاسم في هذا المتصفح ولن نطلبه منك مرة أخرى.
            </p>

            <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-slate-700">
              الاسم
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="مثال: علي"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-slate-400"
              />
            </label>

            {nameError ? <p className="mt-3 text-sm text-rose-700">{nameError}</p> : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleSaveName}
                disabled={isBusy}
                className="flex-1 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                حفظ
              </button>
              {playerName ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(playerName);
                    setIsNameDialogOpen(false);
                  }}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  استمرار
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
