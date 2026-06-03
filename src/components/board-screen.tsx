"use client";

import { GameBoard } from "./game-board";
import { GameplayHud } from "./gameplay-hud";
import { TacticalRosterDrawer } from "./tactical-roster-drawer";
import { useGameRoom } from "../context/game-room-context";
import { getActiveTeams, type ActiveTeam } from "../lib/teams";

export function BoardScreen() {
  const { room, player, isBusy, revealCard } = useGameRoom();

  if (!room || !player) {
    return null;
  }

  const showTruth = player.role === "Spymaster";
  const canReveal = player.role === "Operative" && player.team === room.currentTurn;
  const activeTeams = getActiveTeams(room.settings.teamCount);
  const remainingWords = activeTeams.reduce<Partial<Record<ActiveTeam, number>>>(
    (counts, team) => ({
      ...counts,
      [team]: room.board.filter((card) => card.type === team && !card.isRevealed).length,
    }),
    {},
  );

  return (
    <section className="relative flex h-full w-full flex-col overflow-hidden" dir="rtl">
      <GameplayHud
        key={`${room.currentTurn}-${room.settings.roundTimerSeconds}`}
        currentTurn={room.currentTurn}
        roundTimerSeconds={room.settings.roundTimerSeconds}
        remainingWords={remainingWords}
        activeTeams={activeTeams}
      />

      <div className="my-auto flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full max-w-2xl mx-auto">
          <GameBoard
            board={room.board}
            showTruth={showTruth}
            canReveal={canReveal && !isBusy}
            onReveal={(cardId: number) => revealCard(cardId)}
          />
        </div>
      </div>

      <TacticalRosterDrawer players={room.players} activeTeams={activeTeams} />
    </section>
  );
}
