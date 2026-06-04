import { getWordsByCategory } from "./words";
import { getActiveTeams, type ActiveTeam } from "./teams";
import type { Card, CardType, Clue, Player, Room, RoomSettings, TeamCount, WordCategory } from "../types/game";

const DEFAULT_SETTINGS: RoomSettings = {
  teamCount: 2,
  roundTimerSeconds: 60,
  lossCardCount: 1,
  wordCategory: "General",
};

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

export function getDefaultRoomSettings(): RoomSettings {
  return { ...DEFAULT_SETTINGS };
}

function getBoardSize(teamCount: TeamCount) {
  return teamCount === 2 ? 25 : 36;
}

function createCardTypes(
  activeTeams: ActiveTeam[],
  startingTeam: ActiveTeam,
  lossCardCount: number,
  boardSize: number,
) {
  const teamCardCounts = activeTeams.reduce<Record<ActiveTeam, number>>(
    (counts, team) => ({
      ...counts,
      [team]: activeTeams.length === 2 ? 8 : activeTeams.length === 3 ? 6 : 5,
    }),
    {
      Red: 0,
      Blue: 0,
      Green: 0,
      Gold: 0,
    },
  );

  if (activeTeams.length < 4 || lossCardCount <= 3) {
    teamCardCounts[startingTeam] += 1;
  }

  const totalTeamCards = activeTeams.reduce((sum, team) => sum + teamCardCounts[team], 0);
  const neutralCount = Math.max(0, boardSize - totalTeamCards - lossCardCount);
  const types: CardType[] = [
    ...activeTeams.flatMap((team) => Array.from({ length: teamCardCounts[team] }, () => team)),
    ...Array.from({ length: neutralCount }, () => "Neutral" as const),
    ...Array.from({ length: lossCardCount }, () => "Control" as const),
  ];

  return shuffleList(types);
}

export function createBoardState(settings: RoomSettings = DEFAULT_SETTINGS) {
  const activeTeams = getActiveTeams(settings.teamCount);
  const boardSize = getBoardSize(settings.teamCount);
  const currentTurn = activeTeams[Math.floor(Math.random() * activeTeams.length)];
  const words = shuffleList(getWordsByCategory(settings.wordCategory)).slice(0, boardSize);
  const types = createCardTypes(activeTeams, currentTurn, settings.lossCardCount, boardSize);

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
  const settings = getDefaultRoomSettings();
  const { board, currentTurn } = createBoardState(settings);

  return {
    roomId,
    players: [host],
    gameState: "Lobby",
    settings,
    board,
    clues: [],
    currentTurn,
    turnEndsAt: null,
    winner: null,
  };
}

export function countHiddenCards(board: Card[], team: ActiveTeam) {
  return board.filter((card) => card.type === team && !card.isRevealed).length;
}

function sanitizeTeamCount(value: unknown): TeamCount {
  return value === 3 || value === 4 ? value : 2;
}

function sanitizeLossCardCount(value: unknown): RoomSettings["lossCardCount"] {
  return value === 2 || value === 3 || value === 4 ? value : 1;
}

function sanitizeWordCategory(value: unknown): WordCategory {
  return value === "Cities" || value === "General" ? value : "General";
}

function sanitizeRoundTimerSeconds(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 60;
  }

  return Math.min(600, Math.max(15, Math.round(value)));
}

function sanitizeTurnEndsAt(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
}

function sanitizeClues(value: unknown): Clue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const clue = entry as Partial<Clue>;

      if (
        (clue.team !== "Red" && clue.team !== "Blue" && clue.team !== "Green" && clue.team !== "Gold") ||
        typeof clue.text !== "string" ||
        !clue.text.trim() ||
        typeof clue.count !== "number" ||
        Number.isNaN(clue.count) ||
        typeof clue.createdAt !== "number" ||
        Number.isNaN(clue.createdAt)
      ) {
        return null;
      }

      return {
        team: clue.team,
        text: clue.text.trim().slice(0, 24),
        count: Math.min(9, Math.max(1, Math.round(clue.count))),
        createdAt: Math.max(0, Math.round(clue.createdAt)),
      } satisfies Clue;
    })
    .filter((clue): clue is Clue => clue !== null)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 24);
}

export function normalizeRoom(value: unknown): Room | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const room = value as Room;

  if (!room.roomId || !Array.isArray(room.players) || !Array.isArray(room.board)) {
    return null;
  }

  const settings = room.settings ?? DEFAULT_SETTINGS;
  const teamCount = sanitizeTeamCount(settings.teamCount);
  const normalizedSettings: RoomSettings = {
    teamCount,
    roundTimerSeconds: sanitizeRoundTimerSeconds(settings.roundTimerSeconds),
    lossCardCount: sanitizeLossCardCount(settings.lossCardCount),
    wordCategory: sanitizeWordCategory(settings.wordCategory),
  };
  const activeTeams = getActiveTeams(teamCount);
  const fallbackTurn = activeTeams[0];
  const normalizedTurn = activeTeams.includes(room.currentTurn as ActiveTeam)
    ? (room.currentTurn as ActiveTeam)
    : fallbackTurn;
  const normalizedWinner =
    room.winner && activeTeams.includes(room.winner as ActiveTeam) ? (room.winner as ActiveTeam) : null;

  return {
    ...room,
    settings: normalizedSettings,
    clues: sanitizeClues(room.clues),
    currentTurn: normalizedTurn,
    turnEndsAt: sanitizeTurnEndsAt(room.turnEndsAt),
    winner: normalizedWinner,
  };
}
