"use client";

import { GameBoard } from "@/components/game-board";
import { useGameRoom } from "@/context/game-room-context";

function teamLabel(team: "Red" | "Blue") {
  return team === "Red" ? "الأحمر" : "الأزرق";
}

export function BoardScreen() {
  const { room, player, isBusy, leaveRoom, revealCard } = useGameRoom();

  if (!room || !player) {
    return null;
  }

  const showTruth = player.role === "Spymaster";
  const canReveal = player.role === "Operative" && player.team === room.currentTurn;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-2xl md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <p className="text-sm text-amber-300">Board</p>
          <h1 className="mt-2 text-3xl font-black">الدور الحالي: فريق {teamLabel(room.currentTurn)}</h1>
          <p className="mt-2 text-sm text-slate-200">
            أنت تلعب كـ {player.role === "Spymaster" ? "قائد" : "محقق"} ضمن فريق{" "}
            {player.team === "Unassigned" ? "غير محدد" : teamLabel(player.team)}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => leaveRoom()}
          disabled={isBusy}
          className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
        >
          مغادرة
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.28fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-lg md:p-6">
          <GameBoard
            board={room.board}
            showTruth={showTruth}
            canReveal={canReveal && !isBusy}
            onReveal={(cardId) => revealCard(cardId)}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2 className="text-lg font-black text-slate-950">الدليل اللوني</h2>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <div className="rounded-2xl bg-red-100 px-3 py-2">أحمر</div>
              <div className="rounded-2xl bg-blue-100 px-3 py-2">أزرق</div>
              <div className="rounded-2xl bg-stone-100 px-3 py-2">محايد</div>
              <div className="rounded-2xl bg-slate-900 px-3 py-2 text-white">تحكم</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
