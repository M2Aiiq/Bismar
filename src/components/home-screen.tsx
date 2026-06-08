"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useGameRoom } from "../context/game-room-context";

function normalizeRoomCode(value: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 5);
}

const FLOATING_WORDS = [
  "بحر",
  "غزال",
  "اسد",
  "صيدلية",
  "رقم",
  "شفرة",
  "سيارة",
  "طيارة",
  "دولمة",
  "مصطفى",
  "حيدر",
  "بغداد",
  "خريطة",
  "غلط",
  "زعل",
  "فضاء",
  "شمس",
  "قمر",
].map((word, index) => ({
  word,
  top: `${(index * 11) % 82 + 6}%`,
  left: `${(index * 17) % 86 + 4}%`,
  size: `${1 + (index % 4) * 0.28}rem`,
  opacity: 0.13 + (index % 3) * 0.03,
  duration: `${18 + (index % 5) * 4}s`,
  delay: `${(index % 6) * -2.2}s`,
  className: index % 2 === 0 ? "floating-word-a" : "floating-word-b",
}));

export function HomeScreen() {
  const searchParams = useSearchParams();
  const {
    createRoom,
    joinRoom,
    playerName,
    isBusy,
    firebaseReady,
    savePlayerName,
    playerStats,
    resetPlayerStats,
  } = useGameRoom();
  const inviteRoomCode = normalizeRoomCode(searchParams.get("room"));
  const autoJoinAttemptRef = useRef<string | null>(null);
  const joinInputRef = useRef<HTMLInputElement | null>(null);
  const [roomCode, setRoomCode] = useState(inviteRoomCode);
  const [draftName, setDraftName] = useState(playerName);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(!playerName);
  const [isJoinExpanded, setIsJoinExpanded] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const nameHint = useMemo(() => {
    if (!playerName) {
      return "احفظ اسمك أولاً للمتابعة.";
    }

    return `مرحباً ${playerName}`;
  }, [playerName]);

  async function handleSaveName() {
    try {
      await savePlayerName(draftName);
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

  useEffect(() => {
    if (!isJoinExpanded) {
      return;
    }

    joinInputRef.current?.focus();
  }, [isJoinExpanded]);

  async function handleJoinRoom() {
    await joinRoom(roomCode, playerName);
    setIsJoinExpanded(false);
  }

  return (
    <section className="relative mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-6 text-center">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {FLOATING_WORDS.map((item) => (
          <span
            key={`${item.word}-${item.top}-${item.left}`}
            className={`absolute select-none font-black text-[#F8FAFC]/20 ${item.className}`}
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
          className="rounded-2xl bg-[#2563EB] px-5 py-4 text-base font-black text-[#F8FAFC] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
        >
          إنشاء لعبة
        </button>

        <div
          className="relative h-14 overflow-hidden rounded-2xl border border-white/15 bg-[#1E293B] transition-all duration-300"
        >
          <button
            type="button"
            onClick={() => {
              setRoomCode("");
              setIsJoinExpanded(true);
            }}
            disabled={isBusy || !firebaseReady || !playerName || isJoinExpanded}
            className={`absolute inset-0 flex items-center justify-center px-5 text-base font-black text-[#F8FAFC] transition-all duration-300 ${
              isJoinExpanded
                ? "pointer-events-none translate-y-5 opacity-0"
                : "translate-y-0 opacity-100 hover:border-[#2563EB] hover:bg-[#1E40AF]/25"
            } disabled:cursor-not-allowed disabled:text-[#F8FAFC]/40`}
          >
            الانضمام الى لعبة
          </button>

          <div
            className={`absolute inset-0 transition-all duration-300 ${
              isJoinExpanded ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
            }`}
          >
            <div className="relative h-full">
              <button
                type="button"
                onClick={() => {
                  setRoomCode("");
                  setIsJoinExpanded(false);
                }}
                className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 text-lg font-bold text-[#F8FAFC] transition hover:bg-[#0F172A]"
                aria-label="إغلاق"
              >
                ×
              </button>

              <button
                type="button"
                onClick={() => void handleJoinRoom()}
                disabled={isBusy || !firebaseReady || !playerName}
                className="absolute left-12 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-[#2563EB] text-xl font-black text-[#F8FAFC] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
                aria-label="الدخول إلى الغرفة"
              >
                →
              </button>

              <input
                ref={joinInputRef}
                value={roomCode}
                onChange={(event) => handleRoomCodeChange(event.target.value)}
                placeholder="12345"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                className="h-full w-full rounded-2xl bg-[#0F172A] px-4 pl-24 text-center text-base font-bold tracking-[0.25em] text-[#F8FAFC] outline-none transition focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
          </div>
        </div>
      </div>

      {playerStats ? (
        <div className="relative z-10 w-full rounded-3xl border border-white/10 bg-[#1E293B]/60 p-5 backdrop-blur-md shadow-xl transition duration-300 hover:border-white/15">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black text-[#F8FAFC]/90">إحصائيات اللاعب</h3>
            <button
              type="button"
              onClick={() => {
                if (isConfirmingReset) {
                  resetPlayerStats();
                  setIsConfirmingReset(false);
                } else {
                  setIsConfirmingReset(true);
                }
              }}
              onMouseLeave={() => {
                if (isConfirmingReset) {
                  setTimeout(() => setIsConfirmingReset(false), 2000);
                }
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-200 ${
                isConfirmingReset
                  ? "bg-[#EF4444] text-[#F8FAFC] animate-pulse"
                  : "bg-white/5 text-[#94A3B8] hover:bg-[#EF4444]/10 hover:text-[#F87171]"
              }`}
            >
              {isConfirmingReset ? "تأكيد؟" : "تصفير"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* لعبت */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0F172A]/50 p-4 transition duration-200 hover:scale-[1.02] hover:bg-[#0F172A]/70">
              <span className="text-3xl font-black tracking-tight text-[#60A5FA]">{playerStats.played}</span>
              <span className="mt-1.5 text-xs font-semibold text-[#94A3B8]">لعبت</span>
            </div>

            {/* فزت */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0F172A]/50 p-4 transition duration-200 hover:scale-[1.02] hover:bg-[#0F172A]/70">
              <span className="text-3xl font-black tracking-tight text-[#34D399]">{playerStats.won}</span>
              <span className="mt-1.5 text-xs font-semibold text-[#94A3B8]">فزت</span>
            </div>

            {/* خسرت */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0F172A]/50 p-4 transition duration-200 hover:scale-[1.02] hover:bg-[#0F172A]/70">
              <span className="text-3xl font-black tracking-tight text-[#F87171]">{playerStats.lost}</span>
              <span className="mt-1.5 text-xs font-semibold text-[#94A3B8]">خسرت</span>
            </div>

            {/* نسبة الفوز */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0F172A]/50 p-4 transition duration-200 hover:scale-[1.02] hover:bg-[#0F172A]/70">
              <span className="text-3xl font-black tracking-tight text-[#FBBF24]">
                {playerStats.played > 0 ? Math.round((playerStats.won / playerStats.played) * 100) : 0}%
              </span>
              <span className="mt-1.5 text-xs font-semibold text-[#94A3B8]">نسبة الفوز</span>
            </div>
          </div>
        </div>
      ) : null}

      {isNameDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl md:p-8">
            <h2 className="text-2xl font-black text-[#F8FAFC]">اكتب اسمك</h2>

            <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-[#F8FAFC]/85">

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
