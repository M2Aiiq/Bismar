"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useGameRoom } from "../context/game-room-context";
import { getRealtimeDatabase } from "../lib/firebase";
import { ref, get } from "firebase/database";
import { CreateBlitzRoomButton } from "./blitz/CreateBlitzRoom";
import { CreateClashRoomButton } from "./clash/CreateClashRoom";
import { motion, AnimatePresence } from "framer-motion";

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
  const router = useRouter();
  const {
    createRoom,
    joinRoom,
    leaveRoom,
    roomId: activeRoomId,
    playerName,
    isBusy,
    firebaseReady,
    savePlayerName,
    playerStats,
    resetPlayerStats,
    leftRoomCode,
    clearLeftRoomCode,
  } = useGameRoom();
  const inviteRoomCode = normalizeRoomCode(searchParams.get("room"));
  const targetRoomCode = inviteRoomCode || activeRoomId;
  const autoJoinAttemptRef = useRef<string | null>(null);
  const hasLeftRoomRef = useRef(false);
  const joinInputRef = useRef<HTMLInputElement | null>(null);
  const [roomCode, setRoomCode] = useState(targetRoomCode);
  const [draftName, setDraftName] = useState(playerName);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(!playerName);
  const [isJoinExpanded, setIsJoinExpanded] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [clashStats, setClashStats] = useState<{ played: number; won: number; lost: number }>({ played: 0, won: 0, lost: 0 });
  const [activeStatsTab, setActiveStatsTab] = useState<"clash" | "blitz">("clash");
  const [isCodenamesRulesOpen, setIsCodenamesRulesOpen] = useState(false);
  const [codenamesTab, setCodenamesTab] = useState<"rules" | "cards">("rules");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const rulesParam = searchParams.get("rules");
    if (rulesParam === "codenames") {
      setIsCodenamesRulesOpen(true);
      router.replace(window.location.pathname);
    }
  }, [searchParams, router]);

  function handleCopyCodenamesLink() {
    const shareUrl = `${window.location.origin}${window.location.pathname}?rules=codenames`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  useEffect(() => {
    const rawClash = localStorage.getItem("clash-game-stats");
    if (rawClash) {
      try {
        setClashStats(JSON.parse(rawClash));
      } catch { }
    }
  }, []);



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
    if (!targetRoomCode || !playerName || !firebaseReady || isNameDialogOpen) {
      return;
    }

    if (leftRoomCode === targetRoomCode) {
      // تنظيف الرابط عبر راوتر Next.js لتحديث حالة searchParams بشكل تفاعلي
      router.replace(window.location.pathname);
      return;
    }

    if (hasLeftRoomRef.current) {
      return;
    }

    if (autoJoinAttemptRef.current === targetRoomCode) {
      return;
    }

    autoJoinAttemptRef.current = targetRoomCode;
    void joinRoom(targetRoomCode, playerName).catch(() => {
      autoJoinAttemptRef.current = null;
    });
  }, [firebaseReady, targetRoomCode, isNameDialogOpen, joinRoom, playerName, leftRoomCode, router]);

  // في حال خلو العنوان من معامل الغرفة، نقوم بتصفير كود الغرفة المغادَرة لتمكين الدخول إليها مجدداً عند الطلب
  useEffect(() => {
    if (!targetRoomCode && leftRoomCode) {
      clearLeftRoomCode();
    }
  }, [targetRoomCode, leftRoomCode, clearLeftRoomCode]);

  useEffect(() => {
    if (!isJoinExpanded) {
      return;
    }

    joinInputRef.current?.focus();
  }, [isJoinExpanded]);

  async function handleJoinRoom() {
    try {
      const database = getRealtimeDatabase();
      if (database) {
        // التحقق أولاً من وجود غرفة بليتز بهذا الرمز
        const blitzSnapshot = await get(ref(database, `blitzRooms/${roomCode}`));
        if (blitzSnapshot.exists()) {
          router.push(`/blitz/${roomCode}`);
          setIsJoinExpanded(false);
          return;
        }

        // التحقق من وجود غرفة صراع الأعضاء بهذا الرمز
        const clashSnapshot = await get(ref(database, `clashRooms/${roomCode}`));
        if (clashSnapshot.exists()) {
          router.push(`/clash/${roomCode}`);
          setIsJoinExpanded(false);
          return;
        }

        // التحقق من وجود غرفة كود نيمز بهذا الرمز
        const codenamesSnapshot = await get(ref(database, `rooms/${roomCode}`));
        if (codenamesSnapshot.exists()) {
          router.push(`/codenames/${roomCode}`);
          setIsJoinExpanded(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error checking room codes:", err);
    }

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

        {/* أزرار تبديل الإحصائيات */}
        <div className="flex bg-slate-950/40 border border-white/5 rounded-xl p-0.5 mt-2.5 mb-1.5 select-none">
          <button
            type="button"
            onClick={() => {
              setActiveStatsTab("clash");
              setIsConfirmingReset(false);
            }}
            className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${activeStatsTab === "clash"
              ? "bg-rose-600/20 text-rose-400 border border-rose-500/10 shadow-sm"
              : "text-slate-450 hover:text-slate-200"
              }`}
          >
            صراع الأعضاء
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveStatsTab("blitz");
              setIsConfirmingReset(false);
            }}
            className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${activeStatsTab === "blitz"
              ? "bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/10 shadow-sm"
              : "text-slate-450 hover:text-slate-200"
              }`}
          >
            كود نيمز
          </button>
        </div>

        {/* الجزء الأوسط: الإحصائيات بشكل أفقي مع فواصل عمودية */}
        <div className="grid grid-cols-4 gap-1 text-center py-2">
          {/* لعبت */}
          <div className="flex flex-col items-center">
            <span className="text-base font-black text-[#F8FAFC]">
              {activeStatsTab === "clash" ? clashStats.played : (playerStats?.played ?? 0)}
            </span>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-0.5">لعبت</span>
          </div>

          {/* فزت */}
          <div className="flex flex-col items-center border-r border-white/5">
            <span className="text-base font-black text-[#34D399]">
              {activeStatsTab === "clash" ? clashStats.won : (playerStats?.won ?? 0)}
            </span>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-0.5">فوز</span>
          </div>

          {/* خسرت */}
          <div className="flex flex-col items-center border-r border-white/5">
            <span className="text-base font-black text-[#F87171]">
              {activeStatsTab === "clash" ? clashStats.lost : (playerStats?.lost ?? 0)}
            </span>
            <span className="text-[10px] font-bold text-[#94A3B8] mt-0.5">خسارة</span>
          </div>

          {/* نسبة الفوز */}
          <div className="flex flex-col items-center border-r border-white/5">
            <span className="text-base font-black text-[#FBBF24]">
              {(() => {
                const played = activeStatsTab === "clash" ? clashStats.played : (playerStats?.played ?? 0);
                const won = activeStatsTab === "clash" ? clashStats.won : (playerStats?.won ?? 0);
                return played > 0 ? Math.round((won / played) * 100) : 0;
              })()}%
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
                if (activeStatsTab === "clash") {
                  localStorage.removeItem("clash-game-stats");
                  localStorage.removeItem("clash-game-processed-games");
                  setClashStats({ played: 0, won: 0, lost: 0 });
                } else {
                  resetPlayerStats();
                }
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
            className={`text-[10px] font-semibold transition-all duration-205 ${isConfirmingReset
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
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={async () => {
              const nextRoomId = await createRoom(playerName);
              if (nextRoomId) {
                router.push(`/codenames/${nextRoomId}`);
              }
            }}
            disabled={isBusy || !firebaseReady || !playerName}
            className="flex-1 rounded-2xl bg-[#2563EB] px-5 py-4 text-base font-black text-[#F8FAFC] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
          >
            العب الآن
          </button>
          <button
            type="button"
            onClick={() => setIsCodenamesRulesOpen(true)}
            className="w-14 rounded-2xl border border-blue-500/30 bg-[#1E3A8A]/20 flex items-center justify-center text-[#93C5FD] hover:bg-[#1E3A8A]/45 hover:border-blue-500 transition text-xl font-black cursor-pointer shadow-lg shadow-blue-950/20"
            title="كيفية اللعب وقوانين كود نيمز"
          >
            ؟
          </button>
        </div>

        {/* نافذة قوانين كود نيمز */}
        <AnimatePresence>
          {isCodenamesRulesOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCodenamesRulesOpen(false)}
                className="absolute inset-0 cursor-pointer"
              />

              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 15 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-5 md:p-7 shadow-2xl text-[#F8FAFC] flex flex-col max-h-[80vh]"
              >


                <h2 className="text-xl md:text-2xl font-black text-[#60A5FA] mb-4 text-center">
                  دليل وقوانين لعبة كود نيمز (Codenames)
                </h2>

                {/* أزرار التبويب */}
                <div className="flex bg-slate-950/50 border border-white/5 rounded-2xl p-1 mb-5 select-none text-xs md:text-sm font-black">
                  <button
                    type="button"
                    onClick={() => setCodenamesTab("rules")}
                    className={`flex-1 py-2 text-center rounded-xl transition ${
                      codenamesTab === "rules"
                        ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    قوانين اللعبة
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodenamesTab("cards")}
                    className={`flex-1 py-2 text-center rounded-xl transition ${
                      codenamesTab === "cards"
                        ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    تفاصيل الأدوار والألوان
                  </button>
                </div>

                {/* محتوى التبويبات */}
                <div className="flex-1 overflow-y-auto pr-1 text-right text-sm leading-relaxed space-y-4 scrollbar-thin">
                  {codenamesTab === "rules" && (
                    <div className="space-y-4">
                      <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                        <h3 className="font-black text-[#60A5FA] text-base mb-2">🎯 الهدف من اللعبة</h3>
                        <p className="text-slate-350">
                          كود نيمز هي لعبة ذكاء وتواصل بين فريقين (الأحمر والأزرق). الهدف هو كشف جميع كلمات فريقك الموجودة على اللوحة بناءً على تلميحات "مرشد الشفرة". الفريق الذي يكشف جميع كلماته أولاً هو الفائز!
                        </p>
                      </div>

                      <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                        <h3 className="font-black text-[#60A5FA] text-base mb-2">👥 تكوين الفرق والأدوار</h3>
                        <p className="text-slate-350">
                          ينقسم كل فريق إلى دورين أساسيين:
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-2 text-slate-350 mr-2">
                          <li>
                            <strong>مرشد الشفرة (Spymaster):</strong> شخص واحد من كل فريق يعرف الألوان الحقيقية للكلمات، ومهمته إعطاء تلميحات ذكية دون كشف الكلمات مباشرة.
                          </li>
                          <li>
                            <strong>المخمنون (Guessers):</strong> باقي أعضاء الفريق الذين يحللون التلميح ويختارون الكلمات من اللوحة.
                          </li>
                        </ul>
                      </div>

                      <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                        <h3 className="font-black text-[#60A5FA] text-base mb-2">💬 تقديم التلميح</h3>
                        <p className="text-slate-350">
                          في دوره، يعطي مرشد الشفرة تلميحاً من <strong>(كلمة واحدة + رقم)</strong> مثل: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-rose-400 font-mono font-bold">بحر 3</code>. الكلمة تدل على الرابط المشترك بين الكلمات، والرقم يدل على عدد الكلمات المرتبطة بهذا التلميح على اللوحة.
                        </p>
                      </div>
                    </div>
                  )}

                  {codenamesTab === "cards" && (
                    <div className="space-y-4">
                      <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                        <h3 className="font-black text-[#60A5FA] text-base mb-2">🎨 ألوان اللوحة وتصنيفها</h3>
                        <p className="text-slate-350 mb-3">تتكون اللوحة من 25 كلمة موزعة بألوان سرية يعرفها المرشدون فقط:</p>
                        <div className="space-y-2.5">
                          <div className="flex gap-3 items-center bg-rose-950/20 border border-rose-900/40 rounded-xl p-2.5">
                            <span className="w-5 h-5 bg-rose-600 rounded-lg shadow-md shadow-rose-600/30 flex-shrink-0" />
                            <span className="text-slate-300 text-xs"><strong>الكلمات الحمراء:</strong> تابعة للفريق الأحمر.</span>
                          </div>
                          <div className="flex gap-3 items-center bg-blue-950/20 border border-blue-900/40 rounded-xl p-2.5">
                            <span className="w-5 h-5 bg-blue-600 rounded-lg shadow-md shadow-blue-600/30 flex-shrink-0" />
                            <span className="text-slate-300 text-xs"><strong>الكلمات الزرقاء:</strong> تابعة للفريق الأزرق.</span>
                          </div>
                          <div className="flex gap-3 items-center bg-slate-950/40 border border-slate-800 rounded-xl p-2.5">
                            <span className="w-5 h-5 bg-slate-400 rounded-lg shadow-md flex-shrink-0" />
                            <span className="text-slate-300 text-xs"><strong>الكلمات المحايدة (المدنيين):</strong> لا تمنح نقاطاً لأي فريق، وكشفها ينهي دور فريقك فوراً.</span>
                          </div>
                          <div className="flex gap-3 items-center bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                            <span className="w-5 h-5 bg-zinc-900 rounded-lg border border-white/10 flex-shrink-0" />
                            <span className="text-rose-400 text-xs font-black">💀 الكارت الأسود (القاتل): تجنبوه تماماً! الفريق الذي يضغط عليه يخسر اللعبة فوراً!</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                        <h3 className="font-black text-[#60A5FA] text-base mb-2">⚖️ قوانين التخمين</h3>
                        <p className="text-slate-350">
                          يمكن للمخمنين إجراء تخمينات حتى يصلوا للعدد المذكور في التلميح بالإضافة لتخمين واحد إضافي (مثال: إذا كان التلميح 2، يمكنهم التخمين حتى 3 مرات). ينتهي دور الفريق فوراً عند اختيار كلمة خاطئة أو محايدة أو اختيار التوقف اختيارياً.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* أزرار التحكم السفلية */}
                <div className="mt-6 border-t border-white/10 pt-4 flex justify-start gap-2 select-none">
                  <button
                    type="button"
                    onClick={() => setIsCodenamesRulesOpen(false)}
                    className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white cursor-pointer"
                  >
                    فهمت ذلك!
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCodenamesLink}
                    className="flex px-3 py-2 items-center justify-center rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer gap-1.5"
                  >
                    <span>{copied ? "تم النسخ!" : "نسخ الرابط"}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <CreateBlitzRoomButton />

        <CreateClashRoomButton />

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
            className={`absolute inset-0 flex items-center justify-center px-5 text-base font-black text-[#F8FAFC] transition-all duration-300 ${isJoinExpanded
              ? "pointer-events-none translate-y-5 opacity-0"
              : "translate-y-0 opacity-100 hover:border-[#2563EB] hover:bg-[#1E40AF]/25"
              } disabled:cursor-not-allowed disabled:text-[#F8FAFC]/40`}
          >
            الانضمام الى لعبة
          </button>

          <div
            className={`absolute inset-0 transition-all duration-300 ${isJoinExpanded ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
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
