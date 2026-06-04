"use client";

import { useEffect, useMemo, useState } from "react";

import { GameBoard } from "./game-board";
import { useGameRoom } from "../context/game-room-context";
import { countHiddenCards } from "../lib/game";
import { getActiveTeams, isActiveTeam, teamLabel, type ActiveTeam } from "../lib/teams";
import type { Player } from "../types/game";

const CLUE_COUNT_OPTIONS = Array.from({ length: 9 }, (_, index) => String(index + 1));

interface TeamPanelProps {
  team: ActiveTeam;
  players: Player[];
  remainingCards: number;
  isCurrentTurn: boolean;
  isPlayerTeam: boolean;
  canJoinTeam: boolean;
  isBusy: boolean;
  clueDraft: string;
  clueCount: string;
  onClueDraftChange: (value: string) => void;
  onClueCountChange: (value: string) => void;
  onClueSend: () => void;
  onJoinTeam: (team: ActiveTeam) => void;
}

function teamPanelClass(team: ActiveTeam, isCurrentTurn: boolean) {
  const currentTurnAccent = isCurrentTurn ? "ring-2 ring-inset ring-white/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "";

  switch (team) {
    case "Red":
      return `border-[#DC2626] bg-[#DC2626] ${currentTurnAccent}`;
    case "Blue":
      return `border-[#2563EB] bg-[#2563EB] ${currentTurnAccent}`;
    case "Green":
      return `border-[#059669] bg-[#059669] ${currentTurnAccent}`;
    case "Gold":
      return `border-[#EAB308] bg-[#EAB308] text-[#0F172A] ${currentTurnAccent}`;
  }
}

function boardScreenBackgroundClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "bg-[linear-gradient(180deg,_#DC2626_0%,_#B91C1C_38%,_#7F1D1D_100%)]";
    case "Blue":
      return "bg-[linear-gradient(180deg,_#2563EB_0%,_#1D4ED8_38%,_#1E3A8A_100%)]";
    case "Green":
      return "bg-[linear-gradient(180deg,_#059669_0%,_#047857_38%,_#064E3B_100%)]";
    case "Gold":
      return "bg-[linear-gradient(180deg,_#EAB308_0%,_#CA8A04_38%,_#854D0E_100%)]";
  }
}

function timerBarClass(progress: number) {
  if (progress <= 0.2) {
    return "bg-[#DC2626]";
  }

  if (progress <= 0.45) {
    return "bg-[#F97316]";
  }

  return "bg-[#F8FAFC]";
}

function TeamPanel({
  team,
  remainingCards,
  isCurrentTurn,
  isPlayerTeam,
  canJoinTeam,
  isBusy,
  clueDraft,
  clueCount,
  onClueDraftChange,
  onClueCountChange,
  onClueSend,
  onJoinTeam,
}: TeamPanelProps) {
  return (
    <div
      className={`relative flex min-h-0 flex-col justify-between overflow-hidden border px-2 pb-2 pt-1 text-[#F8FAFC] ${teamPanelClass(team, isCurrentTurn)}`}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="select-none text-[5.5rem] font-black leading-none text-white/16">
          {remainingCards}
        </span>
      </div>

      <div className="relative z-10 flex items-start justify-end">
        {canJoinTeam ? (
          <button
            type="button"
            onClick={() => onJoinTeam(team)}
            disabled={isBusy}
            className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold text-[#F8FAFC] transition active:scale-95 disabled:opacity-60"
          >
            انضم للفريق
          </button>
        ) : isPlayerTeam ? (
          <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold">
            فريقك
          </span>
        ) : null}
      </div>

      <div className="flex flex-1" />

      {isCurrentTurn ? (
        <div className="relative z-10 mt-1 overflow-hidden rounded-xl border border-white/70 bg-white/10 backdrop-blur-sm">
          <div className="grid h-8 grid-cols-[minmax(0,1fr)_40px_38px] items-center">
            <input
              dir="rtl"
              value={clueDraft}
              onChange={(event) => onClueDraftChange(event.target.value)}
              placeholder="التلميح"
              className="h-full min-w-0 bg-transparent px-3 text-[10px] text-[#F8FAFC] outline-none placeholder:text-[#F8FAFC]/45"
            />
            <div className="h-full border-x border-white/25">
              <select
                value={clueCount}
                onChange={(event) => onClueCountChange(event.target.value)}
                className="h-full w-full bg-transparent px-1 text-center text-[10px] font-bold text-[#F8FAFC] outline-none"
              >
                {CLUE_COUNT_OPTIONS.map((value) => (
                  <option key={value} value={value} className="bg-[#0F172A] text-[#F8FAFC]">
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={onClueSend}
              disabled={!clueDraft.trim()}
              className="h-full bg-white/15 text-xs font-black text-[#F8FAFC] transition active:scale-95 disabled:opacity-40"
            >
              {">"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BoardScreen() {
  const { room, player, isBusy, chooseTeam, revealCard } = useGameRoom();
  const [clueDraft, setClueDraft] = useState("");
  const [clueCount, setClueCount] = useState("1");
  const [remainingMs, setRemainingMs] = useState(0);

  if (!room || !player) {
    return null;
  }

  const showTruth = player.role === "Spymaster";
  const canReveal = player.role === "Operative" && player.team === room.currentTurn;
  const activeTeams = getActiveTeams(room.settings.teamCount);
  const currentTeam = room.currentTurn;
  const playerHasActiveTeam = isActiveTeam(player.team);
  const usesMultiRowTeamGrid = activeTeams.length > 2;
  const teamSlots: Array<ActiveTeam | null> = activeTeams.length === 3 ? [...activeTeams, null] : activeTeams;
  const teamGridHeightClass = usesMultiRowTeamGrid ? "h-[25vh]" : "h-[22vh]";
  const boardSectionHeightClass = usesMultiRowTeamGrid ? "h-[69vh]" : "h-[72vh]";
  const tickerText = `الدور الآن: فريق ${teamLabel(currentTeam)} | أنت: ${player.role === "Spymaster" ? "قائد" : "محقق"} | المؤقت: ${room.settings.roundTimerSeconds}ث`;
  const boardWidthClass = room.board.length > 25 ? "max-w-lg" : "max-w-md";
  const roundDurationMs = room.settings.roundTimerSeconds * 1000;
  const timerProgress = useMemo(() => {
    if (roundDurationMs <= 0) {
      return 0;
    }

    return Math.min(1, Math.max(0, remainingMs / roundDurationMs));
  }, [remainingMs, roundDurationMs]);

  const handleClueSend = () => {
    if (!clueDraft.trim()) {
      return;
    }

    setClueDraft("");
    setClueCount("1");
  };

  useEffect(() => {
    const endAt = Date.now() + roundDurationMs;

    setRemainingMs(roundDurationMs);

    const intervalId = window.setInterval(() => {
      setRemainingMs(Math.max(0, endAt - Date.now()));
    }, 150);

    return () => window.clearInterval(intervalId);
  }, [currentTeam, roundDurationMs]);

  return (
    <section
      className={`flex h-full w-full max-h-screen flex-col overflow-hidden text-[#F8FAFC] ${boardScreenBackgroundClass(currentTeam)}`}
      dir="rtl"
    >
      <div className={`grid min-h-0 grid-cols-2 gap-0 ${teamGridHeightClass} ${usesMultiRowTeamGrid ? "grid-rows-2" : ""}`}>
        {teamSlots.map((team, index) =>
          team ? (
            <TeamPanel
              key={team}
              team={team}
              players={room.players.filter((entry) => entry.team === team)}
              remainingCards={countHiddenCards(room.board, team)}
              isCurrentTurn={team === currentTeam}
              isPlayerTeam={player.team === team}
              canJoinTeam={!playerHasActiveTeam}
              isBusy={isBusy}
              clueDraft={team === currentTeam ? clueDraft : ""}
              clueCount={team === currentTeam ? clueCount : "1"}
              onClueDraftChange={setClueDraft}
              onClueCountChange={setClueCount}
              onClueSend={handleClueSend}
              onJoinTeam={(nextTeam) => chooseTeam(nextTeam)}
            />
          ) : (
            <div key={`team-slot-${index}`} aria-hidden="true" className="border border-transparent opacity-0" />
          ),
        )}
      </div>

      <div className="h-2.5 w-full overflow-hidden bg-black/25">
        <div
          className={`h-full transition-[width,background-color] duration-200 ${timerBarClass(timerProgress)}`}
          style={{ width: `${timerProgress * 100}%` }}
        />
      </div>

      <div className="mx-2 mt-2 h-[4vh] min-h-[28px] rounded-full bg-black/20 px-3 text-xs text-slate-300">
        <div className="flex h-full items-center justify-center overflow-hidden">
          <p className="truncate">{tickerText}</p>
        </div>
      </div>

      <div className={`mt-1 flex min-h-0 items-start overflow-hidden px-2 ${boardSectionHeightClass}`}>
        <div className={`mx-auto flex h-full w-full ${boardWidthClass} items-start justify-center overflow-hidden`}>
          <GameBoard
            board={room.board}
            showTruth={showTruth}
            canReveal={canReveal && !isBusy}
            onReveal={(cardId: number) => revealCard(cardId)}
            compact
            fontScale="compact"
          />
        </div>
      </div>
    </section>
  );
}
