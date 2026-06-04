"use client";

import { useGameRoom } from "../context/game-room-context";
import { teamLabel } from "../lib/teams";

export function GameOverScreen() {
  const { room, player, isBusy, leaveRoom, resetGame } = useGameRoom();

  if (!room || !player) {
    return null;
  }

  const winnerLabel = room.winner ? `فوز تكتيكي للفريق ${teamLabel(room.winner)}` : "انتهت المهمة";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0F172A]/72 p-4 backdrop-blur-md" dir="rtl">
      <div className="w-full max-w-sm rounded-2xl border-2 border-[#DC2626] bg-[#1E293B] p-6 text-[#F8FAFC] shadow-[0_0_20px_rgba(220,38,38,0.15)]">
        <h1 className="text-center text-2xl font-black text-[#DC2626]">تم تفعيل المسمار القاتل</h1>
        <span className="mx-auto mt-2 block w-max rounded-full border border-[#DC2626]/20 bg-[#DC2626]/10 px-3 py-1 text-xs font-bold text-[#EF4444]">
          {winnerLabel}
        </span>

        <div className="mt-6 flex w-full gap-2">
          <button
            type="button"
            onClick={() => void resetGame()}
            disabled={isBusy || !player.isHost}
            className="flex-1 rounded-xl bg-[#2563EB] py-3.5 text-sm font-bold text-white transition-transform active:scale-95 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
          >
            {player.isHost ? "بدء عملية جديدة" : "بانتظار المضيف"}
          </button>
          <button
            type="button"
            onClick={() => void leaveRoom()}
            disabled={isBusy}
            className="rounded-xl border border-slate-800 bg-[#0F172A] px-4 py-3.5 text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-50"
          >
            تحليل اللوحة
          </button>
        </div>
      </div>
    </div>
  );
}
