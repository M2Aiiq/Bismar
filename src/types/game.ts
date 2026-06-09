export type Team = "Red" | "Blue" | "Green" | "Gold" | "Unassigned";
export type Role = "Spymaster" | "Operative";
export type CardType = "Red" | "Blue" | "Green" | "Gold" | "Neutral" | "Control";
export type GameState = "Lobby" | "Playing" | "GameOver";
export type TurnPhase = "Clue" | "Guess";
export type TeamCount = 2 | 3 | 4;
export type WordCategory = "General" | "Cities" | "Animals";
export type Winner = Exclude<Team, "Unassigned"> | null;
export type Difficulty = "Normal" | "Medium" | "Hard";

export interface RoomSettings {
  teamCount: TeamCount;
  roundTimerSeconds: number;
  lossCardCount: 1 | 2 | 3 | 4;
  wordCategory: WordCategory;
  extraRows: 0 | 1 | 2 | 3;
  difficulty: Difficulty;
}

export interface Player {
  id: string;
  name: string;
  team: Team;
  role: Role;
  isHost: boolean;
}

export interface Card {
  id: number;
  text: string;
  type: CardType;
  isRevealed: boolean;
  isWrongFlip?: boolean;
}

export interface Clue {
  team: Exclude<Team, "Unassigned">;
  text: string;
  count: number;
  createdAt: number;
}

export interface Room {
  roomId: string;
  players: Player[];
  presence: Record<string, boolean>;
  gameState: GameState;
  settings: RoomSettings;
  board: Card[];
  recentWords: string[];
  clues: Clue[];
  eliminatedTeams: Exclude<Team, "Unassigned">[];
  operativeSelections: Record<string, number>;
  isPaused: boolean;
  pausedRemainingMs: number | null;
  pendingRevealCardId: number | null;
  pendingRevealAt: number | null;
  currentTurn: Exclude<Team, "Unassigned">;
  turnPhase: TurnPhase;
  turnEndsAt: number | null;
  winner: Winner;
}

// Blitz Mode (طور البسامير السريعة) types
export type BlitzTeam = "red" | "blue" | "green" | "unassigned";

export interface BlitzCategory {
  category_id: string;
  target_word: string;
  correct_words: string[];
  blacklist: string[];
}

export interface BlitzCard {
  id: number;
  word: string;
  isCorrect: boolean;
  clickedBy: "red" | "blue" | "green" | null;
}

export interface BlitzRoomPlayer {
  id: string;
  name: string;
  team: BlitzTeam;
  isHost: boolean;
}

export interface BlitzRoomSettings {
  roundTimerSeconds: number;
  scoreLimit: number;
  categoryPools: string[];
  teamCount: number;
  difficultyLines?: number;
}

export interface BlitzRoomState {
  roomId: string;
  status: "lobby" | "playing" | "ended";
  currentCategory: string;
  timer: number;
  scores: {
    red: number;
    blue: number;
    green: number;
  };
  grid: BlitzCard[];
  settings: BlitzRoomSettings;
  players: Record<string, BlitzRoomPlayer>;
  presence: Record<string, boolean>;
  winner: "red" | "blue" | "green" | null;
  isPaused?: boolean;
  lastWrongClick?: {
    cardId: number;
    team: BlitzTeam;
    timestamp: number;
  } | null;
  bgTheme?: "default" | "red" | "blue" | "green" | null;
}
