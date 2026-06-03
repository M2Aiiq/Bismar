"use client";

import { GameBoard } from "./game-board";
import { useGameRoom } from "../context/game-room-context";
import { getActiveTeams, teamCardClass, teamLabel } from "../lib/teams";

export function BoardScreen() {
  const { room, player, isBusy, revealCard } = useGameRoom();

  if (!room || !player) {
    return null;
  }

  const showTruth = player.role === "Spymaster";
  const canReveal = player.role === "Operative" && player.team === room.currentTurn;
  const activeTeams = getActiveTeams(room.settings.teamCount);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.28fr]">
        <div className="rounded-3xl border border-white/10 bg-[#1E293B] p-4 shadow-lg md:p-6">
          <GameBoard
            board={room.board}
            showTruth={showTruth}
            canReveal={canReveal && !isBusy}
            onReveal={(cardId: number) => revealCard(cardId)}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl border border-white/10 bg-[#1E293B] p-5 shadow-lg">
            <h2 className="text-lg font-black text-[#F8FAFC]">الدليل اللوني</h2>
            <div className="mt-3 grid gap-2 text-sm text-[#F8FAFC]">
              {activeTeams.map((team) => (
                <div key={team} className={`rounded-2xl px-3 py-2 ${teamCardClass(team)}`}>
                  {teamLabel(team)}
                </div>
              ))}
              <div className="rounded-2xl bg-[#334155] px-3 py-2">محايد</div>
              <div className="rounded-2xl bg-[#0F172A] px-3 py-2">خسارة</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
