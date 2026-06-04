"use client";

import { useEffect, useState } from "react";

import { useGameRoom } from "../context/game-room-context";
import { teamLabel } from "../lib/teams";

function winnerFrameClass(team: string | null) {
  switch (team) {
    case "Red":
      return "border-[#DC2626] shadow-[0_0_25px_rgba(220,38,38,0.25)]";
    case "Blue":
      return "border-[#2563EB] shadow-[0_0_25px_rgba(37,99,235,0.25)]";
    case "Green":
      return "border-[#10B981] shadow-[0_0_25px_rgba(16,185,129,0.25)]";
    case "Gold":
      return "border-[#EAB308] shadow-[0_0_25px_rgba(234,179,8,0.22)]";
    default:
      return "border-[#334155] shadow-2xl";
  }
}

function winnerTextClass(team: string | null) {
  switch (team) {
    case "Red":
      return "text-[#F87171]";
    case "Blue":
      return "text-[#60A5FA]";
    case "Green":
      return "text-[#34D399]";
    case "Gold":
      return "text-[#FACC15]";
    default:
      return "text-white";
  }
}

export function GameOverScreen() {
  const { room, player, isBusy, resetGame } = useGameRoom();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!room) {
      setIsDismissed(false);
      return;
    }

    setIsDismissed(false);
  }, [room?.roomId, room?.winner]);

  if (!room || !player) {
    return null;
  }

  if (isDismissed) {
    return null;
  }

  const breachedWord = room.board.find((card) => card.type === "Control" && card.isRevealed)?.text ?? "غير معروف";
  const winnerLabel = room.winner ? `فوز تكتيكي للفريق ${teamLabel(room.winner)}` : "انتهت المهمة";
  const isAssassinLoss = room.board.some((card) => card.type === "Control" && card.isRevealed);
  const standardWinMessage = room.winner ? `فريق ${teamLabel(room.winner)} يهيمن على اللوحة` : "تمت السيطرة على اللوحة";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0F172A]/72 p-4 backdrop-blur-md" dir="rtl">
      <div
        className={`flex w-full max-w-sm flex-col justify-between rounded-2xl border-2 bg-[#1E293B] p-6 text-[#F8FAFC] ${
          isAssassinLoss ? "border-[#DC2626] shadow-[0_0_20px_rgba(220,38,38,0.15)]" : winnerFrameClass(room.winner)
        }`}
      >
        {isAssassinLoss ? (
          <>
            <h1 className="text-center text-2xl font-black text-[#DC2626]">تم تفعيل المسمار القاتل</h1>
            <span className="mx-auto mt-2 block w-max rounded-full border border-[#DC2626]/20 bg-[#DC2626]/10 px-3 py-1 text-xs font-bold text-[#EF4444]">
              {winnerLabel}
            </span>

            <div className="my-6 rounded-xl border border-slate-800 bg-slate-950/80 p-6 text-center">
              <span className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-slate-500">
                الكلمة المحظورة المسببة للخرق
              </span>
              <div className="text-4xl font-black text-white drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">{breachedWord}</div>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-center text-2xl font-black tracking-wide text-white">اكتملت المهمة بنجاح</h1>
            <span className="mt-1 block text-center text-[10px] uppercase tracking-[0.28em] text-slate-400">
              [ تم فك تشفير وامتلاك كامل قاعدة البيانات ]
            </span>

            <div className="my-6 rounded-xl border border-slate-800 bg-slate-950/90 p-6 text-center">
              <div className={`text-center text-xl font-black ${winnerTextClass(room.winner)}`}>{standardWinMessage}</div>
            </div>
          </>
        )}

        <div className="mt-6 flex w-full gap-2">
          <button
            type="button"
            onClick={() => void resetGame()}
            disabled={isBusy || !player.isHost}
            className="flex-1 rounded-xl bg-[#2563EB] py-3.5 text-sm font-bold text-white transition-transform active:scale-95 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
          >
            {player.isHost ? "اللعب مجدداً" : "بانتظار المضيف"}
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="rounded-xl border border-slate-800 bg-[#0F172A] px-4 py-3.5 text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-50"
          >
            متابعة
          </button>
        </div>
      </div>
    </div>
  );
}
