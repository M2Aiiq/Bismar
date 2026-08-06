"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { get, onDisconnect, onValue, ref, runTransaction, set } from "firebase/database";

import {
  countHiddenCards,
  createBoardState,
  createInitialRoom,
  createPlayer,
  createRoomId,
  normalizeRoom,
  shuffleList,
} from "../lib/game";
import { getRealtimeDatabase, isFirebaseConfigured } from "../lib/firebase";
import { getActiveTeams, isActiveTeam, nextTeam, type ActiveTeam } from "../lib/teams";
import type { Difficulty, Player, Role, Room, RoomSettings, Team, TeamCount, TurnPhase, WordCategory } from "../types/game";

type PlayerTeam = ActiveTeam;
// Temporary bypass requested by the user to preview the next screen before restoring team readiness rules.
const BYPASS_LOBBY_READY_CHECK = true;

function getNextTurnEndsAt(roundTimerSeconds: number) {
  return Date.now() + roundTimerSeconds * 1000;
}

function getNextCluePhaseState(currentRoom: Room, nextTurn: ActiveTeam, clues = currentRoom.clues) {
  return {
    clues,
    currentTurn: nextTurn,
    turnPhase: "Clue" as TurnPhase,
    operativeSelections: {},
    pendingRevealCardId: null,
    pendingRevealAt: null,
    isPaused: false,
    pausedRemainingMs: null,
    turnEndsAt: getNextTurnEndsAt(currentRoom.settings.roundTimerSeconds),
  };
}

function getPausedStartState(roundTimerSeconds: number) {
  return {
    isPaused: true,
    pausedRemainingMs: roundTimerSeconds * 1000,
    operativeSelections: {},
    pendingRevealCardId: null,
    pendingRevealAt: null,
    turnEndsAt: null,
  };
}

function getCurrentRemainingMs(currentRoom: Room) {
  if (currentRoom.isPaused) {
    return currentRoom.pausedRemainingMs ?? currentRoom.settings.roundTimerSeconds * 1000;
  }

  if (currentRoom.turnEndsAt) {
    return Math.max(0, currentRoom.turnEndsAt - Date.now());
  }

  return currentRoom.settings.roundTimerSeconds * 1000;
}

function getAliveTeams(currentRoom: Room) {
  const activeTeams = getActiveTeams(currentRoom.settings.teamCount);
  return activeTeams.filter((team) => !currentRoom.eliminatedTeams.includes(team));
}

function getNextAliveTurn(currentTurn: ActiveTeam, currentRoom: Room) {
  const aliveTeams = getAliveTeams(currentRoom);

  if (aliveTeams.length === 0) {
    return currentTurn;
  }

  return nextTeam(currentTurn, aliveTeams);
}

function getWinningTeam(currentRoom: Room, board: Room["board"]) {
  const aliveTeams = getAliveTeams(currentRoom);
  const clearedTeam = aliveTeams.find((team) => countHiddenCards(board, team) === 0);

  if (clearedTeam) {
    return clearedTeam;
  }

  return aliveTeams.length === 1 ? aliveTeams[0] : null;
}

const PENDING_REVEAL_DURATION_MS = 1000;

function getCurrentTurnOperatives(currentRoom: Room) {
  return currentRoom.players.filter(
    (player) => player.team === currentRoom.currentTurn && player.role === "Operative",
  );
}

function getConsensusSelectionCardId(
  currentTurnOperatives: Player[],
  operativeSelections: Room["operativeSelections"],
) {
  if (currentTurnOperatives.length === 0) {
    return null;
  }

  const firstCardId = operativeSelections[currentTurnOperatives[0].id];

  if (typeof firstCardId !== "number") {
    return null;
  }

  return currentTurnOperatives.every((operative) => operativeSelections[operative.id] === firstCardId)
    ? firstCardId
    : null;
}

function getClearedGuessSelectionState() {
  return {
    operativeSelections: {},
    pendingRevealCardId: null,
    pendingRevealAt: null,
  };
}

function resolveCardReveal(currentRoom: Room, cardId: number) {
  const nextBoard = currentRoom.board.map((card) => (card.id === cardId ? { ...card, isRevealed: true } : card));
  const selectedCard = nextBoard.find((card) => card.id === cardId);

  if (!selectedCard) {
    return {
      ...currentRoom,
      ...getClearedGuessSelectionState(),
    };
  }

  if (selectedCard.type === "Control") {
    const activeTeams = getActiveTeams(currentRoom.settings.teamCount);

    if (activeTeams.length <= 2) {
      return {
        ...currentRoom,
        board: nextBoard,
        winner: nextTeam(currentRoom.currentTurn, activeTeams),
        ...getClearedGuessSelectionState(),
        isPaused: false,
        pausedRemainingMs: null,
        turnPhase: "Clue",
        turnEndsAt: null,
        gameState: "GameOver",
      };
    }

    const nextEliminatedTeams = currentRoom.eliminatedTeams.includes(currentRoom.currentTurn)
      ? currentRoom.eliminatedTeams
      : [...currentRoom.eliminatedTeams, currentRoom.currentTurn];
    const aliveTeams = activeTeams.filter((team) => !nextEliminatedTeams.includes(team));

    if (aliveTeams.length <= 1) {
      return {
        ...currentRoom,
        board: nextBoard,
        eliminatedTeams: nextEliminatedTeams,
        winner: aliveTeams[0] ?? null,
        ...getClearedGuessSelectionState(),
        isPaused: false,
        pausedRemainingMs: null,
        turnPhase: "Clue",
        turnEndsAt: null,
        gameState: "GameOver",
      };
    }

    const nextTurn = nextTeam(currentRoom.currentTurn, aliveTeams);

    return {
      ...currentRoom,
      board: nextBoard,
      eliminatedTeams: nextEliminatedTeams,
      ...getNextCluePhaseState(currentRoom, nextTurn, currentRoom.clues),
    };
  }

  const winningTeam = getWinningTeam(currentRoom, nextBoard);

  if (winningTeam) {
    return {
      ...currentRoom,
      board: nextBoard,
      winner: winningTeam,
      ...getClearedGuessSelectionState(),
      isPaused: false,
      pausedRemainingMs: null,
      turnPhase: "Clue",
      turnEndsAt: null,
      gameState: "GameOver",
    };
  }

  const nextTurn: PlayerTeam =
    selectedCard.type === currentRoom.currentTurn ? currentRoom.currentTurn : getNextAliveTurn(currentRoom.currentTurn, currentRoom);

  if (nextTurn === currentRoom.currentTurn) {
    return {
      ...currentRoom,
      board: nextBoard,
      ...getClearedGuessSelectionState(),
      turnPhase: "Guess",
      turnEndsAt: currentRoom.turnEndsAt ?? getNextTurnEndsAt(currentRoom.settings.roundTimerSeconds),
    };
  }

  return {
    ...currentRoom,
    board: nextBoard,
    ...getNextCluePhaseState(currentRoom, nextTurn, currentRoom.clues),
  };
}

interface GameRoomContextValue {
  room: Room | null;
  player: Player | null;
  roomId: string;
  playerId: string;
  playerName: string;
  isReady: boolean;
  isBusy: boolean;
  error: string | null;
  firebaseReady: boolean;
  clearError: () => void;
  savePlayerName: (name: string) => Promise<void>;
  createRoom: (name: string) => Promise<string>;
  joinRoom: (roomCode: string, name: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  chooseTeam: (team: Team) => Promise<void>;
  chooseRole: (role: Role) => Promise<void>;
  joinTeamAs: (team: ActiveTeam, role: Role) => Promise<void>;
  kickPlayer: (targetPlayerId: string) => Promise<void>;
  updateRoomSettings: (settings: Partial<RoomSettings>) => Promise<void>;
  launchGameWithSettings: (settings: Partial<RoomSettings>) => Promise<void>;
  startGame: () => Promise<void>;
  sendClue: (text: string, count: number) => Promise<void>;
  togglePauseGame: () => Promise<void>;
  expireTurnTimer: () => Promise<void>;
  endGuessTurn: () => Promise<void>;
  revealCard: (cardId: number) => Promise<void>;
  resolvePendingReveal: () => Promise<void>;
  resetGame: () => Promise<void>;
  shuffleBoardWords: () => Promise<void>;
  shuffleTeams: () => Promise<void>;
  playerStats: { played: number; won: number; lost: number } | null;
  resetPlayerStats: () => void;
  leftRoomCode: string | null;
  clearLeftRoomCode: () => void;
}

interface SessionState {
  playerId: string;
  playerName: string;
  roomId?: string;
}

const SESSION_STORAGE_KEY = "iraqi-codenames-session";

const GameRoomContext = createContext<GameRoomContextValue | null>(null);

function getRoomPath(roomId: string) {
  return `rooms/${roomId}`;
}

function getPresencePath(roomId: string, playerId: string) {
  return `${getRoomPath(roomId)}/presence/${playerId}`;
}

function readSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writeSession(session: SessionState | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function saveSessionRoom(roomId: string | null, playerId: string, playerName: string) {
  writeSession({
    playerId,
    playerName,
    roomId: roomId || undefined,
  });
}

function buildMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function validatePlayerName(name: string) {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    throw new Error("اكتب اسماً لا يقل عن حرفين.");
  }

  return trimmed.slice(0, 24);
}

function upsertPlayer(players: Player[], nextPlayer: Player) {
  const remainingPlayers = players.filter((player) => player.id !== nextPlayer.id);
  return [...remainingPlayers, nextPlayer];
}

function ensurePlayableTeams(players: Player[], teamCount: TeamCount) {
  if (BYPASS_LOBBY_READY_CHECK) {
    return players.length > 0;
  }

  return getActiveTeams(teamCount).every((team) => {
    const teamPlayers = players.filter((player) => player.team === team);
    return (
      teamPlayers.some((player) => player.role === "Spymaster") &&
      teamPlayers.some((player) => player.role === "Operative")
    );
  });
}

function sanitizeTeamCount(value: unknown): TeamCount {
  return value === 3 || value === 4 ? value : 2;
}

function sanitizeRoundTimerSeconds(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 60;
  }

  return Math.min(600, Math.max(15, Math.round(value)));
}

function sanitizeLossCardCount(value: unknown): RoomSettings["lossCardCount"] {
  return value === 2 || value === 3 || value === 4 ? value : 1;
}

function sanitizeWordCategory(value: unknown): WordCategory {
  return value === "Cities" || value === "General" || value === "Animals" ? value : "General";
}

function sanitizeExtraRows(value: unknown): 0 | 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

function sanitizeDifficulty(value: unknown): Difficulty {
  return value === "Medium" || value === "Hard" ? value : "Normal";
}

function sanitizeSettingsUpdate(
  currentSettings: RoomSettings,
  partialSettings: Partial<RoomSettings>,
): RoomSettings {
  return {
    teamCount: sanitizeTeamCount(partialSettings.teamCount ?? currentSettings.teamCount),
    roundTimerSeconds: sanitizeRoundTimerSeconds(
      partialSettings.roundTimerSeconds ?? currentSettings.roundTimerSeconds,
    ),
    lossCardCount: sanitizeLossCardCount(partialSettings.lossCardCount ?? currentSettings.lossCardCount),
    wordCategory: sanitizeWordCategory(partialSettings.wordCategory ?? currentSettings.wordCategory),
    extraRows: sanitizeExtraRows(partialSettings.extraRows ?? currentSettings.extraRows),
    difficulty: sanitizeDifficulty(partialSettings.difficulty ?? currentSettings.difficulty),
  };
}

function applyTeamCountToPlayers(players: Player[], teamCount: TeamCount) {
  const activeTeams = getActiveTeams(teamCount);

  return players.map((currentPlayer) =>
    isActiveTeam(currentPlayer.team) && !activeTeams.includes(currentPlayer.team)
      ? { ...currentPlayer, team: "Unassigned" as const, role: "Operative" as const }
      : currentPlayer,
  );
}

export function GameRoomProvider({ children, initialRoomId }: { children: ReactNode; initialRoomId?: string }) {
  const [roomId, setRoomId] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<{ played: number; won: number; lost: number } | null>(null);
  const isLeavingRef = useRef(false);
  const [leftRoomCode, setLeftRoomCode] = useState<string | null>(null);
  const clearLeftRoomCode = useCallback(() => setLeftRoomCode(null), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const STATS_KEY = "iraqi-codenames-stats";
      const raw = localStorage.getItem(STATS_KEY);
      try {
        if (raw) {
          setPlayerStats(JSON.parse(raw));
        } else {
          setPlayerStats({ played: 0, won: 0, lost: 0 });
        }
      } catch {
        setPlayerStats({ played: 0, won: 0, lost: 0 });
      }
    }
  }, []);

  const resetPlayerStats = useCallback(() => {
    if (typeof window !== "undefined") {
      const STATS_KEY = "iraqi-codenames-stats";
      const PROCESSED_GAMES_KEY = "iraqi-codenames-processed-games";
      localStorage.removeItem(STATS_KEY);
      localStorage.removeItem(PROCESSED_GAMES_KEY);
      setPlayerStats({ played: 0, won: 0, lost: 0 });
    }
  }, []);

  useEffect(() => {
    if (!room || room.gameState !== "GameOver" || !room.winner) {
      return;
    }

    const playerInRoom = room.players.find((p) => p.id === playerId);
    if (!playerInRoom || playerInRoom.team === "Unassigned") {
      return;
    }

    // Generate unique board fingerprint based on card texts
    const fingerprint = room.board.map((card) => card.text).join(",");
    if (!fingerprint) {
      return;
    }

    const STATS_KEY = "iraqi-codenames-stats";
    const PROCESSED_GAMES_KEY = "iraqi-codenames-processed-games";

    const rawProcessed = localStorage.getItem(PROCESSED_GAMES_KEY);
    let processed: string[] = [];
    try {
      processed = rawProcessed ? JSON.parse(rawProcessed) : [];
    } catch {
      processed = [];
    }

    if (processed.includes(fingerprint)) {
      return;
    }

    // Update local stats
    const rawStats = localStorage.getItem(STATS_KEY);
    let stats = { played: 0, won: 0, lost: 0 };
    try {
      if (rawStats) {
        stats = JSON.parse(rawStats);
      }
    } catch {
      // Default stats
    }

    stats.played += 1;
    if (playerInRoom.team === room.winner) {
      stats.won += 1;
    } else {
      stats.lost += 1;
    }

    processed.push(fingerprint);
    if (processed.length > 50) {
      processed.shift();
    }

    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    localStorage.setItem(PROCESSED_GAMES_KEY, JSON.stringify(processed));

    setPlayerStats(stats);
  }, [room?.gameState, room?.winner, room?.board, playerId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const session = readSession();
      const nextPlayerId = session?.playerId ?? crypto.randomUUID();

      setPlayerId(nextPlayerId);
      setPlayerName(session?.playerName ?? "");
      setRoomId(initialRoomId ?? session?.roomId ?? "");
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialRoomId]);

  useEffect(() => {
    if (!isReady || !roomId || !isFirebaseConfigured) {
      return;
    }

    const database = getRealtimeDatabase();

    if (!database) {
      return;
    }

    const roomRef = ref(database, getRoomPath(roomId));

    return onValue(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setLeftRoomCode(roomId);
          setRoom(null);
          setRoomId("");
          saveSessionRoom(null, playerId, playerName);
          if (!isLeavingRef.current) {
            setError("الغرفة غير موجودة أو انتهت.");
          }
          return;
        }

        const nextRoom = normalizeRoom(snapshot.val());

        if (!nextRoom) {
          setLeftRoomCode(roomId);
          setRoom(null);
          setRoomId("");
          saveSessionRoom(null, playerId, playerName);
          setError("تعذر قراءة بيانات الغرفة.");
          return;
        }

        const isPlayerInRoom = nextRoom.players.some((currentPlayer) => currentPlayer.id === playerId);

        if (!isPlayerInRoom) {
          const wasPlayerInRoom = room?.players.some((currentPlayer) => currentPlayer.id === playerId) ?? false;

          setRoom(null);

          if (wasPlayerInRoom) {
            setLeftRoomCode(roomId);
            setRoomId("");
            saveSessionRoom(null, playerId, playerName);
            if (!isLeavingRef.current) {
              setError("تم إخراجك من الغرفة.");
            }
          }
          return;
        }

        setRoom(nextRoom);
      },
      () => {
        if (!isLeavingRef.current) {
          setError("فشل الاتصال اللحظي بقاعدة البيانات.");
        }
      },
    );
  }, [isReady, playerId, playerName, room, roomId]);

  useEffect(() => {
    if (!isReady || !roomId || !playerId || !isFirebaseConfigured) {
      return;
    }

    const database = getRealtimeDatabase();

    if (!database) {
      return;
    }

    const connectedRef = ref(database, ".info/connected");
    const presenceRef = ref(database, getPresencePath(roomId, playerId));
    let isCleanedUp = false;

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() !== true || isCleanedUp) {
        return;
      }

      void onDisconnect(presenceRef)
        .set(false)
        .then(() => set(presenceRef, true));
    });

    return () => {
      isCleanedUp = true;
      unsubscribe();
      void set(presenceRef, false);
    };
  }, [isReady, playerId, roomId]);

  const player = useMemo(() => {
    return room?.players.find((currentPlayer) => currentPlayer.id === playerId) ?? null;
  }, [playerId, room]);

  const runAction = useCallback(async <T,>(action: () => Promise<T>, fallback: string): Promise<T> => {
    setIsBusy(true);
    setError(null);

    try {
      return await action();
    } catch (actionError) {
      setError(buildMessage(actionError, fallback));
      throw actionError;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const savePlayerName = useCallback(
    async (name: string) => {
      const sanitizedName = validatePlayerName(name);

      if (roomId) {
        const database = getRealtimeDatabase();

        if (database) {
          await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
            const currentRoom = normalizeRoom(currentValue);

            if (!currentRoom) {
              return currentValue;
            }

            const currentPlayer = currentRoom.players.find((entry) => entry.id === playerId);

            if (!currentPlayer) {
              return currentValue;
            }

            return {
              ...currentRoom,
              players: upsertPlayer(currentRoom.players, {
                ...currentPlayer,
                name: sanitizedName,
              }),
            };
          });
        }
      }

      setPlayerName(sanitizedName);
      saveSessionRoom(roomId || null, playerId, sanitizedName);
    },
    [playerId, roomId],
  );

  const createRoom = useCallback(
    async (name: string): Promise<string> =>
      runAction(async () => {
        const database = getRealtimeDatabase();

        if (!database) {
          throw new Error("أضف إعدادات Firebase أولاً داخل متغيرات البيئة.");
        }

        const sanitizedName = validatePlayerName(name);
        const nextRoomId = createRoomId();
        const host = createPlayer(playerId, sanitizedName, true);
        const nextRoom = createInitialRoom(nextRoomId, host);

        await set(ref(database, getRoomPath(nextRoomId)), nextRoom);

        setPlayerName(sanitizedName);
        setRoomId(nextRoomId);
        saveSessionRoom(nextRoomId, playerId, sanitizedName);
        setLeftRoomCode(null);
        return nextRoomId;
      }, "تعذر إنشاء الغرفة."),
    [playerId, runAction],
  );

  const joinRoom = useCallback(
    async (roomCode: string, name: string) =>
      runAction(async () => {
        const database = getRealtimeDatabase();

        if (!database) {
          throw new Error("أضف إعدادات Firebase أولاً داخل متغيرات البيئة.");
        }

        const sanitizedName = validatePlayerName(name);
        const normalizedRoomCode = roomCode.replace(/\D/g, "").slice(0, 5);

        if (!normalizedRoomCode) {
          throw new Error("اكتب كود الغرفة أولاً.");
        }

        const roomRef = ref(database, getRoomPath(normalizedRoomCode));
        const roomSnapshot = await get(roomRef);

        if (!roomSnapshot.exists()) {
          throw new Error("لم يتم العثور على الغرفة المطلوبة.");
        }

        await runTransaction(roomRef, (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const existingPlayer = currentRoom.players.find((currentPlayer) => currentPlayer.id === playerId);
          const nextPlayer = existingPlayer
            ? { ...existingPlayer, name: sanitizedName }
            : createPlayer(playerId, sanitizedName, false);

          return {
            ...currentRoom,
            presence: {
              ...(currentRoom.presence ?? {}),
              [nextPlayer.id]: true,
            },
            players: upsertPlayer(currentRoom.players, nextPlayer),
          };
        });

        setPlayerName(sanitizedName);
        setRoomId(normalizedRoomCode);
        saveSessionRoom(normalizedRoomCode, playerId, sanitizedName);
        setLeftRoomCode(null);
      }, "تعذر الانضمام إلى الغرفة."),
    [playerId, runAction],
  );

  const leaveRoom = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        const leavingRoomId = roomId;
        setLeftRoomCode(leavingRoomId);
        isLeavingRef.current = true;
        try {
          const roomRef = ref(database, getRoomPath(leavingRoomId));

          await runTransaction(roomRef, (currentValue) => {
            const currentRoom = normalizeRoom(currentValue);

            if (!currentRoom) {
              return currentValue;
            }

            const leavingPlayer = currentRoom.players.find((currentPlayer) => currentPlayer.id === playerId);

            if (!leavingPlayer) {
              return currentValue;
            }

            const remainingPlayers = currentRoom.players.filter((currentPlayer) => currentPlayer.id !== playerId);

            if (!remainingPlayers.length) {
              return null;
            }

            if (leavingPlayer.isHost && !remainingPlayers.some((currentPlayer) => currentPlayer.isHost)) {
              remainingPlayers[0] = {
                ...remainingPlayers[0],
                isHost: true,
              };
            }

            return {
              ...currentRoom,
              presence: Object.fromEntries(
                Object.entries(currentRoom.presence ?? {}).filter(([currentPresencePlayerId]) => currentPresencePlayerId !== playerId),
              ),
              players: remainingPlayers,
            };
          });

          setRoom(null);
          setRoomId("");
          saveSessionRoom(null, playerId, playerName);

          // تنظيف بارامتر الدعوة من URL لمنع إعادة الانضمام التلقائي
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.has("room")) {
              url.searchParams.delete("room");
              window.history.replaceState({}, "", url.pathname + url.search);
            }
          }
        } finally {
          isLeavingRef.current = false;
        }
      }, "\u062a\u0639\u0630\u0631 \u0645\u063a\u0627\u062f\u0631\u0629 \u0627\u0644\u063a\u0631\u0641\u0629."),
    [playerId, playerName, roomId, runAction],
  );

  const chooseTeam = useCallback(
    async (team: Team) =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const currentPlayer = currentRoom.players.find((entry) => entry.id === playerId);

          if (!currentPlayer) {
            return currentValue;
          }

          const activeTeams = getActiveTeams(currentRoom.settings.teamCount);
          const nextTeamSelection =
            team === "Unassigned" || (isActiveTeam(team) && activeTeams.includes(team)) ? team : "Unassigned";

          return {
            ...currentRoom,
            players: upsertPlayer(currentRoom.players, {
              ...currentPlayer,
              team: nextTeamSelection,
            }),
          };
        });
      }, "تعذر تحديث الفريق."),
    [playerId, roomId, runAction],
  );

  const chooseRole = useCallback(
    async (role: Role) =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const currentPlayer = currentRoom.players.find((entry) => entry.id === playerId);

          if (!currentPlayer) {
            return currentValue;
          }

          let players = currentRoom.players;

          if (role === "Spymaster" && currentPlayer.team !== "Unassigned") {
            players = players.map((entry) =>
              entry.id !== currentPlayer.id && entry.team === currentPlayer.team && entry.role === "Spymaster"
                ? { ...entry, role: "Operative" }
                : entry,
            );
          }

          return {
            ...currentRoom,
            players: upsertPlayer(players, {
              ...currentPlayer,
              role,
            }),
          };
        });
      }, "تعذر تحديث الدور."),
    [playerId, roomId, runAction],
  );

  const joinTeamAs = useCallback(
    async (team: ActiveTeam, role: Role) =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const currentPlayer = currentRoom.players.find((entry) => entry.id === playerId);

          if (!currentPlayer) {
            return currentValue;
          }

          const activeTeams = getActiveTeams(currentRoom.settings.teamCount);

          if (!activeTeams.includes(team)) {
            return currentValue;
          }

          let players = currentRoom.players;

          if (role === "Spymaster") {
            players = players.map((entry) =>
              entry.id !== currentPlayer.id && entry.team === team && entry.role === "Spymaster"
                ? { ...entry, role: "Operative" }
                : entry,
            );
          }

          return {
            ...currentRoom,
            players: upsertPlayer(players, {
              ...currentPlayer,
              team,
              role,
            }),
          };
        });
      }, "تعذر الانضمام إلى الفريق."),
    [playerId, roomId, runAction],
  );

  const kickPlayer = useCallback(
    async (targetPlayerId: string) =>
      runAction(async () => {
        if (!roomId || !targetPlayerId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const actor = currentRoom.players.find((entry) => entry.id === playerId);
          const targetPlayer = currentRoom.players.find((entry) => entry.id === targetPlayerId);

          if (!actor?.isHost || !targetPlayer || targetPlayer.id === actor.id || targetPlayer.isHost) {
            return currentValue;
          }

          const remainingPlayers = currentRoom.players.filter((entry) => entry.id !== targetPlayerId);

          if (!remainingPlayers.length) {
            return null;
          }

          return {
            ...currentRoom,
            presence: Object.fromEntries(
              Object.entries(currentRoom.presence ?? {}).filter(
                ([currentPresencePlayerId]) => currentPresencePlayerId !== targetPlayerId,
              ),
            ),
            players: remainingPlayers,
          };
        });
      }, "تعذر طرد اللاعب."),
    [playerId, roomId, runAction],
  );

  const updateRoomSettings = useCallback(
    async (settings: Partial<RoomSettings>) =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);
          const wasPlaying = currentRoom?.gameState === "Playing";

          if (!currentRoom || currentRoom.gameState === "GameOver") {
            return currentValue;
          }

          const currentPlayer = currentRoom.players.find((entry) => entry.id === playerId);

          if (!currentPlayer?.isHost) {
            return currentValue;
          }

          const nextSettings = sanitizeSettingsUpdate(currentRoom.settings, settings);
          const nextPlayers = applyTeamCountToPlayers(currentRoom.players, nextSettings.teamCount);
          const activeTeams = getActiveTeams(nextSettings.teamCount);
          const nextRecentWords =
            nextSettings.wordCategory !== currentRoom.settings.wordCategory ? [] : currentRoom.recentWords;

          if (wasPlaying) {
            const requiresBoardReset =
              nextSettings.teamCount !== currentRoom.settings.teamCount ||
              nextSettings.lossCardCount !== currentRoom.settings.lossCardCount ||
              nextSettings.wordCategory !== currentRoom.settings.wordCategory ||
              nextSettings.extraRows !== currentRoom.settings.extraRows;

            if (requiresBoardReset) {
              const { board, currentTurn, recentWords } = createBoardState(nextSettings, nextRecentWords);

              return {
                ...currentRoom,
                players: nextPlayers,
                settings: nextSettings,
                board,
                recentWords,
                clues: [],
                eliminatedTeams: [],
                currentTurn,
                turnPhase: "Clue",
              ...getPausedStartState(nextSettings.roundTimerSeconds),
                winner: null,
                gameState: "Playing",
              };
            }

            return {
              ...currentRoom,
              settings: nextSettings,
              turnPhase: currentRoom.turnPhase,
              isPaused: currentRoom.isPaused,
              pausedRemainingMs: currentRoom.pausedRemainingMs,
              turnEndsAt:
                currentRoom.isPaused
                  ? null
                  : nextSettings.roundTimerSeconds !== currentRoom.settings.roundTimerSeconds
                  ? getNextTurnEndsAt(nextSettings.roundTimerSeconds)
                  : currentRoom.turnEndsAt ?? getNextTurnEndsAt(nextSettings.roundTimerSeconds),
            };
          }

          return {
            ...currentRoom,
            players: nextPlayers,
            settings: nextSettings,
            recentWords: nextRecentWords,
            clues: currentRoom.clues ?? [],
            eliminatedTeams: currentRoom.eliminatedTeams.filter((team) => activeTeams.includes(team)),
            isPaused: currentRoom.isPaused,
            pausedRemainingMs: currentRoom.pausedRemainingMs,
            currentTurn: activeTeams.includes(currentRoom.currentTurn) ? currentRoom.currentTurn : activeTeams[0],
            turnPhase: "Clue",
            turnEndsAt: null,
            winner: currentRoom.winner && activeTeams.includes(currentRoom.winner) ? currentRoom.winner : null,
          };
        });
      }, "تعذر تحديث إعدادات الغرفة."),
    [playerId, roomId, runAction],
  );

  const startGame = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId || !room || !player?.isHost) {
          throw new Error("فقط المضيف يمكنه بدء الجولة.");
        }

        if (!ensurePlayableTeams(room.players, room.settings.teamCount)) {
          throw new Error("يجب تجهيز قائد ومحقق لكل فريق نشط قبل بدء الجولة.");
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const { board, currentTurn, recentWords } = createBoardState(currentRoom.settings, currentRoom.recentWords);

          return {
            ...currentRoom,
            board,
            recentWords,
            clues: [],
            eliminatedTeams: [],
            currentTurn,
            turnPhase: "Clue",
            ...getPausedStartState(currentRoom.settings.roundTimerSeconds),
            winner: null,
            gameState: "Playing",
          };
        });
      }, "تعذر بدء الجولة."),
    [player, room, roomId, runAction],
  );

  const launchGameWithSettings = useCallback(
    async (settings: Partial<RoomSettings>) =>
      runAction(async () => {
        if (!roomId || !player?.isHost) {
          throw new Error("فقط المضيف يمكنه بدء الجولة.");
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const nextSettings = sanitizeSettingsUpdate(currentRoom.settings, settings);
          const nextPlayers = applyTeamCountToPlayers(currentRoom.players, nextSettings.teamCount);

          if (!ensurePlayableTeams(nextPlayers, nextSettings.teamCount)) {
            throw new Error("يجب تجهيز قائد ومحقق لكل فريق نشط قبل بدء الجولة.");
          }

          const seedRecentWords = nextSettings.wordCategory !== currentRoom.settings.wordCategory ? [] : currentRoom.recentWords;
          const { board, currentTurn, recentWords } = createBoardState(nextSettings, seedRecentWords);

          return {
            ...currentRoom,
            players: nextPlayers,
            settings: nextSettings,
            board,
            recentWords,
            clues: [],
            eliminatedTeams: [],
            currentTurn,
            turnPhase: "Clue",
            ...getPausedStartState(nextSettings.roundTimerSeconds),
            winner: null,
            gameState: "Playing",
          };
        });
      }, "تعذر بدء اللعبة بالإعدادات الجديدة."),
    [player, roomId, runAction],
  );

  const sendClue = useCallback(
    async (text: string, count: number) =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const trimmedText = text.trim().slice(0, 24);
        const sanitizedCount = Math.min(9, Math.max(1, Math.round(count)));

        if (!trimmedText) {
          throw new Error("اكتب التلميح أولاً.");
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom || currentRoom.gameState !== "Playing" || currentRoom.turnPhase !== "Clue" || currentRoom.isPaused) {
            return currentValue;
          }

          const actor = currentRoom.players.find((currentPlayer) => currentPlayer.id === playerId);

          if (
            !actor ||
            actor.role !== "Spymaster" ||
            actor.team === "Unassigned" ||
            actor.team !== currentRoom.currentTurn
          ) {
            return currentValue;
          }

          const nextClues = [
            {
              team: actor.team,
              text: trimmedText,
              count: sanitizedCount,
              createdAt: Date.now(),
            },
            ...(currentRoom.clues ?? []),
          ].slice(0, 24);

          return {
            ...currentRoom,
            clues: nextClues,
            operativeSelections: {},
            turnPhase: "Guess",
            turnEndsAt: getNextTurnEndsAt(currentRoom.settings.roundTimerSeconds),
          };
        });
      }, "تعذر إرسال التلميح."),
    [playerId, roomId, runAction],
  );

  const togglePauseGame = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom || currentRoom.gameState !== "Playing") {
            return currentValue;
          }

          const actor = currentRoom.players.find((currentPlayer) => currentPlayer.id === playerId);

          if (!actor?.isHost) {
            return currentValue;
          }

          if (currentRoom.isPaused) {
            return {
              ...currentRoom,
              isPaused: false,
              pausedRemainingMs: null,
              turnEndsAt: Date.now() + getCurrentRemainingMs(currentRoom),
            };
          }

          return {
            ...currentRoom,
            isPaused: true,
            pausedRemainingMs: getCurrentRemainingMs(currentRoom),
            turnEndsAt: null,
          };
        });
      }, "تعذر تغيير حالة الإيقاف."),
    [playerId, roomId, runAction],
  );

  const expireTurnTimer = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom || currentRoom.gameState !== "Playing" || currentRoom.isPaused || !currentRoom.turnEndsAt) {
            return currentValue;
          }

          if (currentRoom.turnEndsAt > Date.now()) {
            return currentValue;
          }

          const nextTurn = getNextAliveTurn(currentRoom.currentTurn, currentRoom);

          return {
            ...currentRoom,
            ...getNextCluePhaseState(currentRoom, nextTurn, currentRoom.clues),
          };
        });
      }, "تعذر إنهاء الدور بعد انتهاء الوقت."),
    [roomId, runAction],
  );

  const endGuessTurn = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom || currentRoom.gameState !== "Playing" || currentRoom.turnPhase !== "Guess" || currentRoom.isPaused) {
            return currentValue;
          }

          const actor = currentRoom.players.find((currentPlayer) => currentPlayer.id === playerId);

          if (!actor || actor.role !== "Operative" || actor.team !== currentRoom.currentTurn) {
            return currentValue;
          }

          const nextTurn = getNextAliveTurn(currentRoom.currentTurn, currentRoom);

          return {
            ...currentRoom,
            ...getNextCluePhaseState(currentRoom, nextTurn, currentRoom.clues),
          };
        });
      }, "تعذر إنهاء الدور."),
    [playerId, roomId, runAction],
  );

  const revealCard = useCallback(
    async (cardId: number) =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom || currentRoom.gameState !== "Playing" || currentRoom.turnPhase !== "Guess" || currentRoom.isPaused) {
            return currentValue;
          }

          const actor = currentRoom.players.find((currentPlayer) => currentPlayer.id === playerId);

          if (!actor || actor.role !== "Operative" || actor.team !== currentRoom.currentTurn) {
            return currentValue;
          }

          const currentTurnOperatives = getCurrentTurnOperatives(currentRoom);

          if (currentTurnOperatives.length === 0) {
            return currentValue;
          }

          const originalCard = currentRoom.board.find((card) => card.id === cardId);

          if (!originalCard || originalCard.isRevealed) {
            return currentValue;
          }

          const nextOperativeSelections = {
            ...currentRoom.operativeSelections,
            [actor.id]: cardId,
          };
          const consensusCardId = getConsensusSelectionCardId(currentTurnOperatives, nextOperativeSelections);

          if (consensusCardId === null) {
            return {
              ...currentRoom,
              operativeSelections: nextOperativeSelections,
              pendingRevealCardId: null,
              pendingRevealAt: null,
            };
          }

          return {
            ...currentRoom,
            operativeSelections: nextOperativeSelections,
            pendingRevealCardId: consensusCardId,
            pendingRevealAt: Date.now() + PENDING_REVEAL_DURATION_MS,
            turnEndsAt:
              currentRoom.pendingRevealCardId === null && currentRoom.turnEndsAt
                ? currentRoom.turnEndsAt + PENDING_REVEAL_DURATION_MS
                : currentRoom.turnEndsAt,
          };
        });
      }, "تعذر كشف الكارت."),
    [playerId, roomId, runAction],
  );

  const resolvePendingReveal = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId) {
          return;
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom || currentRoom.gameState !== "Playing" || currentRoom.turnPhase !== "Guess" || currentRoom.isPaused) {
            return currentValue;
          }

          if (currentRoom.pendingRevealCardId === null || currentRoom.pendingRevealAt === null) {
            return currentValue;
          }

          if (currentRoom.pendingRevealAt > Date.now()) {
            return currentValue;
          }

          const originalCard = currentRoom.board.find((card) => card.id === currentRoom.pendingRevealCardId);

          if (!originalCard || originalCard.isRevealed) {
            return {
              ...currentRoom,
              ...getClearedGuessSelectionState(),
            };
          }

          return resolveCardReveal(currentRoom, currentRoom.pendingRevealCardId);
        });
      }, "تعذر تأكيد كشف الكارت."),
    [roomId, runAction],
  );

  const resetGame = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId || !player?.isHost) {
          throw new Error("فقط المضيف يمكنه إعادة الجولة.");
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const { board, currentTurn, recentWords } = createBoardState(currentRoom.settings, currentRoom.recentWords);

          return {
            ...currentRoom,
            board,
            recentWords,
            clues: [],
            eliminatedTeams: [],
            currentTurn,
            turnPhase: "Clue",
            ...getPausedStartState(currentRoom.settings.roundTimerSeconds),
            winner: null,
            gameState: "Playing",
          };
        });
      }, "تعذر تصفير الجولة."),
    [player, roomId, runAction],
  );

  const shuffleBoardWords = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId || !player?.isHost) {
          throw new Error("فقط المضيف يمكنه خلط الكلمات.");
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const { board, currentTurn, recentWords } = createBoardState(currentRoom.settings, currentRoom.recentWords);

          return {
            ...currentRoom,
            board,
            recentWords,
            clues: [],
            eliminatedTeams: [],
            currentTurn,
            turnPhase: "Clue",
            ...(currentRoom.gameState === "Playing"
              ? getPausedStartState(currentRoom.settings.roundTimerSeconds)
              : {
                  turnEndsAt: null,
                  isPaused: false,
                  pausedRemainingMs: null,
                  pendingRevealCardId: null,
                  pendingRevealAt: null,
                  operativeSelections: {},
                }),
            winner: null,
          };
        });
      }, "تعذر خلط الكلمات."),
    [player, roomId, runAction],
  );

  const shuffleTeams = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId || !player?.isHost) {
          throw new Error("فقط المضيف يمكنه خلط الأفرقة.");
        }

        const database = getRealtimeDatabase();

        if (!database) {
          return;
        }

        await runTransaction(ref(database, getRoomPath(roomId)), (currentValue) => {
          const currentRoom = normalizeRoom(currentValue);

          if (!currentRoom) {
            return currentValue;
          }

          const activeTeams = getActiveTeams(currentRoom.settings.teamCount);
          const shuffledPlayers = shuffleList(currentRoom.players);

          const nextPlayers = currentRoom.players.map((currentPlayer) => {
            const index = shuffledPlayers.findIndex((shuffled) => shuffled.id === currentPlayer.id);
            
            let team: ActiveTeam;
            let role: Role;
            
            if (index < activeTeams.length) {
              team = activeTeams[index];
              role = "Spymaster";
            } else {
              const teamIndex = (index - activeTeams.length) % activeTeams.length;
              team = activeTeams[teamIndex];
              role = "Operative";
            }
            
            return {
              ...currentPlayer,
              team,
              role,
            };
          });

          return {
            ...currentRoom,
            players: nextPlayers,
          };
        });
      }, "تعذر خلط الأفرقة."),
    [player, roomId, runAction],
  );

  const value = useMemo<GameRoomContextValue>(
    () => ({
      room,
      player,
      roomId,
      playerName,
      isReady,
      isBusy,
      error,
      firebaseReady: isFirebaseConfigured,
      clearError: () => setError(null),
      savePlayerName,
      createRoom,
      joinRoom,
      leaveRoom,
      chooseTeam,
      chooseRole,
      joinTeamAs,
      kickPlayer,
      launchGameWithSettings,
      updateRoomSettings,
      startGame,
      sendClue,
      togglePauseGame,
      expireTurnTimer,
      endGuessTurn,
      revealCard,
      resolvePendingReveal,
      resetGame,
      shuffleBoardWords,
      shuffleTeams,
      playerStats,
      resetPlayerStats,
      leftRoomCode,
      clearLeftRoomCode,
      playerId,
    }),
    [
      chooseRole,
      chooseTeam,
      createRoom,
      error,
      isBusy,
      isReady,
      joinRoom,
      joinTeamAs,
      kickPlayer,
      launchGameWithSettings,
      leaveRoom,
      player,
      playerName,
      savePlayerName,
      resetGame,
      revealCard,
      room,
      roomId,
      startGame,
      sendClue,
      togglePauseGame,
      expireTurnTimer,
      endGuessTurn,
      updateRoomSettings,
      resolvePendingReveal,
      shuffleBoardWords,
      shuffleTeams,
      playerStats,
      resetPlayerStats,
      leftRoomCode,
      clearLeftRoomCode,
      playerId,
    ],
  );

  return <GameRoomContext.Provider value={value}>{children}</GameRoomContext.Provider>;
}

export function useGameRoom() {
  const context = useContext(GameRoomContext);

  if (!context) {
    throw new Error("useGameRoom must be used inside GameRoomProvider.");
  }

  return context;
}
