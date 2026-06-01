import { IRAQI_WORDS } from "@/lib/words";
import type { Card, CardType, Player, Room } from "@/types/game";

const BOARD_SIZE = 25;

export function createRoomId(length = 5) {
  const digits = "0123456789";

  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * digits.length);
    return digits[index];
  }).join("");
}

export function shuffleList<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function getOpposingTeam(team: "Red" | "Blue") {
  return team === "Red" ? "Blue" : "Red";
}

function createCardTypes(startingTeam: "Red" | "Blue") {
  const redCount = startingTeam === "Red" ? 9 : 8;
  const blueCount = startingTeam === "Blue" ? 9 : 8;
  const types: CardType[] = [
    ...Array.from({ length: redCount }, () => "Red" as const),
    ...Array.from({ length: blueCount }, () => "Blue" as const),
    ...Array.from({ length: 7 }, () => "Neutral" as const),
    "Control",
  ];

  return shuffleList(types);
}

export function createBoardState() {
  const currentTurn: "Red" | "Blue" = Math.random() > 0.5 ? "Red" : "Blue";
  const words = shuffleList(IRAQI_WORDS).slice(0, BOARD_SIZE);
  const types = createCardTypes(currentTurn);

  const board: Card[] = words.map((text, index) => ({
    id: index,
    text,
    type: types[index],
    isRevealed: false,
  }));

  return {
    board,
    currentTurn,
  };
}

export function createPlayer(playerId: string, name: string, isHost = false): Player {
  return {
    id: playerId,
    name: name.trim(),
    team: "Unassigned",
    role: "Operative",
    isHost,
  };
}

export function createInitialRoom(roomId: string, host: Player): Room {
  const { board, currentTurn } = createBoardState();

  return {
    roomId,
    players: [host],
    gameState: "Lobby",
    board,
    currentTurn,
    winner: null,
  };
}

export function countHiddenCards(board: Card[], team: "Red" | "Blue") {
  return board.filter((card) => card.type === team && !card.isRevealed).length;
}

export function normalizeRoom(value: unknown): Room | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const room = value as Room;

  if (!room.roomId || !Array.isArray(room.players) || !Array.isArray(room.board)) {
    return null;
  }

  return room;
}
