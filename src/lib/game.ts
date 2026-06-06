import { getWordsByCategory } from "./words";
import { getActiveTeams, type ActiveTeam } from "./teams";
import type { Card, CardType, Clue, Player, Room, RoomSettings, TeamCount, TurnPhase, WordCategory } from "../types/game";

const DEFAULT_SETTINGS: RoomSettings = {
  teamCount: 2,
  roundTimerSeconds: 60,
  lossCardCount: 1,
  wordCategory: "General",
  extraRows: 0,
};

const RECENT_BOARD_HISTORY_COUNT = 2;

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

function buildRecentWords(words: string[], previousRecentWords: string[], boardSize: number) {
  const maxRecentWords = boardSize * RECENT_BOARD_HISTORY_COUNT;
  const seenWords = new Set<string>();
  const recentWords: string[] = [];

  for (const word of [...words, ...previousRecentWords]) {
    if (seenWords.has(word)) {
      continue;
    }

    seenWords.add(word);
    recentWords.push(word);

    if (recentWords.length >= maxRecentWords) {
      break;
    }
  }

  return recentWords;
}

function pickBoardWords(words: string[], boardSize: number, recentWords: string[]) {
  const shuffledWords = shuffleList(words);
  const recentWordSet = new Set(recentWords);
  const freshWords = shuffledWords.filter((word) => !recentWordSet.has(word));
  const fallbackWords = shuffledWords.filter((word) => recentWordSet.has(word));

  return [...freshWords, ...fallbackWords].slice(0, boardSize);
}

export function getDefaultRoomSettings(): RoomSettings {
  return { ...DEFAULT_SETTINGS };
}

export function getColumnsCount(teamCount: TeamCount) {
  return teamCount === 2 ? 5 : 6;
}

function getBoardSize(teamCount: TeamCount, extraRows: number = 0) {
  const cols = getColumnsCount(teamCount);
  const baseRows = teamCount === 2 ? 5 : 6;
  return cols * (baseRows + extraRows);
}

function createCardTypes(
  activeTeams: ActiveTeam[],
  startingTeam: ActiveTeam,
  lossCardCount: number,
  boardSize: number,
  extraRows: number,
) {
  const baseTeamCards = activeTeams.length === 2 ? 8 : activeTeams.length === 3 ? 6 : 5;
  const teamCardCounts = activeTeams.reduce<Record<ActiveTeam, number>>(
    (counts, team) => ({
      ...counts,
      [team]: baseTeamCards + extraRows,
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

export function createBoardState(settings: RoomSettings = DEFAULT_SETTINGS, previousRecentWords: string[] = []) {
  const activeTeams = getActiveTeams(settings.teamCount);
  const boardSize = getBoardSize(settings.teamCount, settings.extraRows);
  const currentTurn = activeTeams[Math.floor(Math.random() * activeTeams.length)];
  const words = pickBoardWords(getWordsByCategory(settings.wordCategory), boardSize, previousRecentWords);
  const types = createCardTypes(activeTeams, currentTurn, settings.lossCardCount, boardSize, settings.extraRows ?? 0);

  const board: Card[] = words.map((text, index) => ({
    id: index,
    text,
    type: types[index],
    isRevealed: false,
  }));

  return {
    board,
    currentTurn,
    recentWords: buildRecentWords(words, previousRecentWords, boardSize),
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
  const { board, currentTurn, recentWords } = createBoardState(settings);

  return {
    roomId,
    players: [host],
    presence: { [host.id]: true },
    gameState: "Lobby",
    settings,
    board,
    recentWords,
    clues: [],
    eliminatedTeams: [],
    operativeSelections: {},
    isPaused: false,
    pausedRemainingMs: null,
    pendingRevealCardId: null,
    pendingRevealAt: null,
    currentTurn,
    turnPhase: "Clue",
    turnEndsAt: null,
    winner: null,
  };
}

function sanitizePresence(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, boolean>;
  }

  return Object.entries(value).reduce<Record<string, boolean>>((result, [playerId, isOnline]) => {
    if (typeof playerId !== "string" || !playerId || typeof isOnline !== "boolean") {
      return result;
    }

    result[playerId] = isOnline;
    return result;
  }, {});
}

function prunePresence(presence: Record<string, boolean>, players: Player[]) {
  const activePlayerIds = new Set(players.map((player) => player.id));

  return Object.entries(presence).reduce<Record<string, boolean>>((result, [playerId, isOnline]) => {
    if (!activePlayerIds.has(playerId)) {
      return result;
    }

    result[playerId] = isOnline;
    return result;
  }, {});
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

function sanitizeExtraRows(value: unknown): 0 | 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

function sanitizeRecentWords(value: unknown, category: WordCategory) {
  if (!Array.isArray(value)) {
    return [];
  }

  const availableWords = new Set(getWordsByCategory(category));
  const recentWords: string[] = [];

  for (const entry of value) {
    if (typeof entry !== "string" || !availableWords.has(entry) || recentWords.includes(entry)) {
      continue;
    }

    recentWords.push(entry);
  }

  return recentWords;
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

function sanitizePendingRevealCardId(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
}

function sanitizeOperativeSelections(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, number>;
  }

  return Object.entries(value).reduce<Record<string, number>>((result, [playerId, cardId]) => {
    if (typeof playerId !== "string" || !playerId) {
      return result;
    }

    if (typeof cardId !== "number" || Number.isNaN(cardId)) {
      return result;
    }

    result[playerId] = Math.max(0, Math.round(cardId));
    return result;
  }, {});
}

function pruneOperativeSelections(
  selections: Record<string, number>,
  board: Card[],
  players: Player[],
  currentTurn: ActiveTeam,
) {
  const activeCardIds = new Set(board.filter((card) => !card.isRevealed).map((card) => card.id));
  const activeOperativeIds = new Set(
    players
      .filter((player) => player.team === currentTurn && player.role === "Operative")
      .map((player) => player.id),
  );

  return Object.entries(selections).reduce<Record<string, number>>((result, [playerId, cardId]) => {
    if (!activeOperativeIds.has(playerId) || !activeCardIds.has(cardId)) {
      return result;
    }

    result[playerId] = cardId;
    return result;
  }, {});
}

function sanitizePausedRemainingMs(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.round(value));
}

function sanitizeTurnPhase(value: unknown): TurnPhase {
  return value === "Guess" ? "Guess" : "Clue";
}

function sanitizeEliminatedTeams(value: unknown, activeTeams: ActiveTeam[]) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((team): team is ActiveTeam => activeTeams.includes(team as ActiveTeam));
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
    extraRows: sanitizeExtraRows(settings.extraRows),
  };
  const activeTeams = getActiveTeams(teamCount);
  const eliminatedTeams = sanitizeEliminatedTeams((room as Partial<Room>).eliminatedTeams, activeTeams);
  const remainingTeams = activeTeams.filter((team) => !eliminatedTeams.includes(team));
  const fallbackTurn = activeTeams[0];
  const fallbackAliveTurn = remainingTeams[0] ?? fallbackTurn;
  const normalizedTurn =
    activeTeams.includes(room.currentTurn as ActiveTeam) && !eliminatedTeams.includes(room.currentTurn as ActiveTeam)
    ? (room.currentTurn as ActiveTeam)
    : fallbackAliveTurn;
  const normalizedWinner =
    room.winner && activeTeams.includes(room.winner as ActiveTeam) ? (room.winner as ActiveTeam) : null;
  const operativeSelections = pruneOperativeSelections(
    sanitizeOperativeSelections((room as Partial<Room>).operativeSelections),
    room.board,
    room.players,
    normalizedTurn,
  );
  const presence = prunePresence(sanitizePresence((room as Partial<Room>).presence), room.players);

  return {
    ...room,
    presence,
    settings: normalizedSettings,
    recentWords: sanitizeRecentWords((room as Partial<Room>).recentWords, normalizedSettings.wordCategory),
    clues: sanitizeClues(room.clues),
    eliminatedTeams,
    operativeSelections,
    isPaused: Boolean((room as Partial<Room>).isPaused),
    pausedRemainingMs: sanitizePausedRemainingMs((room as Partial<Room>).pausedRemainingMs),
    pendingRevealCardId: sanitizePendingRevealCardId((room as Partial<Room>).pendingRevealCardId),
    pendingRevealAt: sanitizeTurnEndsAt((room as Partial<Room>).pendingRevealAt),
    currentTurn: normalizedTurn,
    turnPhase: sanitizeTurnPhase((room as Partial<Room>).turnPhase),
    turnEndsAt: sanitizeTurnEndsAt(room.turnEndsAt),
    winner: normalizedWinner,
  };
}
