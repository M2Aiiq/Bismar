"use client";

import React, { useState } from "react";
import { useBlitzRoom } from "../../hooks/use-blitz-room";
import type { BlitzCard } from "../../types/game";

interface BlitzBoardScreenProps {
  roomId: string;
}

// 1. مكون فرعي لزر الكارت التنافسي (BlitzCardComponent)
const BlitzCardComponent = React.memo(
  ({ card, onTap, playerTeam }: { card: BlitzCard; onTap: (id: number) => void; playerTeam: string }) => {
    const isFlipped = card.clickedBy !== null;

    let backBgClass = "bg-slate-700 border-slate-600";
    if (card.clickedBy === "red") {
      backBgClass = "bg-gradient-to-b from-[#EF4444] to-[#B91C1C] border-[#EF4444] shadow-[0_4px_12px_rgba(239,68,68,0.4)]";
    } else if (card.clickedBy === "blue") {
      backBgClass = "bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] border-[#3B82F6] shadow-[0_4px_12px_rgba(59,130,246,0.4)]";
    } else if (card.clickedBy === "green") {
      backBgClass = "bg-gradient-to-b from-[#10B981] to-[#047857] border-[#10B981] shadow-[0_4px_12px_rgba(16,185,129,0.4)]";
    }

    const handleClick = () => {
      if (!isFlipped && playerTeam !== "unassigned") {
        onTap(card.id);
      }
    };

    return (
      <button
        type="button"
        disabled={isFlipped || playerTeam === "unassigned"}
        onClick={handleClick}
        className="card-perspective relative h-full w-full select-none bg-transparent border-0 p-0 text-center outline-none rounded-xl active:scale-95 aspect-square md:aspect-video"
      >
        <div className={`card-inner h-full w-full ${isFlipped ? "card-flipped" : ""}`}>
          {/* الوجه الأمامي: الكلمة غير مكشوفة */}
          <div className="card-front absolute inset-0 z-0 flex items-center justify-center border border-[#D6D0C5] bg-gradient-to-b from-[#F9F8F6] to-[#E2DDD3] text-[#0F172A] shadow-[inset_0_2px_0px_rgba(255,255,255,0.8),_0_3px_5px_rgba(0,0,0,0.15)] hover:border-[#C7BFB1] rounded-xl p-1">
            <span className="text-[10px] sm:text-xs md:text-sm font-black leading-tight break-all text-center">
              {card.word}
            </span>
          </div>

          {/* الوجه الخلفي: كشف لون الفريق وصحة الكلمة */}
          <div className={`card-back absolute inset-0 z-10 border flex flex-col items-center justify-center text-white rounded-xl ${backBgClass} border-slate-900/15 p-1`}>
            <span className="text-[10px] sm:text-xs md:text-sm font-black leading-tight break-all text-center">
              {card.word}
            </span>
            <span className="text-[8px] sm:text-[10px] opacity-90 font-bold mt-0.5">
              {card.isCorrect ? "✓ صحيح" : "✗ خطأ (-1)"}
            </span>
          </div>
        </div>
      </button>
    );
  }
);

BlitzCardComponent.displayName = "BlitzCardComponent";

// 2. مكون فرعي منفصل للرأس والعداد والنتائج (BlitzHeader) لتجنب إعادة رندر الكروت عند تغير العداد
const BlitzHeader = React.memo(
  ({
    scores,
    timer,
    maxTimer,
    currentCategory,
    scoreLimit
  }: {
    scores: { red: number; blue: number; green: number };
    timer: number;
    maxTimer: number;
    currentCategory: string;
    scoreLimit: number;
  }) => {
    const timerPercentage = Math.max(0, Math.min(100, (timer / maxTimer) * 100));

    return (
      <div className="w-full flex flex-col gap-2 p-3 sm:p-4 bg-[#1E293B]/70 backdrop-blur-md border-b border-white/10 text-right shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* اسم الفئة والهدف */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] sm:text-xs font-black bg-[#EF4444] text-white rounded-full animate-pulse">
              الفئة المستهدفة
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide drop-shadow-[0_2px_4px_rgba(239,68,68,0.4)]">
              {currentCategory}
            </h2>
          </div>

          {/* لوحة النتائج للفرق الثلاثة */}
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-600/15 border border-red-500/20 text-red-400">
              <span className="font-bold">أحمر:</span>
              <span className="font-black text-base">{scores.red ?? 0}</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600/15 border border-blue-500/20 text-blue-400">
              <span className="font-bold">أزرق:</span>
              <span className="font-black text-base">{scores.blue ?? 0}</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-400">
              <span className="font-bold">أخضر:</span>
              <span className="font-black text-base">{scores.green ?? 0}</span>
            </div>
            <div className="text-[10px] text-[#94A3B8] mr-1 border-r border-white/10 pr-2">
              الهدف: <span className="font-black text-white">{scoreLimit}</span>
            </div>
          </div>
        </div>

        {/* شريط تقدم المؤقت */}
        <div className="relative w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full transition-all duration-1000 ${
              timer <= 6 ? "bg-[#EF4444] animate-pulse" : "bg-[#2563EB]"
            }`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      </div>
    );
  }
);

BlitzHeader.displayName = "BlitzHeader";

export function BlitzBoardScreen({ roomId }: BlitzBoardScreenProps) {
  const {
    room,
    playerId,
    playerName,
    isReady,
    error,
    joinBlitzRoom,
    leaveBlitzRoom,
    selectBlitzTeam,
    startBlitzGame,
    tapBlitzCard,
    nextBlitzRound,
    resetBlitzGame
  } = useBlitzRoom(roomId);

  const [nameDraft, setNameDraft] = useState(playerName || "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 1. حالة التحميل والخطأ
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-[#F8FAFC]">
        <div className="text-center font-bold">جاري تحميل الغرفة السريعة...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 text-[#F8FAFC]">
        <div className="w-full max-w-md rounded-2xl border border-[#DC2626]/40 bg-[#DC2626]/10 p-6 text-center">
          <p className="font-bold text-[#F8FAFC]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  // 2. التحقق من كتابة الاسم للمشترك الجديد
  const player = room.players?.[playerId];
  if (!player) {
    const handleSaveName = async () => {
      try {
        await joinBlitzRoom(nameDraft);
        setNameError(null);
      } catch (err) {
        setNameError(err instanceof Error ? err.message : "حدث خطأ غير معروف");
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/90 px-4 backdrop-blur-md">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl md:p-8">
          <div className="text-right">
            <h2 className="text-2xl font-black text-[#F8FAFC]">انضم للبسامير السريعة ⚡</h2>
            <p className="mt-1 text-xs text-[#94A3B8]">اكتب اسمك للمشاركة في اللعب التنافسي</p>
          </div>

          <div className="mt-5 text-right">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="مثال: يوسف"
              className="w-full rounded-2xl border border-white/15 bg-[#0F172A] px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#EF4444]"
            />
          </div>

          {nameError && <p className="mt-2 text-sm text-[#EF4444] text-right">{nameError}</p>}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleSaveName}
              className="flex-1 rounded-2xl bg-[#EF4444] px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-red-600"
            >
              دخول اللوبي 🚀
            </button>
            <button
              type="button"
              onClick={() => window.location.replace("/")}
              className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#0F172A]"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isHost = player.isHost;
  const playerTeam = player.team || "unassigned";

  // دالة نسخ رابط الدعوة
  const handleCopyLink = () => {
    const inviteLink = window.location.href;
    void navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ==================== [ شاشة اللوبي - LOBBY ] ====================
  if (room.status === "lobby") {
    // تصنيف اللاعبين حسب الفرق
    const redPlayers = Object.values(room.players).filter((p) => p.team === "red");
    const bluePlayers = Object.values(room.players).filter((p) => p.team === "blue");
    const greenPlayers = Object.values(room.players).filter((p) => p.team === "green");
    const unassignedPlayers = Object.values(room.players).filter((p) => p.team === "unassigned" || !p.team);

    return (
      <div className="min-h-screen bg-[#0F172A] px-4 py-6 md:px-6 md:py-10 text-right flex flex-col items-center justify-start gap-6">
        <div className="w-full max-w-4xl text-center">
          <h1 className="bismar-brand text-4xl font-black tracking-widest md:text-5xl">Bismar Blitz ⚡</h1>
          <p className="mt-2 text-xs font-bold tracking-widest text-[#F8FAFC]/60">طور التنافس السريع اللحظي</p>
        </div>

        {/* تفاصيل كود ورابط الغرفة */}
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1E293B]/50 p-4 text-center backdrop-blur-md">
          <span className="text-xs text-[#94A3B8]">رمز الغرفة</span>
          <h3 className="text-3xl font-black tracking-[0.3em] text-[#EF4444] mt-1">{roomId}</h3>
          
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              {copied ? "تم نسخ الرابط! ✓" : "نسخ رابط الدعوة 🔗"}
            </button>
            <button
              type="button"
              onClick={leaveBlitzRoom}
              className="rounded-xl bg-red-600/10 border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-600/20 transition"
            >
              مغادرة اللوبي
            </button>
          </div>
        </div>

        {/* كروت اختيار الفرق */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {/* الفريق الأحمر */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex flex-col gap-3 min-h-[160px]">
            <button
              type="button"
              onClick={() => selectBlitzTeam("red")}
              className={`w-full py-2.5 rounded-xl text-xs font-black transition ${
                playerTeam === "red"
                  ? "bg-[#EF4444] text-white shadow-lg shadow-red-600/30"
                  : "bg-red-600/10 text-red-300 hover:bg-red-600/25"
              }`}
            >
              الانضمام للأحمر
            </button>
            <div className="flex flex-col gap-1.5 mt-2">
              {redPlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm text-red-100 bg-red-500/10 px-2.5 py-1.5 rounded-lg">
                  <span className="font-bold">{p.name}</span>
                  {p.isHost && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">مضيف</span>}
                </div>
              ))}
            </div>
          </div>

          {/* الفريق الأزرق */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col gap-3 min-h-[160px]">
            <button
              type="button"
              onClick={() => selectBlitzTeam("blue")}
              className={`w-full py-2.5 rounded-xl text-xs font-black transition ${
                playerTeam === "blue"
                  ? "bg-[#2563EB] text-white shadow-lg shadow-blue-600/30"
                  : "bg-blue-600/10 text-blue-300 hover:bg-blue-600/25"
              }`}
            >
              الانضمام للأزرق
            </button>
            <div className="flex flex-col gap-1.5 mt-2">
              {bluePlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm text-blue-100 bg-blue-500/10 px-2.5 py-1.5 rounded-lg">
                  <span className="font-bold">{p.name}</span>
                  {p.isHost && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">مضيف</span>}
                </div>
              ))}
            </div>
          </div>

          {/* الفريق الأخضر */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col gap-3 min-h-[160px]">
            <button
              type="button"
              onClick={() => selectBlitzTeam("green")}
              className={`w-full py-2.5 rounded-xl text-xs font-black transition ${
                playerTeam === "green"
                  ? "bg-[#10B981] text-white shadow-lg shadow-emerald-600/30"
                  : "bg-emerald-600/10 text-emerald-300 hover:bg-emerald-600/25"
              }`}
            >
              الانضمام للأخضر
            </button>
            <div className="flex flex-col gap-1.5 mt-2">
              {greenPlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm text-emerald-100 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg">
                  <span className="font-bold">{p.name}</span>
                  {p.isHost && <span className="text-[10px] bg-[#10B981] text-white px-1.5 py-0.5 rounded">مضيف</span>}
                </div>
              ))}
            </div>
          </div>

          {/* غير محددين */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3 min-h-[160px]">
            <span className="w-full py-2.5 text-center text-xs font-black text-slate-400 border border-white/5 bg-slate-950/20 rounded-xl">
              المشاهدين / معلقين
            </span>
            <div className="flex flex-col gap-1.5 mt-2">
              {unassignedPlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-lg">
                  <span className="font-bold">{p.name}</span>
                  {p.isHost && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">مضيف</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* زر بدء اللعب للمضيف */}
        <div className="w-full max-w-xs mt-6">
          {isHost ? (
            <button
              type="button"
              onClick={startBlitzGame}
              disabled={redPlayers.length === 0 && bluePlayers.length === 0 && greenPlayers.length === 0}
              className="w-full rounded-2xl bg-[#EF4444] py-4 text-base font-black text-white hover:bg-red-600 disabled:bg-[#EF4444]/35 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 transition-all duration-200"
            >
              ابدأ اللعب السريع ⚡
            </button>
          ) : (
            <div className="text-center text-sm font-semibold text-[#94A3B8] animate-pulse">
              بانتظار مضيف الغرفة لبدء اللعبة...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== [ شاشة اللعب - PLAYING ] ====================
  if (room.status === "playing") {
    return (
      <div className="h-screen w-screen bg-[#0F172A] text-[#F8FAFC] flex flex-col justify-between overflow-hidden select-none">
        
        {/* رأس الشاشة والنتائج والمؤقت */}
        <BlitzHeader
          scores={room.scores}
          timer={room.timer}
          maxTimer={room.settings.roundTimerSeconds}
          currentCategory={room.currentCategory}
          scoreLimit={room.settings.scoreLimit}
        />

        {/* شبكة البطاقات 5x5 */}
        <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-2 flex items-center justify-center overflow-hidden">
          <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full h-full max-h-[82vh] py-2 shrink">
            {room.grid?.map((card) => (
              <BlitzCardComponent
                key={card.id}
                card={card}
                onTap={tapBlitzCard}
                playerTeam={playerTeam}
              />
            ))}
          </div>
        </div>

        {/* أزرار التحكم باللعبة وأسماء اللاعبين بالفرق */}
        <div className="w-full px-4 py-3 bg-slate-950/70 border-t border-white/5 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={leaveBlitzRoom}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
          >
            انسحاب ومغادرة الغرفة
          </button>

          {/* معلومات فريق اللاعب الحالي */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#94A3B8]">فريقك:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black text-white ${
                playerTeam === "red"
                  ? "bg-red-600"
                  : playerTeam === "blue"
                  ? "bg-blue-600"
                  : playerTeam === "green"
                  ? "bg-emerald-600"
                  : "bg-slate-700 text-slate-400"
              }`}
            >
              {playerTeam === "red"
                ? "الأحمر"
                : playerTeam === "blue"
                ? "الأزرق"
                : playerTeam === "green"
                ? "الأخضر"
                : "مشاهد"}
            </span>
          </div>

          {/* أزرار المضيف للتخطي */}
          {isHost && (
            <button
              type="button"
              onClick={nextBlitzRound}
              className="rounded-xl border border-[#EF4444]/30 bg-[#7F1D1D]/20 px-4 py-2 text-xs font-black text-[#FCA5A5] hover:bg-[#7F1D1D]/40 hover:border-[#EF4444] transition"
            >
              تخطي الفئة ⏭️
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==================== [ شاشة النهاية - ENDED ] ====================
  if (room.status === "ended") {
    let winnerLabel = "المشاهدين";
    let winnerBg = "bg-slate-800 border-slate-700";
    if (room.winner === "red") {
      winnerLabel = "الفريق الأحمر ❤️";
      winnerBg = "bg-red-600/10 border-red-500/30 text-red-400";
    } else if (room.winner === "blue") {
      winnerLabel = "الفريق الأزرق 💙";
      winnerBg = "bg-blue-600/10 border-blue-500/30 text-blue-400";
    } else if (room.winner === "green") {
      winnerLabel = "الفريق الأخضر 💚";
      winnerBg = "bg-emerald-600/10 border-emerald-500/30 text-emerald-400";
    }

    return (
      <div className="min-h-screen bg-[#0F172A] px-4 py-12 flex flex-col items-center justify-center text-right text-[#F8FAFC]">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl md:p-8 text-center flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 rounded-full bg-[#EF4444]/20 flex items-center justify-center text-4xl animate-bounce">
            🏆
          </div>

          <div>
            <h2 className="text-3xl font-black text-white">انتهت اللعبة!</h2>
            <p className="mt-1.5 text-sm text-[#94A3B8]">لقد تم التنافس والوصول للحد الأقصى للنقاط</p>
          </div>

          <div className={`w-full py-4 px-6 rounded-2xl border ${winnerBg} text-xl font-black tracking-wide`}>
            بطل البسامير السريعة هو: <br />
            <span className="text-2xl mt-1 block">{winnerLabel}</span>
          </div>

          {/* لوحة النتائج النهائية */}
          <div className="w-full flex justify-around items-center border-t border-b border-white/5 py-4 my-2 text-sm">
            <div>
              <span className="text-xs text-red-400 font-bold block">أحمر</span>
              <span className="font-black text-xl text-white">{room.scores?.red ?? 0}</span>
            </div>
            <div>
              <span className="text-xs text-blue-400 font-bold block">أزرق</span>
              <span className="font-black text-xl text-white">{room.scores?.blue ?? 0}</span>
            </div>
            <div>
              <span className="text-xs text-emerald-400 font-bold block">أخضر</span>
              <span className="font-black text-xl text-white">{room.scores?.green ?? 0}</span>
            </div>
          </div>

          <div className="w-full flex gap-3 mt-4">
            {isHost ? (
              <button
                type="button"
                onClick={resetBlitzGame}
                className="flex-1 rounded-2xl bg-[#EF4444] px-5 py-3.5 text-sm font-black text-white hover:bg-red-600 transition"
              >
                لعب مجدداً 🔄
              </button>
            ) : (
              <div className="flex-1 text-center text-xs font-semibold text-[#94A3B8] animate-pulse py-2">
                بانتظار مضيف الغرفة لبدء جولة جديدة...
              </div>
            )}
            <button
              type="button"
              onClick={leaveBlitzRoom}
              className="rounded-2xl border border-white/10 px-5 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition"
            >
              خروج للرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
