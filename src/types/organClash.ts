export interface OrganCard {
  id: string;      // "heart" | "mind" | "lung" | "liver" | "kidney"
  name: string;    // "القلب" | "العقل" | "الرئة" | "الكبد" | "الكلية"
  hp: number;      // يبدأ بـ 2، الحد الأقصى 2
  isDead: boolean; // true إذا كان hp <= 0
}

export interface ActionCard {
  id: string;
  name: string;
  type: "attack" | "cure" | "instant" | "useless";
  description: string;
  damage?: number;     // لبطاقات الهجوم
  cureAmount?: number; // لبطاقات العلاج
}

export interface ClashPlayer {
  id: string;
  name: string;
  organs: OrganCard[];
  hand: ActionCard[];
  isZombie: boolean;   // true إذا ماتت جميع أعضائه
  isHost: boolean;
}

export interface PendingAction {
  playerId: string;
  card: ActionCard;
  targetPlayerId?: string;
  targetOrganId?: string;
  expiresAt: number;   // وقت انتهاء المهلة للمقاطعة (بالملي ثانية)
}

export interface ClashRoomState {
  roomId: string;
  status: "lobby" | "playing" | "ended";
  players: Record<string, ClashPlayer>;
  presence: Record<string, boolean>;
  drawPile: ActionCard[];
  discardPile: ActionCard[];
  currentTurnPlayerId: string;
  turnPhase: "draw" | "play" | "pass";
  pendingAction?: PendingAction | null;
  winnerId: string | null;
  turnEndsAt?: number | null;
  settings: {
    maxPlayers: number;
    initialHandSize: number;
    turnTimerSeconds: number;
  };
}
