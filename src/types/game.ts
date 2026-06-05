export type Team = "Red" | "Blue" | "Green" | "Gold" | "Unassigned";
export type Role = "Spymaster" | "Operative";
export type CardType = "Red" | "Blue" | "Green" | "Gold" | "Neutral" | "Control";
export type GameState = "Lobby" | "Playing" | "GameOver";
export type TurnPhase = "Clue" | "Guess";
export type TeamCount = 2 | 3 | 4;
export type WordCategory = "General" | "Cities";
export type Winner = Exclude<Team, "Unassigned"> | null;

export interface RoomSettings {
  teamCount: TeamCount;
  roundTimerSeconds: number;
  lossCardCount: 1 | 2 | 3 | 4;
  wordCategory: WordCategory;
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
  gameState: GameState;
  settings: RoomSettings;
  board: Card[];
  clues: Clue[];
  eliminatedTeams: Exclude<Team, "Unassigned">[];
  isPaused: boolean;
  pausedRemainingMs: number | null;
  currentTurn: Exclude<Team, "Unassigned">;
  turnPhase: TurnPhase;
  turnEndsAt: number | null;
  winner: Winner;
}
