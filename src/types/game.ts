export type Team = "Red" | "Blue" | "Green" | "Gold" | "Unassigned";
export type Role = "Spymaster" | "Operative";
export type CardType = "Red" | "Blue" | "Green" | "Gold" | "Neutral" | "Control";
export type GameState = "Lobby" | "Playing" | "GameOver";
export type TeamCount = 2 | 3 | 4;
export type Winner = Exclude<Team, "Unassigned"> | null;

export interface RoomSettings {
  teamCount: TeamCount;
  roundTimerSeconds: number;
  lossCardCount: 1 | 2 | 3 | 4;
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

export interface Room {
  roomId: string;
  players: Player[];
  gameState: GameState;
  settings: RoomSettings;
  board: Card[];
  currentTurn: Exclude<Team, "Unassigned">;
  winner: Winner;
}
