"use client";

import { GameBoard } from "@/components/game-board";
import { useGameRoom } from "@/context/game-room-context";

export function GameOverScreen() {
  const { room, player, isBusy, leaveRoom, resetGame } = useGameRoom();

  if (!room || !player) {
    return null;
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-2xl md:p-8">
        <p className="text-sm text-amber-300">Game Over</p>
        <h1 className="mt-2 text-4xl font-black">
          الفائز: فريق {room.winner === "Red" ? "الأحمر" : "الأزرق"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
          تم كشف اللوحة كاملة. يمكن للمضيف إعادة الجولة مع الإبقاء على اللاعبين داخل نفس الغرفة.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => resetGame()}
            disabled={isBusy || !player.isHost}
            className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-200"
          >
            {player.isHost ? "إعادة اللعب" : "بانتظار المضيف"}
          </button>

          <button
            type="button"
            onClick={() => leaveRoom()}
            disabled={isBusy}
            className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            مغادرة
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:p-6">
        <GameBoard board={room.board} showTruth={true} canReveal={false} revealAll />
      </div>
    </section>
  );
}
