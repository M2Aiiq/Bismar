export interface OrganCard {
  id: string;      // "heart" | "brain" | "liver" | "lungs" | "stomach" | "kidneys" | "intestines"
  name: string;    // "القلب" | "الدماغ" | "الكبد" | "الرئتين" | "المعدة" | "الكلى" | "الأمعاء"
  hp: number;      // يبدأ بـ 2، الأقصى 2
  isDead: boolean;
  hasVaccine?: boolean; // لقاح يمنع الاعتلالات
  vaccineTurnsLeft?: number;
  hasOrganicDiet?: boolean; // نظام غذائي عضوي يمنع الاعتلالات العامة
  afflictions?: string[]; // قائمة بالاعتلالات النشطة على العضو
}

export interface ActionCard {
  id: string;
  name: string;
  type: "attack" | "cure" | "instant" | "useless" | "tactical" | "immunity";
  subType:
    | "caffeine" | "brokenHeart" | "cholesterol" | "insomnia" | "brainFreeze" | "forgetfulness"
    | "toxicDose" | "fattyLiver" | "smoke" | "cough" | "spicyFood" | "foodPoisoning"
    | "kidneyStone" | "dehydration" | "appendicitis"
    | "antibiotic" | "vitamin" | "icu" | "surgery"
    | "antibody" | "infection" | "steal" | "sedative" | "swap" | "doubleDraw"
    | "acuteInflammation" | "tumor"
    | "vaccine" | "organicDiet";
  description: string;
  targetOrganId?: string; // العضو المحدد للاعتلال مثل "heart"، أو "any" للهجوم العام
  damage?: number;
  cureAmount?: number;
}

export interface ClashPlayer {
  id: string;
  name: string;
  organs: OrganCard[];
  hand: ActionCard[];
  isZombie: boolean;
  isHost: boolean;
  hasOrganicDiet?: boolean; // حصانة ضد المعدة، الكبد، والكوليسترول
  organicDietTurnsLeft?: number;
  isMuted?: boolean; // مؤشر كتم المايكروفون
}

export interface PendingAction {
  playerId: string;
  card: ActionCard;
  targetPlayerId?: string;
  targetOrganId?: string;
  expiresAt: number;
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
  skipNextTurn?: boolean | null;
  hasReplacedCardThisTurn?: boolean;
  logs?: GameLog[];
  isPaused?: boolean | null;
  pausedTimeRemaining?: number | null;
  skipAllOthers?: boolean | null;
  settings: {
    maxPlayers: number;
    initialHandSize: number;
    turnTimerSeconds: number;
  };
}

export interface GameLog {
  id: string;
  text: string;
  type: "system" | "attack" | "counter" | "cure" | "immunity" | "tactical" | "death" | "swap" | "draw";
}
