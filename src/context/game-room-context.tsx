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
  getOpposingTeam,
  normalizeRoom,
} from "@/lib/game";
import { getRealtimeDatabase, isFirebaseConfigured } from "@/lib/firebase";
import type { Player, Role, Room, Team } from "@/types/game";

type PlayerTeam = Exclude<Team, "Unassigned">;

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
  createRoom: (name: string) => Promise<void>;
  joinRoom: (roomCode: string, name: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  chooseTeam: (team: Team) => Promise<void>;
  chooseRole: (role: Role) => Promise<void>;
  startGame: () => Promise<void>;
  revealCard: (cardId: number) => Promise<void>;
  resetGame: () => Promise<void>;
}

interface SessionState {
  playerId: string;
  playerName: string;
  roomId: string;
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

  if (!session || !session.roomId) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
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

function ensurePlayableTeams(players: Player[]) {
  const redPlayers = players.filter((player) => player.team === "Red");
  const bluePlayers = players.filter((player) => player.team === "Blue");

  const redReady =
    redPlayers.some((player) => player.role === "Spymaster") &&
    redPlayers.some((player) => player.role === "Operative");
  const blueReady =
    bluePlayers.some((player) => player.role === "Spymaster") &&
    bluePlayers.some((player) => player.role === "Operative");

  return redReady && blueReady;
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
          writeSession(null);
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
  }, [isReady, roomId]);

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
        writeSession({
          playerId,
          playerName: sanitizedName,
          roomId: nextRoomId,
        });
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
        const normalizedRoomCode = roomCode.trim().toUpperCase();

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
        writeSession({
          playerId,
          playerName: sanitizedName,
          roomId: normalizedRoomCode,
        });
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

          const remainingPlayers = currentRoom.players.filter((currentPlayer) => currentPlayer.id !== playerId);

          if (!remainingPlayers.length) {
            return null;
          }

          if (!remainingPlayers.some((currentPlayer) => currentPlayer.isHost)) {
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
        writeSession(null);
      }, "تعذر مغادرة الغرفة."),
    [playerId, roomId, runAction],
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

          if (!currentRoom || currentRoom.gameState !== "Lobby") {
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
              team,
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

          if (!currentRoom || currentRoom.gameState !== "Lobby") {
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

  const startGame = useCallback(
    async () =>
      runAction(async () => {
        if (!roomId || !room || !player?.isHost) {
          throw new Error("فقط المضيف يمكنه بدء الجولة.");
        }

        if (!ensurePlayableTeams(room.players)) {
          throw new Error("يجب تجهيز قائد ومحقق لكل فريق قبل بدء الجولة.");
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

          const { board, currentTurn } = createBoardState();

          return {
            ...currentRoom,
            board,
            currentTurn,
            winner: null,
            gameState: "Playing",
          };
        });
      }, "تعذر بدء الجولة."),
    [player, room, roomId, runAction],
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

          const nextBoard = currentRoom.board.map((card) =>
            card.id === cardId ? { ...card, isRevealed: true } : card,
          );
          const selectedCard = nextBoard.find((card) => card.id === cardId);

          if (!selectedCard || selectedCard.isRevealed === false) {
            return currentValue;
          }

          if (currentRoom.board.find((card) => card.id === cardId)?.isRevealed) {
            return currentValue;
          }

          if (selectedCard.type === "Control") {
            return {
              ...currentRoom,
              board: nextBoard,
              winner: getOpposingTeam(currentRoom.currentTurn),
              gameState: "GameOver",
            };
          }

          const redRemaining = countHiddenCards(nextBoard, "Red");
          const blueRemaining = countHiddenCards(nextBoard, "Blue");

          if (redRemaining === 0) {
            return {
              ...currentRoom,
              board: nextBoard,
              winner: "Red",
              gameState: "GameOver",
            };
          }

          if (blueRemaining === 0) {
            return {
              ...currentRoom,
              board: nextBoard,
              winner: "Blue",
              gameState: "GameOver",
            };
          }

          const nextTurn: PlayerTeam =
            selectedCard.type === currentRoom.currentTurn
              ? currentRoom.currentTurn
              : getOpposingTeam(currentRoom.currentTurn);

          return {
            ...currentRoom,
            board: nextBoard,
            currentTurn: nextTurn,
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

          const { board, currentTurn } = createBoardState();

          return {
            ...currentRoom,
            board,
            currentTurn,
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
      createRoom,
      joinRoom,
      leaveRoom,
      chooseTeam,
      chooseRole,
      startGame,
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
      leaveRoom,
      player,
      playerName,
      resetGame,
      revealCard,
      room,
      roomId,
      startGame,
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
