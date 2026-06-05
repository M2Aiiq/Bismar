"use client";

import { useEffect, useRef, useState } from "react";

import { GameBoard } from "./game-board";
import { GameOverScreen } from "./game-over-screen";
import { RoomManagementPanel } from "./room-management-panel";
import { useGameRoom } from "../context/game-room-context";
import { countHiddenCards } from "../lib/game";
import { getActiveTeams, isActiveTeam, teamLabel, type ActiveTeam } from "../lib/teams";
import type { Clue, Player, TurnPhase } from "../types/game";

const CLUE_COUNT_OPTIONS = Array.from({ length: 9 }, (_, index) => String(index + 1));

interface TeamPanelProps {
  team: ActiveTeam;
  players: Player[];
  presence: Record<string, boolean>;
  currentPlayer: Player;
  remainingCards: number;
  isCurrentTurn: boolean;
  isEliminated: boolean;
  isBusy: boolean;
  onJoinAsOperative: (team: ActiveTeam) => void;
  onJoinAsSpymaster: (team: ActiveTeam) => void;
  onKickPlayer: (playerId: string) => void;
}

function presenceDotClass(isOnline: boolean) {
  return isOnline
    ? "bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.92),0_0_12px_rgba(34,197,94,0.42)]"
    : "bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.85),0_0_12px_rgba(239,68,68,0.34)]";
}

function teamPanelClass(team: ActiveTeam, isCurrentTurn: boolean, isEliminated: boolean) {
  const currentTurnAccent =
    isCurrentTurn && !isEliminated ? "ring-2 ring-inset ring-white/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "";
  const eliminatedAccent = isEliminated ? "opacity-65 saturate-50" : "";

  switch (team) {
    case "Red":
      return `border-[#DC2626] bg-[#DC2626] ${currentTurnAccent} ${eliminatedAccent}`;
    case "Blue":
      return `border-[#2563EB] bg-[#2563EB] ${currentTurnAccent} ${eliminatedAccent}`;
    case "Green":
      return `border-[#059669] bg-[#059669] ${currentTurnAccent} ${eliminatedAccent}`;
    case "Gold":
      return `border-[#EAB308] bg-[#EAB308] text-[#0F172A] ${currentTurnAccent} ${eliminatedAccent}`;
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

function turnBannerFrameClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "border-[#DC2626] shadow-[0_0_15px_rgba(220,38,38,0.2)]";
    case "Blue":
      return "border-[#2563EB] shadow-[0_0_15px_rgba(37,99,235,0.2)]";
    case "Green":
      return "border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.2)]";
    case "Gold":
      return "border-[#EAB308] shadow-[0_0_15px_rgba(234,179,8,0.2)]";
  }
}

function turnBannerTeamTextClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "text-[#FCA5A5]";
    case "Blue":
      return "text-[#93C5FD]";
    case "Green":
      return "text-[#6EE7B7]";
    case "Gold":
      return "text-[#FDE68A]";
  }
}

function turnBannerPhaseLabel(team: ActiveTeam, phase: TurnPhase) {
  if (phase === "Guess") {
    return `مرحلة تخمين الفريق ${teamLabel(team)}`;
  }

  return `دور قائد الفريق ${teamLabel(team)}`;
}

interface TurnTransitionBannerProps {
  team: ActiveTeam;
  phase: TurnPhase;
  isVisible: boolean;
}

function TurnTransitionBanner({ team, phase, isVisible }: TurnTransitionBannerProps) {
  return (
    <div
      className={`pointer-events-none fixed left-0 right-0 top-1/4 z-50 w-full border-y bg-[#1E293B]/90 py-4 backdrop-blur-md transition-all duration-500 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
      } ${turnBannerFrameClass(team)}`}
      dir="rtl"
    >
      <div className="flex flex-col items-center justify-center px-4 text-center">
        <span className="mb-1 text-[10px] uppercase tracking-[0.28em] text-slate-400">[ خلص وقتك]</span>
        <div className="text-xl font-black text-white md:text-2xl">انتقال الدور</div>
        <div
          className={`mt-2 rounded-full border border-current/20 bg-[#0F172A]/70 px-4 py-1 text-sm font-black ${turnBannerTeamTextClass(team)}`}
        >
          {turnBannerPhaseLabel(team, phase)}
        </div>
      </div>
    </div>
  );
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

interface ToastNoticeProps {
  message: string;
}

function ToastNotice({ message }: ToastNoticeProps) {
  return (
    <div className="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 px-4" dir="rtl">
      <div className="rounded-2xl border border-white/15 bg-[#0F172A]/92 px-4 py-2.5 text-sm font-black text-[#F8FAFC] shadow-[0_0_18px_rgba(15,23,42,0.34)] backdrop-blur-md">
        {message}
      </div>
    </div>
  );
}

function TeamPanel({
  team,
  players,
  presence,
  currentPlayer,
  remainingCards,
  isCurrentTurn,
  isEliminated,
  isBusy,
  onJoinAsOperative,
  onJoinAsSpymaster,
  onKickPlayer,
}: TeamPanelProps) {
  const orderedPlayers = [...players].sort((left, right) => {
    if (left.role === right.role) {
      return left.name.localeCompare(right.name, "ar");
    }

    return left.role === "Spymaster" ? -1 : 1;
  });
  const spymaster = orderedPlayers.find((currentPlayer) => currentPlayer.role === "Spymaster") ?? null;
  const operatives = orderedPlayers.filter((currentPlayer) => currentPlayer.role === "Operative");
  const canShowJoinAsOperative = !isEliminated && (currentPlayer.role !== "Operative" || currentPlayer.team !== team);
  const canShowJoinAsSpymaster = !isEliminated && (currentPlayer.role !== "Spymaster" || currentPlayer.team !== team);
  const canKickPlayer = (playerToKick: Player) => currentPlayer.isHost && !playerToKick.isHost && playerToKick.id !== currentPlayer.id;
  const isPlayerOnline = (targetPlayer: Player) => presence[targetPlayer.id] === true;

  return (
    <div
      className={`relative flex min-h-0 flex-col justify-start overflow-hidden border px-2 pb-2 pt-1 text-[#F8FAFC] ${teamPanelClass(team, isCurrentTurn, isEliminated)}`}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {isEliminated ? (
          <img src="/dead.png" alt="" className="h-20 w-20 select-none object-contain opacity-85" />
        ) : (
          <span className="select-none text-[5.5rem] font-black leading-none text-white/16">{remainingCards}</span>
        )}
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
            <div className="mt-2 flex w-full items-center justify-end gap-2 overflow-visible text-right">
              <div className="flex min-w-0 flex-1 flex-row-reverse items-center justify-end gap-1.5 overflow-visible text-right text-[13px] font-black text-[#F8FAFC]">
                <span
                  aria-hidden="true"
                  className={`mb-px h-1.5 w-1.5 shrink-0 rounded-full ${presenceDotClass(isPlayerOnline(spymaster))}`}
                />
                <span className="truncate text-right">{spymaster.name}</span>
              </div>
              {canKickPlayer(spymaster) ? (
                <button
                  type="button"
                  onClick={() => onKickPlayer(spymaster.id)}
                  disabled={isBusy}
                  aria-label={`طرد ${spymaster.name}`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/20 text-[11px] font-black text-[#F8FAFC] transition active:scale-95 disabled:opacity-60"
                >
                  x
                </button>
              ) : null}
            </div>
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
            <div key={currentPlayer.id} className="flex w-full items-center justify-end gap-2 self-start overflow-visible text-right">
              <div className="flex min-w-0 flex-1 flex-row-reverse items-center justify-end gap-1.5 overflow-visible text-right">
                <span
                  aria-hidden="true"
                  className={`mb-px h-1.5 w-1.5 shrink-0 rounded-full ${presenceDotClass(isPlayerOnline(currentPlayer))}`}
                />
                <span className="truncate text-right">{currentPlayer.name}</span>
              </div>
              {canKickPlayer(currentPlayer) ? (
                <button
                  type="button"
                  onClick={() => onKickPlayer(currentPlayer.id)}
                  disabled={isBusy}
                  aria-label={`طرد ${currentPlayer.name}`}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/20 text-[11px] font-black text-[#F8FAFC] transition active:scale-95 disabled:opacity-60"
                >
                  x
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BoardScreen() {
  const {
    room,
    player,
    isBusy,
    joinTeamAs,
    kickPlayer,
    sendClue,
    togglePauseGame,
    expireTurnTimer,
    endGuessTurn,
    revealCard,
    resolvePendingReveal,
    resetGame,
  } = useGameRoom();
  const [clueDraft, setClueDraft] = useState("");
  const [clueCount, setClueCount] = useState("1");
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isClueBarVisible, setIsClueBarVisible] = useState(false);
  const [incomingClue, setIncomingClue] = useState<Clue | null>(null);
  const [turnBannerState, setTurnBannerState] = useState<{ team: ActiveTeam; phase: TurnPhase } | null>(null);
  const [isTurnBannerVisible, setIsTurnBannerVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const handledExpiredTurnRef = useRef<string | null>(null);
  const latestClueRef = useRef<HTMLDivElement | null>(null);
  const latestSeenClueKeyRef = useRef<string | null>(null);
  const hasInitializedClueModalRef = useRef(false);
  const latestTurnBannerKeyRef = useRef<string | null>(null);
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
    if (!room || !player) {
      latestSeenClueKeyRef.current = null;
      hasInitializedClueModalRef.current = false;
      latestTurnBannerKeyRef.current = null;
      setIncomingClue(null);
      setTurnBannerState(null);
      setIsTurnBannerVisible(false);
      return;
    }

    const latestClue = room.clues[0] ?? null;
    const latestClueKey = latestClue ? `${latestClue.team}-${latestClue.createdAt}` : null;

    if (!hasInitializedClueModalRef.current) {
      hasInitializedClueModalRef.current = true;
      latestSeenClueKeyRef.current = latestClueKey;
      return;
    }

    if (!latestClue) {
      latestSeenClueKeyRef.current = null;
      return;
    }

    if (latestSeenClueKeyRef.current === null) {
      latestSeenClueKeyRef.current = latestClueKey;
      if (!(player.role === "Spymaster" && player.team === latestClue.team)) {
        setIncomingClue(latestClue);
      }
      return;
    }

    if (latestSeenClueKeyRef.current === latestClueKey) {
      return;
    }

    latestSeenClueKeyRef.current = latestClueKey;
    if (player.role === "Spymaster" && player.team === latestClue.team) {
      return;
    }

    setIncomingClue(latestClue);
  }, [player, room]);

  useEffect(() => {
    if (!room || room.gameState !== "Playing") {
      latestTurnBannerKeyRef.current = null;
      setTurnBannerState(null);
      setIsTurnBannerVisible(false);
      return;
    }

    const nextBannerKey = room.currentTurn;

    if (latestTurnBannerKeyRef.current === null) {
      latestTurnBannerKeyRef.current = nextBannerKey;
      return;
    }

    if (latestTurnBannerKeyRef.current === nextBannerKey) {
      return;
    }

    latestTurnBannerKeyRef.current = nextBannerKey;
    setTurnBannerState({ team: room.currentTurn, phase: "Clue" });
    setIsTurnBannerVisible(true);
  }, [room?.currentTurn, room?.gameState]);

  useEffect(() => {
    if (!turnBannerState) {
      return;
    }

    const fadeTimeoutId = window.setTimeout(() => {
      setIsTurnBannerVisible(false);
    }, 1100);
    const clearTimeoutId = window.setTimeout(() => {
      setTurnBannerState(null);
    }, 1500);

    return () => {
      window.clearTimeout(fadeTimeoutId);
      window.clearTimeout(clearTimeoutId);
    };
  }, [turnBannerState]);

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
    if (!toastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    if (
      !room ||
      room.gameState !== "Playing" ||
      room.turnPhase !== "Guess" ||
      room.isPaused ||
      room.pendingRevealCardId === null ||
      room.pendingRevealAt === null
    ) {
      return;
    }

    const waitMs = Math.max(0, room.pendingRevealAt - Date.now());
    const timeoutId = window.setTimeout(() => {
      void resolvePendingReveal();
    }, waitMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    resolvePendingReveal,
    room?.gameState,
    room?.isPaused,
    room?.pendingRevealAt,
    room?.pendingRevealCardId,
    room?.turnPhase,
  ]);

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

  const showTruth = player.role === "Spymaster" || room.gameState === "GameOver";
  const canReveal =
    room.gameState === "Playing" &&
    !room.isPaused &&
    player.role === "Operative" &&
    player.team === room.currentTurn &&
    room.turnPhase === "Guess";
  const canEndTurn =
    room.gameState === "Playing" &&
    !room.isPaused &&
    room.pendingRevealCardId === null &&
    player.role === "Operative" &&
    player.team === room.currentTurn &&
    room.turnPhase === "Guess";
  const canStartNewGame = room.gameState === "GameOver" && player.isHost;
  const canTogglePause = room.gameState === "Playing" && player.isHost;
  const activeTeams = getActiveTeams(room.settings.teamCount);
  const currentTeam = room.currentTurn;
  const isAssassinGameOver = room.gameState === "GameOver" && room.board.some((card) => card.type === "Control" && card.isRevealed);
  const displayedEliminatedTeams = isAssassinGameOver
    ? Array.from(new Set<ActiveTeam>([...room.eliminatedTeams, room.currentTurn]))
    : room.eliminatedTeams;
  const usesMultiRowTeamGrid = activeTeams.length > 2;
  const shouldUseExpandedDenseFont = isLargeFont && room.board.length >= 36 && activeTeams.length >= 3;
  const shouldShowClueInput =
    !room.isPaused && player.role === "Spymaster" && player.team === room.currentTurn && room.turnPhase === "Clue";
  const shouldShowClueStrip = visibleClues.length > 0;
  const teamSlots: Array<ActiveTeam | null> = activeTeams.length === 3 ? [...activeTeams, null] : activeTeams;
  const teamGridHeightClass = usesMultiRowTeamGrid ? "h-[25vh]" : "h-[22vh]";
  const boardSectionHeightClass = usesMultiRowTeamGrid ? "h-[62vh]" : "h-[65vh]";
  const boardWidthClass = room.board.length > 25 ? "max-w-[44rem]" : "max-w-md";
  const boardFontScale = shouldUseExpandedDenseFont ? "expanded" : isLargeFont ? "comfortable" : "compact";
  const voteCountsByCard = Object.values(room.operativeSelections).reduce<Record<number, number>>((result, cardId) => {
    result[cardId] = (result[cardId] ?? 0) + 1;
    return result;
  }, {});
  const roundDurationMs = room.settings.roundTimerSeconds * 1000;
  const remainingMs = room.isPaused
    ? Math.max(0, room.pausedRemainingMs ?? roundDurationMs)
    : room.turnEndsAt
      ? Math.max(0, room.turnEndsAt - nowMs)
      : 0;
  const timerProgress = roundDurationMs <= 0 ? 0 : Math.min(1, Math.max(0, remainingMs / roundDurationMs));

  useEffect(() => {
    if (room.gameState !== "Playing" || room.isPaused || room.pendingRevealCardId !== null || !room.turnEndsAt) {
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
  }, [
    expireTurnTimer,
    remainingMs,
    room.currentTurn,
    room.gameState,
    room.isPaused,
    room.pendingRevealCardId,
    room.turnEndsAt,
    room.turnPhase,
  ]);

  const handleClueSend = () => {
    if (!clueDraft.trim()) {
      return;
    }

    void sendClue(clueDraft, Number(clueCount));
    setClueDraft("");
    setClueCount("1");
  };

  const showToast = (message: string) => {
    setToastMessage(null);
    window.setTimeout(() => setToastMessage(message), 10);
  };

  const handleBlockedCardReveal = () => {
    if (room.gameState === "Playing" && !room.isPaused) {
      showToast("ليس دورك");
    }
  };

  const handlePauseToggle = () => {
    if (!player.isHost) {
      showToast("متاح للمضيف فقط");
      return;
    }

    if (isBusy || room.gameState !== "Playing") {
      return;
    }

    void togglePauseGame();
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
              presence={room.presence}
              currentPlayer={player}
              remainingCards={countHiddenCards(room.board, team)}
              isCurrentTurn={team === currentTeam}
              isEliminated={displayedEliminatedTeams.includes(team)}
              isBusy={isBusy}
              onJoinAsOperative={(nextTeam) => joinTeamAs(nextTeam, "Operative")}
              onJoinAsSpymaster={(nextTeam) => joinTeamAs(nextTeam, "Spymaster")}
              onKickPlayer={(targetPlayerId) => kickPlayer(targetPlayerId)}
            />
          ) : (
            <div key={`team-slot-${index}`} aria-hidden="true" className="border border-transparent opacity-0" />
          ),
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden bg-black/25">
        <div className="flex h-full w-full justify-end">
          <div
            className={`h-full transition-[width,background-color] duration-200 ${
              room.isPaused ? "bg-white/55" : timerBarClass(timerProgress)
            }`}
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

      {canEndTurn ? (
        <div className="mx-2 mt-1 shrink-0">
          <div className="mx-auto flex w-full max-w-[44rem] justify-center">
            <button
              type="button"
              onClick={() => void endGuessTurn()}
              disabled={isBusy}
              className="h-8 rounded-full border border-white/25 bg-black/20 px-5 text-xs font-black text-[#F8FAFC] transition active:scale-95 disabled:opacity-50"
            >
              إنهاء الدور
            </button>
          </div>
        </div>
      ) : null}

      <div className={`mt-1 flex min-h-0 items-start overflow-hidden px-1.5 sm:px-2 ${boardSectionHeightClass}`}>
        <div className={`mx-auto flex h-full w-full flex-col ${boardWidthClass} items-center justify-start overflow-visible`}>
          <div className="flex min-h-0 w-full items-start justify-center overflow-visible pt-2 pb-1">
            <GameBoard
              board={room.board}
              showTruth={showTruth}
              canReveal={canReveal && !isBusy}
              onReveal={(cardId: number) => revealCard(cardId)}
              onBlockedReveal={handleBlockedCardReveal}
              voteCountsByCard={voteCountsByCard}
              voteIndicatorTeam={currentTeam}
              pendingRevealCardId={room.pendingRevealCardId}
              revealAll={room.gameState === "GameOver"}
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

          {room.gameState === "Playing" ? (
            <div className="mt-2 flex w-full shrink-0 justify-start overflow-visible">
              <div className="-mr-2">
                <button
                  type="button"
                  onClick={handlePauseToggle}
                  disabled={isBusy}
                  aria-label={room.isPaused ? "تشغيل اللعبة" : "إيقاف اللعبة"}
                  className={`flex h-11 w-12 items-center justify-center rounded-l-[1.15rem] border border-r-0 backdrop-blur-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                    room.isPaused
                      ? "border-[#86EFAC]/45 bg-[#064E3B]/90 shadow-[0_0_14px_rgba(16,185,129,0.24)]"
                      : "border-white/20 bg-[#0F172A]/88 shadow-[0_0_14px_rgba(15,23,42,0.28)]"
                  }`}
                >
                  {room.isPaused ? (
                    <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 fill-[#ECFDF5]" aria-hidden="true">
                      <path d="M8 5.5v13l10-6.5L8 5.5Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 fill-[#F8FAFC]" aria-hidden="true">
                      <rect x="6" y="5" width="4" height="14" rx="1.2" />
                      <rect x="14" y="5" width="4" height="14" rx="1.2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {canStartNewGame ? (
            <div className="mt-3 flex w-full shrink-0 justify-center">
              <button
                type="button"
                onClick={() => void resetGame()}
                disabled={isBusy}
                className="animate-pulse rounded-full border border-[#60A5FA]/70 bg-[#2563EB]/18 px-4 py-2 text-sm font-black text-[#DBEAFE] shadow-[0_0_18px_rgba(37,99,235,0.35)] transition active:scale-95 disabled:opacity-50"
              >
                لعبة جديدة
              </button>
            </div>
          ) : null}

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
      {toastMessage ? <ToastNotice message={toastMessage} /> : null}
      {turnBannerState ? (
        <TurnTransitionBanner
          team={turnBannerState.team}
          phase={turnBannerState.phase}
          isVisible={isTurnBannerVisible}
        />
      ) : null}
      {room.gameState === "GameOver" ? <GameOverScreen /> : null}
    </section>
  );
}
