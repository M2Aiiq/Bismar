"use client";

import { useState } from "react";

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
  const [fontScale, setFontScale] = useState<"compact" | "comfortable">("compact");
  const [showRosterTicker, setShowRosterTicker] = useState(false);

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
  const boardSectionHeightClass = usesMultiRowTeamGrid ? "h-[65vh]" : "h-[68vh]";
  const tickerText = showRosterTicker
    ? `اللاعبون: ${room.players.map((entry) => entry.name).join(" . ")}`
    : `الدور الآن: فريق ${teamLabel(currentTeam)} | أنت: ${player.role === "Spymaster" ? "قائد" : "محقق"} | المؤقت: ${room.settings.roundTimerSeconds}ث`;
  const boardWidthClass = room.board.length > 25 ? "max-w-lg" : "max-w-md";

  const handleClueSend = () => {
    if (!clueDraft.trim()) {
      return;
    }

    setClueDraft("");
    setClueCount("1");
  };

  return (
    <section className="flex h-full w-full max-h-screen flex-col justify-between overflow-hidden bg-[#0F172A] text-[#F8FAFC]" dir="rtl">
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

      <div className="mx-2 mt-2 h-[4vh] min-h-[28px] rounded-full bg-black/20 px-3 text-xs text-slate-300">
        <div className="flex h-full items-center justify-center overflow-hidden">
          <p className="truncate">{tickerText}</p>
        </div>
      </div>

      <div className={`my-auto flex min-h-0 items-center overflow-hidden px-2 ${boardSectionHeightClass}`}>
        <div className={`mx-auto flex h-full w-full ${boardWidthClass} items-center justify-center overflow-hidden`}>
          <GameBoard
            board={room.board}
            showTruth={showTruth}
            canReveal={canReveal && !isBusy}
            onReveal={(cardId: number) => revealCard(cardId)}
            compact
            fontScale={fontScale}
          />
        </div>
      </div>

      <div className="mt-auto flex h-[6vh] min-h-[40px] items-center justify-between gap-1 border-t border-slate-900/50 px-2">
        <button
          type="button"
          onClick={() => setShowRosterTicker((current) => !current)}
          className="flex h-8 min-w-0 flex-1 items-center justify-center rounded-full border border-white/10 bg-[#1E293B] px-2 text-[10px] font-bold text-[#F8FAFC]/80"
        >
          ضبط
        </button>
        <button
          type="button"
          onClick={() => setFontScale((current) => (current === "compact" ? "comfortable" : "compact"))}
          className="flex h-8 min-w-0 flex-1 items-center justify-center rounded-full border border-[#2563EB]/30 bg-[#2563EB]/12 px-2 text-[10px] font-bold text-[#F8FAFC]"
        >
          حجم
        </button>
        <button
          type="button"
          onClick={() => setShowRosterTicker((current) => !current)}
          className="flex h-8 min-w-0 flex-1 items-center justify-center rounded-full border border-white/10 bg-[#1E293B] px-2 text-[10px] font-bold text-[#F8FAFC]/80"
        >
          لاعبين
        </button>
        <button
          type="button"
          onClick={() => setClueDraft("")}
          className="flex h-8 min-w-0 flex-1 items-center justify-center rounded-full border border-[#DC2626]/30 bg-[#DC2626]/12 px-2 text-[10px] font-bold text-[#F8FAFC]"
        >
          بلاغ
        </button>
        <button
          type="button"
          onClick={() => setClueCount("1")}
          className="flex h-8 min-w-0 flex-1 items-center justify-center rounded-full border border-white/10 bg-[#1E293B] px-2 text-[10px] font-bold text-[#F8FAFC]/80"
        >
          Discord
        </button>
      </div>
    </section>
  );
}
