"use client";

import { GameBoard } from "./game-board";
import { useGameRoom } from "../context/game-room-context";
import { teamLabel } from "../lib/teams";

export function GameOverScreen() {
  const { room, player, isBusy, leaveRoom, resetGame } = useGameRoom();

  if (!room || !player) {
    return null;
  }

  const breachedWord = room.board.find((card) => card.type === "Control" && card.isRevealed)?.text ?? "غير معروف";
  const winnerLabel = room.winner ? `فوز تكتيكي للفريق ${teamLabel(room.winner)}` : "انتهت المهمة";

  return (
    <section className="flex h-screen overflow-hidden bg-[#0F172A]/90 p-4 backdrop-blur-md" dir="rtl">
      <div className="mx-auto flex w-full max-w-sm items-center justify-center">
        <div className="flex h-full max-h-[calc(100vh-2rem)] w-full flex-col justify-between overflow-hidden rounded-2xl border-2 border-[#DC2626] bg-[#1E293B] p-6 text-[#F8FAFC] shadow-[0_0_20px_rgba(220,38,38,0.15)]">
          <div>
            <h1 className="text-center text-2xl font-black text-[#DC2626]">تم تفعيل المسمار القاتل</h1>
            <span className="mx-auto mt-2 block w-max rounded-full border border-[#DC2626]/20 bg-[#DC2626]/10 px-3 py-1 text-xs font-bold text-[#EF4444]">
              {winnerLabel}
            </span>

            <div className="my-6 rounded-xl border border-slate-800 bg-slate-950/80 p-6 text-center">
              <span className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-slate-500">
                الكلمة المحظورة المسببة للخرق
              </span>
              <div className="text-4xl font-black text-white drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                {breachedWord}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/70 bg-[#0F172A]/50 p-2">
              <GameBoard board={room.board} showTruth={true} canReveal={false} revealAll compact />
            </div>
          </div>

          <div className="mt-4 flex w-full gap-2">
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
    </section>
  );
}
