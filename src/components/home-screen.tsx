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
      </div>

      {/* بطاقة اللاعب والإحصائيات المدمجة والاحترافية */}
      <div className="relative z-10 w-full max-w-sm mx-auto rounded-2xl border border-white/10 bg-[#1E293B]/50 p-3 px-4 backdrop-blur-md shadow-xl text-right">
        {/* الجزء العلوي: الترحيب وتعديل الاسم */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#94A3B8]">مرحباً بعودتك،</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-base font-bold text-[#F8FAFC]">{playerName || "لاعب جديد"}</span>
              <button
                type="button"
                onClick={() => {
                  setDraftName(playerName);
                  setNameError(null);
                  setIsNameDialogOpen(true);
                }}
                className="text-[#94A3B8] hover:text-[#F8FAFC] transition p-0.5"
                title="تعديل الاسم"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 20.824a4.5 4.5 0 0 1-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* خط فاصل */}
        <div className="border-t border-white/5"></div>

        {/* الجزء الأوسط: الإحصائيات بشكل أفقي مع فواصل عمودية */}
        <div className="grid grid-cols-4 gap-1 text-center py-2">
          {/* لعبت */}
          <div className="flex flex-col items-center">
            <span className="text-base font-black text-[#F8FAFC]">{playerStats?.played ?? 0}</span>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-0.5">لعبت</span>
          </div>

          {/* فزت */}
          <div className="flex flex-col items-center border-r border-white/5">
            <span className="text-base font-black text-[#34D399]">{playerStats?.won ?? 0}</span>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-0.5">فوز</span>
          </div>

          {/* خسرت */}
          <div className="flex flex-col items-center border-r border-white/5">
            <span className="text-base font-black text-[#F87171]">{playerStats?.lost ?? 0}</span>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-0.5">خسارة</span>
          </div>

          {/* نسبة الفوز */}
          <div className="flex flex-col items-center border-r border-white/5">
            <span className="text-base font-black text-[#FBBF24]">
              {playerStats && playerStats.played > 0 ? Math.round((playerStats.won / playerStats.played) * 100) : 0}%
            </span>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-0.5">نسبة الفوز</span>
          </div>
        </div>

        {/* خط فاصل */}
        <div className="border-t border-white/5"></div>

        {/* الجزء السفلي: زر إعادة تعيين الإحصائيات */}
        <div className="flex justify-center pt-2">
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
            className={`text-[10px] font-semibold transition-all duration-200 ${
              isConfirmingReset
                ? "text-[#EF4444] animate-pulse"
                : "text-[#94A3B8]/50 hover:text-[#EF4444]"
            }`}
          >
            {isConfirmingReset ? "تأكيد إعادة تعيين الإحصائيات؟" : "إعادة تعيين الإحصائيات"}
          </button>
        </div>
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
