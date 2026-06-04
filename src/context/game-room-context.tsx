"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { get, onValue, ref, runTransaction, set } from "firebase/database";

import {
  countHiddenCards,
  createBoardState,
  createInitialRoom,
  createPlayer,
  createRoomId,
  normalizeRoom,
} from "../lib/game";
import { getRealtimeDatabase, isFirebaseConfigured } from "../lib/firebase";
import { getActiveTeams, isActiveTeam, nextTeam, type ActiveTeam } from "../lib/teams";
import type { Player, Role, Room, RoomSettings, Team, TeamCount, WordCategory } from "../types/game";

type PlayerTeam = ActiveTeam;
// Temporary bypass requested by the user to preview the next screen before restoring team readiness rules.
const BYPASS_LOBBY_READY_CHECK = true;

function getNextTurnEndsAt(roundTimerSeconds: number) {
  return Date.now() + roundTimerSeconds * 1000;
}

interface GameRoomContextValue {
  room: Room | null;
  player: Player | null;
  roomId: string;
  playerName: string;
  isReady: boolean;
  isBusy: boolean;
  error: string | null;
  firebaseReady: boolean;
  clearError: () => void;
  savePlayerName: (name: string) => void;
  createRoom: (name: string) => Promise<void>;
  joinRoom: (roomCode: string, name: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  chooseTeam: (team: Team) => Promise<void>;
  chooseRole: (role: Role) => Promise<void>;
  joinTeamAs: (team: ActiveTeam, role: Role) => Promise<void>;
  updateRoomSettings: (settings: Partial<RoomSettings>) => Promise<void>;
  startGame: () => Promise<void>;
  sendClue: (text: string, count: number) => Promise<void>;
  revealCard: (cardId: number) => Promise<void>;
  resetGame: () => Promise<void>;
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
  return value === "Cities" || value === "General" ? value : "General";
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

export function GameRoomProvider({ children }: { children: ReactNode }) {
  const [roomId, setRoomId] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const session = readSession();
      const nextPlayerId = session?.playerId ?? crypto.randomUUID();

      setPlayerId(nextPlayerId);
      setPlayerName(session?.playerName ?? "");
      setRoomId(session?.roomId ?? "");
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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
          setRoom(null);
          setRoomId("");
          saveSessionRoom(null, playerId, playerName);
          setError("الغرفة غير موجودة أو انتهت.");
          return;
        }

        const nextRoom = normalizeRoom(snapshot.val());

        if (!nextRoom) {
          setError("تعذر قراءة بيانات الغرفة.");
          return;
        }

        setRoom(nextRoom);
      },
      () => {
        setError("فشل الاتصال اللحظي بقاعدة البيانات.");
      },
    );
  }, [isReady, playerId, playerName, roomId]);

  const player = useMemo(() => {
    return room?.players.find((currentPlayer) => currentPlayer.id === playerId) ?? null;
  }, [playerId, room]);

  const runAction = useCallback(async (action: () => Promise<void>, fallback: string) => {
    setIsBusy(true);
    setError(null);

    try {
      await action();
    } catch (actionError) {
      setError(buildMessage(actionError, fallback));
      throw actionError;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const savePlayerName = useCallback(
    (name: string) => {
      const sanitizedName = validatePlayerName(name);

      setPlayerName(sanitizedName);
      saveSessionRoom(roomId || null, playerId, sanitizedName);
    },
    [playerId, roomId],
  );

  const createRoom = useCallback(
    async (name: string) =>
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
            players: upsertPlayer(currentRoom.players, nextPlayer),
          };
        });

        setPlayerName(sanitizedName);
        setRoomId(normalizedRoomCode);
        saveSessionRoom(normalizedRoomCode, playerId, sanitizedName);
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

        const roomRef = ref(database, getRoomPath(roomId));

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
            players: remainingPlayers,
          };
        });

        setRoom(null);
        setRoomId("");
        saveSessionRoom(null, playerId, playerName);
      }, "تعذر مغادرة الغرفة."),
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

          if (!currentRoom || currentRoom.gameState === "GameOver") {
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

          if (!currentRoom || currentRoom.gameState === "GameOver") {
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

          if (!currentRoom || currentRoom.gameState === "GameOver") {
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

          if (wasPlaying) {
            const requiresBoardReset =
              nextSettings.teamCount !== currentRoom.settings.teamCount ||
              nextSettings.lossCardCount !== currentRoom.settings.lossCardCount ||
              nextSettings.wordCategory !== currentRoom.settings.wordCategory;

            if (requiresBoardReset) {
              const { board, currentTurn } = createBoardState(nextSettings);

              return {
                ...currentRoom,
                players: nextPlayers,
                settings: nextSettings,
                board,
                clues: [],
                currentTurn,
                turnEndsAt: getNextTurnEndsAt(nextSettings.roundTimerSeconds),
                winner: null,
                gameState: "Playing",
              };
            }

            return {
              ...currentRoom,
              settings: nextSettings,
              turnEndsAt:
                nextSettings.roundTimerSeconds !== currentRoom.settings.roundTimerSeconds
                  ? getNextTurnEndsAt(nextSettings.roundTimerSeconds)
                  : currentRoom.turnEndsAt ?? getNextTurnEndsAt(nextSettings.roundTimerSeconds),
            };
          }

          return {
            ...currentRoom,
            players: nextPlayers,
            settings: nextSettings,
            clues: currentRoom.clues ?? [],
            currentTurn: activeTeams.includes(currentRoom.currentTurn) ? currentRoom.currentTurn : activeTeams[0],
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

          const { board, currentTurn } = createBoardState(currentRoom.settings);

          return {
            ...currentRoom,
            board,
            clues: [],
            currentTurn,
            turnEndsAt: getNextTurnEndsAt(currentRoom.settings.roundTimerSeconds),
            winner: null,
            gameState: "Playing",
          };
        });
      }, "تعذر بدء الجولة."),
    [player, room, roomId, runAction],
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

          if (!currentRoom || currentRoom.gameState !== "Playing") {
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
          };
        });
      }, "تعذر إرسال التلميح."),
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

          if (!currentRoom || currentRoom.gameState !== "Playing") {
            return currentValue;
          }

          const actor = currentRoom.players.find((currentPlayer) => currentPlayer.id === playerId);

          if (!actor || actor.role !== "Operative" || actor.team !== currentRoom.currentTurn) {
            return currentValue;
          }

          const originalCard = currentRoom.board.find((card) => card.id === cardId);

          if (!originalCard || originalCard.isRevealed) {
            return currentValue;
          }

          const nextBoard = currentRoom.board.map((card) =>
            card.id === cardId ? { ...card, isRevealed: true } : card,
          );
          const selectedCard = nextBoard.find((card) => card.id === cardId);

          if (!selectedCard) {
            return currentValue;
          }

          const activeTeams = getActiveTeams(currentRoom.settings.teamCount);

          if (selectedCard.type === "Control") {
            return {
              ...currentRoom,
              board: nextBoard,
              winner: nextTeam(currentRoom.currentTurn, activeTeams),
              turnEndsAt: null,
              gameState: "GameOver",
            };
          }

          const winningTeam = activeTeams.find((team) => countHiddenCards(nextBoard, team) === 0);

          if (winningTeam) {
            return {
              ...currentRoom,
              board: nextBoard,
              winner: winningTeam,
              turnEndsAt: null,
              gameState: "GameOver",
            };
          }

          const nextTurn: PlayerTeam =
            selectedCard.type === currentRoom.currentTurn
              ? currentRoom.currentTurn
              : nextTeam(currentRoom.currentTurn, activeTeams);

          return {
            ...currentRoom,
            board: nextBoard,
            clues:
              nextTurn === currentRoom.currentTurn
                ? currentRoom.clues
                : currentRoom.clues.filter((clue) => clue.team !== currentRoom.currentTurn),
            currentTurn: nextTurn,
            turnEndsAt:
              nextTurn === currentRoom.currentTurn
                ? currentRoom.turnEndsAt ?? getNextTurnEndsAt(currentRoom.settings.roundTimerSeconds)
                : getNextTurnEndsAt(currentRoom.settings.roundTimerSeconds),
          };
        });
      }, "تعذر كشف الكارت."),
    [playerId, roomId, runAction],
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

          const { board, currentTurn } = createBoardState(currentRoom.settings);

          return {
            ...currentRoom,
            board,
            clues: [],
            currentTurn,
            turnEndsAt: null,
            winner: null,
            gameState: "Lobby",
          };
        });
      }, "تعذر تصفير الجولة."),
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
      updateRoomSettings,
      startGame,
      sendClue,
      revealCard,
      resetGame,
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
      updateRoomSettings,
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
