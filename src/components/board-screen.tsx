"use client";

import { useEffect, useState } from "react";

import { GameBoard } from "./game-board";
import { RoomManagementPanel } from "./room-management-panel";
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
    </div>
  );
}

export function BoardScreen() {
  const { room, player, isBusy, chooseTeam, revealCard } = useGameRoom();
  const [clueDraft, setClueDraft] = useState("");
  const [clueCount, setClueCount] = useState("1");
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isClueBarVisible, setIsClueBarVisible] = useState(false);
  const [isClueInputFocused, setIsClueInputFocused] = useState(false);
  const [clueBarBottomOffset, setClueBarBottomOffset] = useState(12);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 150);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlHeight = document.documentElement.style.height;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const previousHeight = document.body.style.height;
    const previousTouchAction = document.body.style.touchAction;
    const scrollY = window.scrollY;

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.touchAction = "none";
    window.scrollTo(0, 0);

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.height = previousHtmlHeight;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      document.body.style.height = previousHeight;
      document.body.style.touchAction = previousTouchAction;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    setIsClueBarVisible(false);

    const timeoutId = window.setTimeout(() => {
      setIsClueBarVisible(true);
    }, 20);

    return () => window.clearTimeout(timeoutId);
  }, [room?.currentTurn]);

  useEffect(() => {
    if (!isClueInputFocused) {
      setClueBarBottomOffset(12);
      return;
    }

    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    const syncClueBarPosition = () => {
      const keyboardInset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setClueBarBottomOffset(12 + keyboardInset);
      window.scrollTo(0, 0);
    };

    syncClueBarPosition();
    viewport.addEventListener("resize", syncClueBarPosition);
    viewport.addEventListener("scroll", syncClueBarPosition);

    return () => {
      viewport.removeEventListener("resize", syncClueBarPosition);
      viewport.removeEventListener("scroll", syncClueBarPosition);
      setClueBarBottomOffset(12);
    };
  }, [isClueInputFocused]);

  if (!room || !player) {
    return null;
  }

  const showTruth = player.role === "Spymaster";
  const canReveal = player.role === "Operative" && player.team === room.currentTurn;
  const activeTeams = getActiveTeams(room.settings.teamCount);
  const currentTeam = room.currentTurn;
  const playerHasActiveTeam = isActiveTeam(player.team);
  const usesMultiRowTeamGrid = activeTeams.length > 2;
  const shouldUseExpandedDenseFont = isLargeFont && room.board.length >= 36 && activeTeams.length >= 3;
  const shouldShowClueBar = true;
  const teamSlots: Array<ActiveTeam | null> = activeTeams.length === 3 ? [...activeTeams, null] : activeTeams;
  const teamGridHeightClass = usesMultiRowTeamGrid ? "h-[25vh]" : "h-[22vh]";
  const boardSectionHeightClass = usesMultiRowTeamGrid ? "h-[58vh]" : "h-[61vh]";
  const tickerText = `الدور الآن: فريق ${teamLabel(currentTeam)} | أنت: ${player.role === "Spymaster" ? "قائد" : "محقق"} | المؤقت: ${room.settings.roundTimerSeconds}ث`;
  const boardWidthClass = room.board.length > 25 ? "max-w-[44rem]" : "max-w-md";
  const boardFontScale = shouldUseExpandedDenseFont ? "expanded" : isLargeFont ? "comfortable" : "compact";
  const roundDurationMs = room.settings.roundTimerSeconds * 1000;
  const remainingMs = room.turnEndsAt ? Math.max(0, room.turnEndsAt - nowMs) : 0;
  const timerProgress = roundDurationMs <= 0 ? 0 : Math.min(1, Math.max(0, remainingMs / roundDurationMs));

  const handleClueSend = () => {
    if (!clueDraft.trim()) {
      return;
    }

    setClueDraft("");
    setClueCount("1");
  };

  return (
    <section
      className={`fixed inset-0 z-10 flex w-full flex-col overflow-hidden pb-[84px] text-[#F8FAFC] ${boardScreenBackgroundClass(currentTeam)}`}
      dir="rtl"
      style={{ height: "100dvh" }}
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
              onJoinTeam={(nextTeam) => chooseTeam(nextTeam)}
            />
          ) : (
            <div key={`team-slot-${index}`} aria-hidden="true" className="border border-transparent opacity-0" />
          ),
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden bg-black/25">
        <div className="flex h-full w-full justify-end">
          <div
            className={`h-full transition-[width,background-color] duration-200 ${timerBarClass(timerProgress)}`}
            style={{ width: `${timerProgress * 100}%` }}
          />
        </div>
      </div>

      <div className="mx-2 mt-2 h-[4vh] min-h-[28px] rounded-full bg-black/20 px-3 text-xs text-slate-300">
        <div className="flex h-full min-w-0 items-center justify-center overflow-hidden">
          <p className="truncate">{tickerText}</p>
        </div>
      </div>

      <div className={`mt-1 flex min-h-0 items-start overflow-hidden px-1.5 sm:px-2 ${boardSectionHeightClass}`}>
        <div className={`mx-auto flex h-full w-full flex-col ${boardWidthClass} items-center justify-start overflow-visible`}>
          <div className="flex min-h-0 w-full items-start justify-center overflow-visible pb-1">
            <GameBoard
              board={room.board}
              showTruth={showTruth}
              canReveal={canReveal && !isBusy}
              onReveal={(cardId: number) => revealCard(cardId)}
              compact
              fontScale={boardFontScale}
            />
          </div>

          <div className="mt-2 flex w-full shrink-0 items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="h-7 rounded-full border border-white/25 bg-black/10 px-4 text-xs font-bold text-slate-200 transition active:scale-95"
            >
              إعدادات
            </button>
            <button
              type="button"
              onClick={() => setIsLargeFont((currentValue) => !currentValue)}
              aria-pressed={isLargeFont}
              className={`h-7 rounded-full border px-4 text-xs font-bold transition active:scale-95 ${
                isLargeFont
                  ? "border-white/55 bg-white/20 text-[#F8FAFC]"
                  : "border-white/25 bg-black/10 text-slate-200"
              }`}
            >
              خط
            </button>
          </div>

        </div>
      </div>

      {shouldShowClueBar ? (
        <div
          className={`fixed inset-x-3 bottom-3 z-20 transition-all duration-300 ease-out ${
            isClueBarVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
          }`}
          style={{ bottom: `${clueBarBottomOffset}px` }}
        >
          <div className="mx-auto w-full max-w-[44rem] overflow-hidden rounded-2xl border border-white/20 bg-black/25 shadow-lg backdrop-blur-sm">
            <div className="grid h-12 grid-cols-[40px_46px_minmax(0,1fr)] items-center">
              <button
                type="button"
                onClick={handleClueSend}
                disabled={!clueDraft.trim()}
                className="h-full bg-white/15 text-sm font-black text-[#F8FAFC] transition active:scale-95 disabled:opacity-40"
              >
                {">"}
              </button>
              <div className="h-full border-x border-white/15">
                <select
                  value={clueCount}
                  onChange={(event) => setClueCount(event.target.value)}
                  className="h-full w-full bg-transparent px-1 text-center text-xs font-bold text-[#F8FAFC] outline-none"
                >
                  {CLUE_COUNT_OPTIONS.map((value) => (
                    <option key={value} value={value} className="bg-[#0F172A] text-[#F8FAFC]">
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <input
                dir="rtl"
                value={clueDraft}
                onChange={(event) => setClueDraft(event.target.value)}
                onFocus={() => {
                  setIsClueInputFocused(true);
                  window.scrollTo(0, 0);
                }}
                onBlur={() => setIsClueInputFocused(false)}
                placeholder={`تلميح فريق ${teamLabel(currentTeam)}`}
                className="h-full min-w-0 bg-transparent px-4 text-sm font-bold text-[#F8FAFC] outline-none placeholder:text-[#F8FAFC]/45"
              />
            </div>
          </div>
        </div>
      ) : null}

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/88 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto min-h-full w-full max-w-6xl">
            <RoomManagementPanel mode="modal" onClose={() => setIsSettingsOpen(false)} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
