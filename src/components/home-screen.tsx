"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { IRAQI_WORDS } from "../lib/words";
import { useGameRoom } from "../context/game-room-context";

function normalizeRoomCode(value: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 5);
}

const FLOATING_WORDS = IRAQI_WORDS.slice(0, 18).map((word, index) => ({
  word,
  top: `${(index * 11) % 82 + 6}%`,
  left: `${(index * 17) % 86 + 4}%`,
  size: `${1 + (index % 4) * 0.28}rem`,
  opacity: 0.06 + (index % 3) * 0.02,
  duration: `${18 + (index % 5) * 4}s`,
  delay: `${(index % 6) * -2.2}s`,
  className: index % 2 === 0 ? "floating-word-a" : "floating-word-b",
}));

export function HomeScreen() {
  const searchParams = useSearchParams();
  const { createRoom, joinRoom, playerName, isBusy, firebaseReady, savePlayerName } = useGameRoom();
  const inviteRoomCode = normalizeRoomCode(searchParams.get("room"));
  const autoJoinAttemptRef = useRef<string | null>(null);
  const [roomCode, setRoomCode] = useState(inviteRoomCode);
  const [draftName, setDraftName] = useState(playerName);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(!playerName);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
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
    setRoomCode(normalizeRoomCode(value));
  }

  useEffect(() => {
    if (!inviteRoomCode || !playerName || !firebaseReady || isNameDialogOpen) {
      return;
    }

    if (autoJoinAttemptRef.current === inviteRoomCode) {
      return;
    }

    autoJoinAttemptRef.current = inviteRoomCode;
    void joinRoom(inviteRoomCode, playerName).catch(() => {
      autoJoinAttemptRef.current = null;
    });
  }, [firebaseReady, inviteRoomCode, isNameDialogOpen, joinRoom, playerName]);

  async function handleJoinRoom() {
    await joinRoom(roomCode, playerName);
    setIsJoinDialogOpen(false);
  }

  return (
    <section className="relative mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-6 text-center">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {FLOATING_WORDS.map((item) => (
          <span
            key={`${item.word}-${item.top}-${item.left}`}
            className={`absolute select-none font-black text-white/10 ${item.className}`}
            style={{
              top: item.top,
              left: item.left,
              fontSize: item.size,
              opacity: item.opacity,
              animationDuration: item.duration,
              animationDelay: item.delay,
            }}
          >
            {item.word}
          </span>
        ))}
      </div>

      <div className="relative z-10 w-full">
        <h1 className="bismar-brand text-5xl font-black tracking-[0.08em] md:text-6xl">Bismar</h1>
        <p className="mt-3 text-base font-bold tracking-[0.3em] text-[#F8FAFC]/80">لمح . خمن . فوز</p>
        <p className="mt-3 text-sm leading-6 text-[#F8FAFC]/75">{nameHint}</p>
        <button
          type="button"
          onClick={() => {
            setDraftName(playerName);
            setNameError(null);
            setIsNameDialogOpen(true);
          }}
          className="mt-4 rounded-2xl border border-white/15 bg-[#1E293B]/70 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#1E293B]"
        >
          تعديل الاسم
        </button>
      </div>

      {!firebaseReady ? (
        <div className="relative z-10 w-full rounded-2xl border border-[#DC2626]/40 bg-[#DC2626]/15 p-4 text-sm leading-6 text-[#F8FAFC]">
          متغيرات Firebase غير موجودة بعد. أكمل ملف <code>.env.local</code> ثم أعد تشغيل التطبيق.
        </div>
      ) : null}

      <div className="relative z-10 grid w-full gap-4">
        <button
          type="button"
          onClick={() => createRoom(playerName)}
          disabled={isBusy || !firebaseReady || !playerName}
          className="rounded-2xl bg-[#2563EB] px-5 py-4 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
        >
          إنشاء غرفة
        </button>

        <button
          type="button"
          onClick={() => {
            setRoomCode("");
            setIsJoinDialogOpen(true);
          }}
          disabled={isBusy || !firebaseReady || !playerName}
          className="rounded-2xl border border-white/15 bg-[#1E293B] px-5 py-4 text-sm font-bold text-[#F8FAFC] transition hover:border-[#2563EB] hover:bg-[#1E40AF]/25 disabled:cursor-not-allowed disabled:text-[#F8FAFC]/40"
        >
          الانضمام الى غرفة
        </button>
      </div>

      {isJoinDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl md:p-8">
            <h2 className="text-2xl font-black text-[#F8FAFC]">الانضمام الى غرفة</h2>
            <p className="mt-2 text-sm leading-6 text-[#F8FAFC]/75">
              اكتب كود الغرفة الرقمي ثم اضغط على زر الانضمام.
            </p>

            <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-[#F8FAFC]/85">
              كود الغرفة
              <input
                value={roomCode}
                onChange={(event) => handleRoomCodeChange(event.target.value)}
                placeholder="مثال: 12345"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                className="rounded-2xl border border-white/15 bg-[#0F172A] px-4 py-3 text-center text-base tracking-[0.25em] text-[#F8FAFC] outline-none transition focus:border-[#2563EB]"
              />
            </label>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => void handleJoinRoom()}
                disabled={isBusy || !firebaseReady || !playerName}
                className="flex-1 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
              >
                الانضمام
              </button>
              <button
                type="button"
                onClick={() => setIsJoinDialogOpen(false)}
                className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#0F172A]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isNameDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl md:p-8">
            <h2 className="text-2xl font-black text-[#F8FAFC]">اكتب اسمك</h2>
            <p className="mt-2 text-sm leading-6 text-[#F8FAFC]/75">
              سيتم حفظ الاسم في هذا المتصفح ولن نطلبه منك مرة أخرى.
            </p>

            <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-[#F8FAFC]/85">
              الاسم
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="مثال: علي"
                className="rounded-2xl border border-white/15 bg-[#0F172A] px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#2563EB]"
              />
            </label>

            {nameError ? <p className="mt-3 text-sm text-[#DC2626]">{nameError}</p> : null}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleSaveName}
                disabled={isBusy}
                className="flex-1 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#1D4ED8]"
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
                  className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#0F172A]"
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
