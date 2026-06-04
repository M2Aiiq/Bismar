"use client";

import { useEffect, useRef, useState } from "react";

import { GameBoard } from "./game-board";
import { RoomManagementPanel } from "./room-management-panel";
import { useGameRoom } from "../context/game-room-context";
import { countHiddenCards } from "../lib/game";
import { getActiveTeams, isActiveTeam, teamLabel, type ActiveTeam } from "../lib/teams";
import type { Clue, Player } from "../types/game";

const CLUE_COUNT_OPTIONS = Array.from({ length: 9 }, (_, index) => String(index + 1));

interface TeamPanelProps {
  team: ActiveTeam;
  players: Player[];
  currentPlayer: Player;
  remainingCards: number;
  isCurrentTurn: boolean;
  isBusy: boolean;
  onJoinAsOperative: (team: ActiveTeam) => void;
  onJoinAsSpymaster: (team: ActiveTeam) => void;
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

function clueChipClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "border-[#FCA5A5]/35 bg-[#7F1D1D]/65";
    case "Blue":
      return "border-[#93C5FD]/35 bg-[#1E3A8A]/65";
    case "Green":
      return "border-[#86EFAC]/35 bg-[#064E3B]/65";
    case "Gold":
      return "border-[#FDE68A]/35 bg-[#854D0E]/65 text-[#FEF3C7]";
  }
}

function clueModalFrameClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "border-[#DC2626] shadow-[0_0_0_1px_rgba(220,38,38,0.3),0_0_32px_rgba(220,38,38,0.28)]";
    case "Blue":
      return "border-[#2563EB] shadow-[0_0_0_1px_rgba(37,99,235,0.3),0_0_32px_rgba(37,99,235,0.28)]";
    case "Green":
      return "border-[#059669] shadow-[0_0_0_1px_rgba(5,150,105,0.3),0_0_32px_rgba(5,150,105,0.28)]";
    case "Gold":
      return "border-[#EAB308] shadow-[0_0_0_1px_rgba(234,179,8,0.32),0_0_32px_rgba(234,179,8,0.24)]";
  }
}

function clueModalBadgeClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "bg-[#DC2626]";
    case "Blue":
      return "bg-[#2563EB]";
    case "Green":
      return "bg-[#059669]";
    case "Gold":
      return "bg-[#EAB308] text-[#0F172A]";
  }
}

interface ClueNotificationModalProps {
  clue: Clue;
}

function ClueNotificationModal({ clue }: ClueNotificationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md" dir="rtl">
      <div
        className={`w-full max-w-sm rounded-2xl border bg-[#1E293B] p-5 text-[#F8FAFC] ${clueModalFrameClass(clue.team)}`}
      >
        <span className="mb-4 block w-full text-center text-[10px] uppercase tracking-[0.32em] text-slate-500">
          [ إشارة مشفرة قادمة ]
        </span>
        <div className="text-center text-4xl font-black tracking-wide text-white drop-shadow-md">{clue.text}</div>
        <span className="mb-1 mt-5 block text-center text-xs text-slate-400">عدد المحاولات المصرحة</span>
        <div className="relative mx-auto mt-1 flex h-14 w-14 items-center justify-center">
          <div className={`absolute inset-0 rounded-full opacity-40 blur-md ${clueModalBadgeClass(clue.team)}`} />
          <div
            className={`relative flex h-10 w-10 items-center justify-center rounded-full font-mono text-lg font-black text-white shadow-md ${clueModalBadgeClass(clue.team)}`}
          >
            {clue.count}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamPanel({
  team,
  players,
  currentPlayer,
  remainingCards,
  isCurrentTurn,
  isBusy,
  onJoinAsOperative,
  onJoinAsSpymaster,
}: TeamPanelProps) {
  const orderedPlayers = [...players].sort((left, right) => {
    if (left.role === right.role) {
      return left.name.localeCompare(right.name, "ar");
    }

    return left.role === "Spymaster" ? -1 : 1;
  });
  const spymaster = orderedPlayers.find((currentPlayer) => currentPlayer.role === "Spymaster") ?? null;
  const operatives = orderedPlayers.filter((currentPlayer) => currentPlayer.role === "Operative");
  const canShowJoinAsOperative = currentPlayer.role !== "Operative" || currentPlayer.team !== team;
  const canShowJoinAsSpymaster = currentPlayer.role !== "Spymaster" || currentPlayer.team !== team;

  return (
    <div
      className={`relative flex min-h-0 flex-col justify-start overflow-hidden border px-2 pb-2 pt-1 text-[#F8FAFC] ${teamPanelClass(team, isCurrentTurn)}`}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="select-none text-[5.5rem] font-black leading-none text-white/16">
          {remainingCards}
        </span>
      </div>

      <div className="relative z-10 flex w-full flex-col items-end text-right">
        <div className="-mx-2 -mt-1 w-[calc(100%+1rem)] bg-black/20 px-2 pb-2 pt-1 text-right">
          {!spymaster && canShowJoinAsSpymaster ? (
            <div className="flex items-start justify-start">
              <button
                type="button"
                onClick={() => onJoinAsSpymaster(team)}
                disabled={isBusy}
                className="shrink-0 rounded-full border border-white/20 bg-white/15 px-1.5 py-px text-[9px] font-bold text-[#F8FAFC] transition active:scale-95 disabled:opacity-60"
              >
                كن القائد
              </button>
            </div>
          ) : null}
          {spymaster ? (
            <div className="mt-2 overflow-hidden text-right text-[13px] font-black text-[#F8FAFC]">{spymaster.name}</div>
          ) : null}
        </div>
        <div className="h-px w-full bg-white/40" />
        <div className="mt-1 flex w-full flex-col items-start gap-1 overflow-hidden text-left text-xs font-bold text-[#F8FAFC]/95">
          {canShowJoinAsOperative ? (
            <button
              type="button"
              onClick={() => onJoinAsOperative(team)}
              disabled={isBusy}
              className="mb-1 self-start rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold text-[#F8FAFC] transition active:scale-95 disabled:opacity-60"
            >
              انضم للفريق
            </button>
          ) : null}
          {operatives.map((currentPlayer) => (
            <span key={currentPlayer.id} className="max-w-full self-start text-left">
              {currentPlayer.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BoardScreen() {
  const { room, player, isBusy, joinTeamAs, sendClue, expireTurnTimer, revealCard } = useGameRoom();
  const [clueDraft, setClueDraft] = useState("");
  const [clueCount, setClueCount] = useState("1");
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isClueBarVisible, setIsClueBarVisible] = useState(false);
  const [incomingClue, setIncomingClue] = useState<Clue | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const handledExpiredTurnRef = useRef<string | null>(null);
  const latestClueRef = useRef<HTMLDivElement | null>(null);
  const latestSeenClueKeyRef = useRef<string | null>(null);
  const visibleClues = room?.clues ?? [];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 150);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const previousTouchAction = document.body.style.touchAction;
    const scrollY = window.scrollY;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";
    window.scrollTo(0, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      document.body.style.touchAction = previousTouchAction;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "auto";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    if (room?.gameState === "Lobby" && player?.isHost) {
      setIsSettingsOpen(true);
    }
  }, [player?.isHost, room?.gameState]);

  useEffect(() => {
    setIsClueBarVisible(false);

    const timeoutId = window.setTimeout(() => {
      setIsClueBarVisible(true);
    }, 20);

    return () => window.clearTimeout(timeoutId);
  }, [room?.currentTurn, room?.turnPhase]);

  useEffect(() => {
    if (!room) {
      latestSeenClueKeyRef.current = null;
      setIncomingClue(null);
      return;
    }

    const latestClue = room.clues[0] ?? null;

    if (!latestClue) {
      latestSeenClueKeyRef.current = null;
      return;
    }

    const latestClueKey = `${latestClue.team}-${latestClue.createdAt}`;

    if (latestSeenClueKeyRef.current === null) {
      latestSeenClueKeyRef.current = latestClueKey;
      return;
    }

    if (latestSeenClueKeyRef.current === latestClueKey) {
      return;
    }

    latestSeenClueKeyRef.current = latestClueKey;
    setIncomingClue(latestClue);
  }, [room]);

  useEffect(() => {
    if (!incomingClue) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIncomingClue(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [incomingClue]);

  useEffect(() => {
    if (!isClueBarVisible || visibleClues.length === 0) {
      return;
    }

    const animationId = window.requestAnimationFrame(() => {
      latestClueRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(animationId);
  }, [isClueBarVisible, visibleClues.length]);

  if (!room || !player) {
    return null;
  }

  const showTruth = player.role === "Spymaster";
  const canReveal = player.role === "Operative" && player.team === room.currentTurn && room.turnPhase === "Guess";
  const activeTeams = getActiveTeams(room.settings.teamCount);
  const currentTeam = room.currentTurn;
  const usesMultiRowTeamGrid = activeTeams.length > 2;
  const shouldUseExpandedDenseFont = isLargeFont && room.board.length >= 36 && activeTeams.length >= 3;
  const shouldShowClueInput =
    player.role === "Spymaster" && player.team === room.currentTurn && room.turnPhase === "Clue";
  const shouldShowClueStrip = visibleClues.length > 0;
  const teamSlots: Array<ActiveTeam | null> = activeTeams.length === 3 ? [...activeTeams, null] : activeTeams;
  const teamGridHeightClass = usesMultiRowTeamGrid ? "h-[25vh]" : "h-[22vh]";
  const boardSectionHeightClass = usesMultiRowTeamGrid ? "h-[62vh]" : "h-[65vh]";
  const boardWidthClass = room.board.length > 25 ? "max-w-[44rem]" : "max-w-md";
  const boardFontScale = shouldUseExpandedDenseFont ? "expanded" : isLargeFont ? "comfortable" : "compact";
  const roundDurationMs = room.settings.roundTimerSeconds * 1000;
  const remainingMs = room.turnEndsAt ? Math.max(0, room.turnEndsAt - nowMs) : 0;
  const timerProgress = roundDurationMs <= 0 ? 0 : Math.min(1, Math.max(0, remainingMs / roundDurationMs));

  useEffect(() => {
    if (room.gameState !== "Playing" || !room.turnEndsAt) {
      handledExpiredTurnRef.current = null;
      return;
    }

    const expiryKey = `${room.currentTurn}-${room.turnPhase}-${room.turnEndsAt}`;

    if (remainingMs > 0) {
      handledExpiredTurnRef.current = null;
      return;
    }

    if (handledExpiredTurnRef.current === expiryKey) {
      return;
    }

    handledExpiredTurnRef.current = expiryKey;
    void expireTurnTimer();
  }, [expireTurnTimer, remainingMs, room.currentTurn, room.gameState, room.turnEndsAt, room.turnPhase]);

  const handleClueSend = () => {
    if (!clueDraft.trim()) {
      return;
    }

    void sendClue(clueDraft, Number(clueCount));
    setClueDraft("");
    setClueCount("1");
  };

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
              currentPlayer={player}
              remainingCards={countHiddenCards(room.board, team)}
              isCurrentTurn={team === currentTeam}
              isBusy={isBusy}
              onJoinAsOperative={(nextTeam) => joinTeamAs(nextTeam, "Operative")}
              onJoinAsSpymaster={(nextTeam) => joinTeamAs(nextTeam, "Spymaster")}
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

      {shouldShowClueStrip ? (
        <div className="mx-2 shrink-0">
          <div
            className={`mx-auto w-full max-w-[44rem] transition-all duration-300 ease-out ${
              isClueBarVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <div
              dir="rtl"
              className="overflow-x-auto overscroll-x-contain rounded-2xl px-0.5 py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex min-w-full justify-start gap-2">
                {[...visibleClues].reverse().map((clue, index, clues) => (
                  <div
                    key={`${clue.team}-${clue.createdAt}`}
                    ref={index === clues.length - 1 ? latestClueRef : null}
                    dir="rtl"
                    className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-1 text-[#F8FAFC] shadow-lg backdrop-blur-sm ${clueChipClass(clue.team)}`}
                  >
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs font-black">{clue.count}</span>
                    <span className="text-sm font-black">{clue.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {shouldShowClueInput ? (
        <div className="mx-2 shrink-0">
          <div
            className={`mx-auto w-full max-w-[44rem] transition-all duration-300 ease-out ${
              isClueBarVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/25 shadow-lg backdrop-blur-sm">
              <div className="grid h-10 grid-cols-[38px_44px_minmax(0,1fr)] items-center">
                <button
                  type="button"
                  onClick={handleClueSend}
                  disabled={!clueDraft.trim()}
                  className="h-full bg-white/15 text-xs font-black text-[#F8FAFC] transition active:scale-95 disabled:opacity-40"
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
                  placeholder={`تلميح فريق ${teamLabel(currentTeam)}`}
                  className="h-full min-w-0 bg-transparent px-3 text-sm font-bold text-[#F8FAFC] outline-none placeholder:text-[#F8FAFC]/45"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
      {isSettingsOpen ? (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#0F172A]/88 backdrop-blur-sm">
          <div className="flex h-full w-full items-start justify-center px-4 py-4">
            <div className="max-h-full w-full max-w-6xl overflow-y-auto overscroll-contain touch-pan-y">
              <RoomManagementPanel
                mode="modal"
                onClose={room.gameState === "Lobby" ? undefined : () => setIsSettingsOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
      {incomingClue ? <ClueNotificationModal clue={incomingClue} /> : null}
    </section>
  );
}
