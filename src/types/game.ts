export type Team = "Red" | "Blue" | "Unassigned";
export type Role = "Spymaster" | "Operative";
export type CardType = "Red" | "Blue" | "Neutral" | "Control";
export type GameState = "Lobby" | "Playing" | "GameOver";
export type Winner = "Red" | "Blue" | null;

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
  board: Card[];
  currentTurn: "Red" | "Blue";
  winner: Winner;
}
