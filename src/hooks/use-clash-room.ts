"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDatabase, ref, onValue, set, runTransaction, onDisconnect } from "firebase/database";
import { getRealtimeDatabase } from "../lib/firebase";
import type { ClashRoomState, ClashPlayer, ActionCard, OrganCard, PendingAction, GameLog } from "../types/organClash";

const SESSION_STORAGE_KEY = "iraqi-codenames-session";
const IMMUNITY_DURATION_TURNS = 2;

interface SessionData {
  playerId: string;
  playerName: string;
}

function readSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as SessionData;
  } catch {
    return null;
  }
}

function saveSession(playerId: string, playerName: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ playerId, playerName })
    );
  }
}

export function createInitialDeck(): ActionCard[] {
  const deck: ActionCard[] = [];

  // A. Afflictions (35 cards)
  const afflictionTypes = [
    { subType: "caffeine", target: "heart", name: "جرعة كافيين زائدة", desc: "ُنقص نقاط حياة (HP) قلب الخصم المستهدف بمقدار 1 HP." },
    { subType: "brokenHeart", target: "heart", name: "قلب مكسور", desc: "يُنقص نقاط حياة (HP) قلب الخصم بمقدار 1 HP." },
    { subType: "cholesterol", target: "heart", name: "انسداد كوليسترول", desc: "يُنقص نقاط حياة (HP) قلب الخصم بمقدار 1 HP." },
    { subType: "insomnia", target: "mind", name: "أرق", desc: "يُنقص نقاط حياة (HP) عقل الخصم بمقدار 1 HP." },
    { subType: "brainFreeze", target: "mind", name: "تجمد الدماغ", desc: "يُنقص نقاط حياة (HP) عقل الخصم بمقدار 1 HP." },
    { subType: "forgetfulness", target: "mind", name: "نوبة نسيان", desc: "يُنقص نقاط حياة (HP) عقل الخصم بمقدار 1 HP." },
    { subType: "toxicDose", target: "liver", name: "جرعة سامة", desc: "يُنقص نقاط حياة (HP) كبد الخصم بمقدار 1 HP." },
    { subType: "fattyLiver", target: "liver", name: "كبد دهني", desc: "يُنقص نقاط حياة (HP) كبد الخصم بمقدار 1 HP." },
    { subType: "smoke", target: "lung", name: "سحابة دخان", desc: "يُنقص نقاط حياة (HP) رئة الخصم بمقدار 1 HP." },
    { subType: "cough", target: "lung", name: "نوبة سعال", desc: "يُنقص نقاط حياة (HP) رئة الخصم بمقدار 1 HP." },
    { subType: "spicyFood", target: "stomach", name: "طعام حار", desc: "يُنقص نقاط حياة (HP) معدة الخصم بمقدار 1 HP." },
    { subType: "foodPoisoning", target: "stomach", name: "تسمم غذائي", desc: "يُنقص نقاط حياة (HP) معدة الخصم بمقدار 1 HP." },
    { subType: "kidneyStone", target: "kidney", name: "حصوة كلى", desc: "يُنقص نقاط حياة (HP) معدة الخصم بمقدار 1 HP." },
    { subType: "dehydration", target: "kidney", name: "جفاف", desc: "يُنقص نقاط حياة (HP) كلية الخصم بمقدار 1 HP." },
    { subType: "appendicitis", target: "intestines", name: "التهاب زائدة", desc: "يُنقص نقاط حياة (HP) الزائدة الدودية للخصم بمقدار 1 HP." }
  ] as const;

  let affIndex = 0;
  afflictionTypes.forEach((aff) => {
    const isThreeCopies = ["caffeine", "brokenHeart", "insomnia", "brainFreeze", "foodPoisoning"].includes(aff.subType);
    const count = isThreeCopies ? 3 : 2;
    for (let k = 0; k < count; k++) {
      deck.push({
        id: `aff_${aff.subType}_${affIndex++}`,
        name: aff.name,
        type: "attack",
        subType: aff.subType,
        description: aff.desc,
        targetOrganId: aff.target,
        damage: 1
      });
    }
  });

  // B. Cures (25 cards)
  const cureTypes = [
    { subType: "antibiotic", name: "مضاد حيوي", desc: "يزيل هجوماً واحداً نشطاً من أي عضو ويعالجه +1 صحة." },
    { subType: "vitamin", name: "جرعة فيتامين", desc: "يضيف +1 صحة لأي عضو (بحد أقصى 2 صحة)." },
    { subType: "icu", name: "عناية مركزة", desc: "يعيد فوراً عضواً بصحة 1 إلى كامل صحته القصوى (2 صحة)." },
    { subType: "surgery", name: "عملية جراحية", desc: "يحيي عضواً مدمراً بالكامل بصحة 1، أو يزيل هجوماً خطيراً (كالورم)." }
  ] as const;

  let cureIndex = 0;
  cureTypes.forEach((cure) => {
    let count = 6;
    if (cure.subType === "antibiotic") count = 8;
    else if (cure.subType === "vitamin") count = 8;
    else if (cure.subType === "icu") count = 5;
    else if (cure.subType === "surgery") count = 4;
    for (let k = 0; k < count; k++) {
      deck.push({
        id: `cure_${cure.subType}_${cureIndex++}`,
        name: cure.name,
        type: "cure",
        subType: cure.subType,
        description: cure.desc,
        cureAmount: 1
      });
    }
  });

  // C. Tactical (20 cards)
  const tacticalTypes = [
    { subType: "antibody", type: "instant" as const, name: "أجسام مضادة", desc: "يلعب فوراً خارج دورك لتقويض وإلغاء أي هجوم قادم." },
    { subType: "infection", type: "tactical" as const, name: "عدوى متحورة", desc: "ينقل هجوماً نشطاً من أحد أعضائك إلى عضو صالح للخصم." },
    { subType: "steal", type: "tactical" as const, name: "سرقة", desc: "يسرق كارت عشوائي واحد من يد الخصم ويضيفه ليدك." },
    { subType: "sedative", type: "tactical" as const, name: "تخدير عام", desc: "يجبر جميع المنافسين على تخطي أدوارهم، ليعود الدور إليك فوراً." },
    { subType: "swap", type: "tactical" as const, name: "تبادل الأيدي", desc: "يجبر كلا اللاعبين على تبادل كامل أيديهما." },
    { subType: "doubleDraw", type: "tactical" as const, name: "السحب المزدوج", desc: "يسمح لك بسحب كارتين إضافيين من كومة السحب خلال دورك." }
  ] as const;

  let tacIndex = 0;
  tacticalTypes.forEach((tac) => {
    let count = 3;
    if (tac.subType === "antibody") count = 5;
    else if (tac.subType === "doubleDraw") count = 4;
    else if (tac.subType === "steal") count = 3;
    else if (tac.subType === "infection") count = 3;
    else if (tac.subType === "sedative") count = 3;
    else if (tac.subType === "swap") count = 2;
    for (let k = 0; k < count; k++) {
      deck.push({
        id: `tac_${tac.subType}_${tacIndex++}`,
        name: tac.name,
        type: tac.type,
        subType: tac.subType,
        description: tac.desc
      });
    }
  });

  // D. General Attack (12 cards)
  const generalAttackTypes = [
    { subType: "acuteInflammation", name: "التهاب حاد", desc: "يستهدف أي عضو ويسبب -1 صحة، مع إبطال وتدمير اللقاح أو النظام الغذائي عليه بالكامل دون إمكانية مقاطعة الهجوم." },
    { subType: "tumor", name: "ورم", desc: "يستهدف أي عضو ويسبب -2 صحة فوراً، مع إبطال وتدمير اللقاح أو النظام الغذائي عليه بالكامل دون إمكانية مقاطعة الهجوم." }
  ] as const;

  let genIndex = 0;
  generalAttackTypes.forEach((gen) => {
    const count = gen.subType === "acuteInflammation" ? 8 : 4;
    for (let k = 0; k < count; k++) {
      deck.push({
        id: `gen_${gen.subType}_${genIndex++}`,
        name: gen.name,
        type: "attack",
        subType: gen.subType,
        description: gen.desc,
        targetOrganId: "any",
        damage: gen.subType === "tumor" ? 2 : 1
      });
    }
  });

  // E. Immunity (8 cards)
  const immunityTypes = [
    { subType: "vaccine", name: "لقاح", desc: "يرتبط بعضو محدد بشكل غير مرئي. إذا تم استهدافه بهجوم، ينعكس الهجوم بالكامل على المهاجم." },
    { subType: "organicDiet", name: "نظام غذائي", desc: "يحمي العضو المستهدف من أي هجوم. تنتهي الحماية عند عودة الدور إليك أو عند استهداف العضو بورم أو التهاب حاد." }
  ] as const;

  let immIndex = 0;
  immunityTypes.forEach((imm) => {
    for (let k = 0; k < 4; k++) {
      deck.push({
        id: `imm_${imm.subType}_${immIndex++}`,
        name: imm.name,
        type: "immunity",
        subType: imm.subType,
        description: imm.desc
      });
    }
  });

  return deck;
}

export function createInitialOrgans(): OrganCard[] {
  return [
    { id: "heart", name: "القلب", hp: 2, isDead: false },
    { id: "mind", name: "الدماغ", hp: 2, isDead: false },
    { id: "liver", name: "الكبد", hp: 2, isDead: false },
    { id: "lung", name: "الرئتين", hp: 2, isDead: false },
    { id: "stomach", name: "المعدة", hp: 2, isDead: false },
    { id: "kidney", name: "الكلى", hp: 2, isDead: false },
    { id: "intestines", name: "الأمعاء", hp: 2, isDead: false },
  ];
}

function shuffleList<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pullCardByType(deck: ActionCard[], condition: (c: ActionCard) => boolean): ActionCard | null {
  const index = deck.findIndex(condition);
  if (index !== -1) {
    return deck.splice(index, 1)[0];
  }
  return null;
}


function addRoomLog(currentRoom: ClashRoomState, text: string, type: GameLog["type"] = "system") {
  if (!currentRoom.logs) currentRoom.logs = [];
  currentRoom.logs.push({
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    text,
    type,
  });
  if (currentRoom.logs.length > 5) {
    currentRoom.logs.shift();
  }
}

function clearVaccineEffect(targetOrgan: OrganCard) {
  targetOrgan.hasVaccine = false;
  targetOrgan.vaccineTurnsLeft = 0;
}

function clearOrganicDietEffect(targetOrgan: OrganCard) {
  targetOrgan.hasOrganicDiet = false;
}

function setVaccineEffect(targetOrgan: OrganCard) {
  targetOrgan.hasVaccine = true;
  targetOrgan.vaccineTurnsLeft = IMMUNITY_DURATION_TURNS;
}

function setOrganicDietEffect(targetOrgan: OrganCard) {
  targetOrgan.hasOrganicDiet = true;
}

function normalizeTemporaryEffects(currentRoom: ClashRoomState) {
  Object.values(currentRoom.players).forEach((player) => {
    player.organs.forEach((organ) => {
      if (organ.hasVaccine && typeof organ.vaccineTurnsLeft !== "number") {
        organ.vaccineTurnsLeft = IMMUNITY_DURATION_TURNS;
      }
    });
  });
}

function expireTemporaryEffects(currentRoom: ClashRoomState) {
  Object.values(currentRoom.players).forEach((player) => {
    player.organs.forEach((organ) => {
      if (organ.hasVaccine) {
        const nextTurnsLeft = (organ.vaccineTurnsLeft ?? IMMUNITY_DURATION_TURNS) - 1;

        if (nextTurnsLeft <= 0) {
          clearVaccineEffect(organ);
        } else {
          organ.vaccineTurnsLeft = nextTurnsLeft;
        }
      }
    });
  });
}

function transitionToNextTurn(currentRoom: ClashRoomState) {
  try {
    normalizeTemporaryEffects(currentRoom);
    const playerIds = Object.keys(currentRoom.players);
    const currentIndex = playerIds.indexOf(currentRoom.currentTurnPlayerId);
    if (currentIndex === -1) return;

    let nextPlayerId = currentRoom.currentTurnPlayerId;
    let nextIndex = currentIndex;

    if (currentRoom.skipAllOthers) {
      currentRoom.skipAllOthers = false;
      // nextPlayerId remains currentRoom.currentTurnPlayerId (returns to same player)
    } else {
      nextIndex = (currentIndex + 1) % playerIds.length;
      nextPlayerId = playerIds[nextIndex];

      // Antibody/Sedative turn skip trigger
      if (currentRoom.skipNextTurn) {
        currentRoom.skipNextTurn = false;
        nextIndex = (nextIndex + 1) % playerIds.length;
        nextPlayerId = playerIds[nextIndex];
      }
    }

    currentRoom.currentTurnPlayerId = nextPlayerId;
    currentRoom.turnPhase = "draw";
    currentRoom.pendingAction = null;
    currentRoom.hasReplacedCardThisTurn = false;
    expireTemporaryEffects(currentRoom);

    const timerSeconds = currentRoom.settings?.turnTimerSeconds || 30;
    currentRoom.turnEndsAt = Date.now() + timerSeconds * 1000;

    const nextPlayer = currentRoom.players[nextPlayerId];
    if (nextPlayer) {
      if (nextPlayer.isZombie) {
        let drawPile = currentRoom.drawPile || [];
        let discardPile = currentRoom.discardPile || [];
        if (drawPile.length === 0 && discardPile.length > 0) {
          drawPile = shuffleList(discardPile);
          currentRoom.discardPile = [];
        }

        const zombieAttack = drawPile.pop() || {
          id: `zombie_att_${Date.now()}`,
          name: "التهاب حاد",
          type: "attack" as const,
          subType: "acuteInflammation" as const,
          description: "تسبب 1 ضرر لعضو عشوائي للخصم",
          damage: 1,
        };

        const liveOpponents = playerIds.filter((pid) => pid !== nextPlayerId && !currentRoom.players[pid].isZombie);
        if (liveOpponents.length > 0) {
          const randomOpponentId = liveOpponents[Math.floor(Math.random() * liveOpponents.length)];
          const randomOpponent = currentRoom.players[randomOpponentId];
          const liveOrgans = randomOpponent.organs.filter((o) => !o.isDead);
          if (liveOrgans.length > 0) {
            const randomOrgan = liveOrgans[Math.floor(Math.random() * liveOrgans.length)];

            if (!randomOrgan.hasVaccine) {
              randomOrgan.hp = Math.max(0, randomOrgan.hp - 1);
              if (randomOrgan.hp <= 0) {
                randomOrgan.isDead = true;
                randomOrgan.afflictions = [];
                clearVaccineEffect(randomOrgan);
              }

              if (randomOpponent.organs.every((o) => o.isDead)) {
                randomOpponent.isZombie = true;
              }
            }
          }
        }

        if (!currentRoom.discardPile) currentRoom.discardPile = [];
        currentRoom.discardPile.push(zombieAttack);
        currentRoom.drawPile = drawPile;

        let nextNextIndex = (nextIndex + 1) % playerIds.length;
        currentRoom.currentTurnPlayerId = playerIds[nextNextIndex];
        currentRoom.turnPhase = "draw";

        currentRoom.turnEndsAt = Date.now() + timerSeconds * 1000;

        const alivePlayers = playerIds.filter((pid) => !currentRoom.players[pid].isZombie);
        if (alivePlayers.length === 1) {
          currentRoom.status = "ended";
          currentRoom.winnerId = alivePlayers[0];
        }
      } else {
        // Clear organic diet from all organs of the next player starting their turn
        nextPlayer.organs.forEach((organ) => {
          organ.hasOrganicDiet = false;
        });
      }
    }
  } catch (err) {
    console.error("Error in transitionToNextTurn:", err);
  }
}

export function useClashRoom(roomId: string) {
  const router = useRouter();
  const [room, setRoom] = useState<ClashRoomState | null>(null);
  const roomRef = useRef<ClashRoomState | null>(null);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLeavingRef = useRef(false);

  useEffect(() => {
    const session = readSession();
    const nextPlayerId = session?.playerId ?? crypto.randomUUID();
    const nextPlayerName = session?.playerName ?? "";

    setPlayerId(nextPlayerId);
    setPlayerName(nextPlayerName);
    saveSession(nextPlayerId, nextPlayerName);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || !roomId) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomRef = ref(database, `clashRooms/${roomId}`);

    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setRoom(null);
          if (!isLeavingRef.current) {
            setError("هذه الغرفة غير موجودة أو تم إغلاقها.");
          }
          return;
        }

        setError(null);
        const data = snapshot.val() as ClashRoomState;

        if (!data.players) data.players = {};
        if (!data.presence) data.presence = {};
        if (!data.drawPile) data.drawPile = [];
        if (!data.discardPile) data.discardPile = [];

        Object.keys(data.players).forEach((pid) => {
          if (!data.players[pid].hand) {
            data.players[pid].hand = [];
          }
          if (!data.players[pid].organs) {
            data.players[pid].organs = [];
          }
        });

        setRoom(data);
      },
      (err) => {
        console.error("Firebase connection error:", err);
        setError("Failing sync.");
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isReady, roomId]);

  useEffect(() => {
    if (!isReady || !roomId || !playerId) return;

    const database = getRealtimeDatabase() || getDatabase();
    const presenceRef = ref(database, `clashRooms/${roomId}/presence/${playerId}`);
    const connectedRef = ref(database, ".info/connected");

    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        void onDisconnect(presenceRef)
          .set(false)
          .then(() => set(presenceRef, true));
      }
    });

    return () => {
      unsubscribeConnected();
      void set(presenceRef, false);
    };
  }, [isReady, roomId, playerId]);

  const joinClashRoom = useCallback(
    async (name: string) => {
      if (!roomId || !playerId) return;

      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        throw new Error("الاسم يجب أن يكون حرفين على الأقل.");
      }

      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `clashRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
        if (!currentRoom) return currentRoom;

        if (!currentRoom.players) currentRoom.players = {};
        if (!currentRoom.presence) currentRoom.presence = {};

        const isHost = Object.keys(currentRoom.players).length === 0;

        currentRoom.players[playerId] = {
          id: playerId,
          name: trimmedName,
          organs: [],
          hand: [],
          isZombie: false,
          isHost,
        };
        currentRoom.presence[playerId] = true;

        return currentRoom;
      });
    },
    [roomId, playerId]
  );

  const leaveClashRoom = useCallback(async () => {
    if (!roomId || !playerId) return;

    isLeavingRef.current = true;
    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    try {
      await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
        if (!currentRoom) return currentRoom;

        if (currentRoom.players) {
          delete currentRoom.players[playerId];
        }
        if (currentRoom.presence) {
          delete currentRoom.presence[playerId];
        }

        if (!currentRoom.players || Object.keys(currentRoom.players).length === 0) {
          return null;
        }

        const playerIds = Object.keys(currentRoom.players);
        const hasHost = playerIds.some((pid) => currentRoom.players[pid].isHost);
        if (!hasHost && playerIds.length > 0) {
          currentRoom.players[playerIds[0]].isHost = true;
        }

        return currentRoom;
      });

      router.replace("/");
    } catch (err) {
      console.error("Failed to leave Organ Clash room:", err);
      router.replace("/");
    }
  }, [roomId, playerId, router]);

  const kickClashPlayer = useCallback(
    async (targetPlayerId: string) => {
      if (!roomId || !playerId) return;

      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `clashRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
        if (!currentRoom) return currentRoom;

        if (currentRoom.players) delete currentRoom.players[targetPlayerId];
        if (currentRoom.presence) delete currentRoom.presence[targetPlayerId];

        return currentRoom;
      });
    },
    [roomId, playerId]
  );

  const startClashGame = useCallback(
    async (maxPlayers: number, initialHandSize: number, turnTimerSeconds?: number) => {
      const currentRoom = roomRef.current;
      if (!roomId || !currentRoom) return;

      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `clashRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
        if (!currentRoom) return currentRoom;

        try {
          const playerIds = Object.keys(currentRoom.players || {});
          if (playerIds.length < 2) {
            throw new Error("تحتاج إلى لاعبين على الأقل لبدء اللعبة.");
          }

          let deck = shuffleList(createInitialDeck());

          playerIds.forEach((pid) => {
            const playerHand: ActionCard[] = [];
            if (initialHandSize === 5) {
              // 1. Pull exactly 1 Cure card (25% / 1 card minimum)
              const cure = pullCardByType(deck, (c) => c.type === "cure");
              if (cure) playerHand.push(cure);

              // 2. Pull exactly 1 Tactical card (20% / 1 card)
              const tac = pullCardByType(deck, (c) => c.type === "tactical" || c.type === "instant");
              if (tac) playerHand.push(tac);

              // 3. Pull exactly 2 Affliction cards (35% / 1-2 cards)
              const aff1 = pullCardByType(deck, (c) => c.type === "attack" && c.targetOrganId !== "any");
              if (aff1) playerHand.push(aff1);
              const aff2 = pullCardByType(deck, (c) => c.type === "attack" && c.targetOrganId !== "any");
              if (aff2) playerHand.push(aff2);

              // 4. Pull exactly 1 General Attack or Immunity card (20% / 1 card exchangeable)
              const genOrImm = pullCardByType(deck, (c) => (c.type === "attack" && c.targetOrganId === "any") || c.type === "immunity");
              if (genOrImm) playerHand.push(genOrImm);

              // 5. Fill remaining if anything was missing
              while (playerHand.length < 5 && deck.length > 0) {
                playerHand.push(deck.pop()!);
              }

              // Shuffling the hand so the user doesn't see them in a fixed category order
              currentRoom.players[pid].hand = shuffleList(playerHand);
            } else {
              // Fallback for custom hand sizes
              for (let i = 0; i < initialHandSize; i++) {
                if (deck.length > 0) {
                  playerHand.push(deck.pop()!);
                }
              }
              currentRoom.players[pid].hand = playerHand;
            }

            currentRoom.players[pid].organs = createInitialOrgans();
            currentRoom.players[pid].isZombie = false;
          });

          currentRoom.drawPile = deck;
          currentRoom.discardPile = [];
          currentRoom.status = "playing";
          currentRoom.winnerId = null;
          currentRoom.pendingAction = null;
          currentRoom.skipNextTurn = false;
          currentRoom.isPaused = false;
          currentRoom.pausedTimeRemaining = null;

          const hostId = playerIds.find((pid) => currentRoom.players[pid].isHost) || playerIds[0];
          currentRoom.currentTurnPlayerId = hostId;
          currentRoom.turnPhase = "draw";

          const timerVal = turnTimerSeconds || 30;
          currentRoom.turnEndsAt = Date.now() + timerVal * 1000;

          currentRoom.settings = {
            maxPlayers,
            initialHandSize,
            turnTimerSeconds: timerVal,
          };
          currentRoom.logs = [{ id: "start", text: "بدأت المعركة الآن!", type: "system" }];
        } catch (err) {
          console.error("Error inside startClashGame Transaction:", err);
        }

        return currentRoom;
      });
    },
    [roomId]
  );

  const drawCardAuto = useCallback(async () => {
    const currentRoom = roomRef.current;
    if (!roomId || !currentRoom || currentRoom.status !== "playing" || currentRoom.turnPhase !== "draw") return;
    if (currentRoom.currentTurnPlayerId !== playerId) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
      if (!currentRoom || currentRoom.status !== "playing" || currentRoom.turnPhase !== "draw") return currentRoom;

      try {
        const activePid = currentRoom.currentTurnPlayerId;
        const player = currentRoom.players[activePid];
        if (!player) return currentRoom;

        const limit = currentRoom.settings?.initialHandSize || 5;
        const cardsToDraw = Math.max(0, limit - (player.hand || []).length);

        if (cardsToDraw > 0) {
          let drawPile = currentRoom.drawPile || [];
          let discardPile = currentRoom.discardPile || [];
          if (!player.hand) player.hand = [];

          for (let i = 0; i < cardsToDraw; i++) {
            if (drawPile.length === 0) {
              if (discardPile.length > 0) {
                drawPile = shuffleList(discardPile);
                currentRoom.discardPile = [];
              } else {
                break;
              }
            }
            const drawnCard = drawPile.pop()!;
            player.hand.push(drawnCard);
          }
          currentRoom.drawPile = drawPile;
          currentRoom.discardPile = discardPile;
        }

        currentRoom.turnPhase = "play";
      } catch (err) {
        console.error("Error drawing card:", err);
      }

      return currentRoom;
    });
  }, [roomId, playerId]);

  const playActionCard = useCallback(
    async (cardId: string, targetPlayerId?: string, targetOrganId?: string) => {
      const currentRoom = roomRef.current;
      if (!roomId || !currentRoom || currentRoom.status !== "playing" || currentRoom.turnPhase !== "play") return;
      if (currentRoom.currentTurnPlayerId !== playerId) return;
      if (currentRoom.pendingAction) return;

      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `clashRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
        if (!currentRoom || currentRoom.status !== "playing" || currentRoom.turnPhase !== "play") return currentRoom;
        if (currentRoom.pendingAction) return currentRoom;

        try {
          const player = currentRoom.players[playerId];
          if (!player) return currentRoom;

          const cardIndex = player.hand.findIndex((c) => c.id === cardId);
          if (cardIndex === -1) return currentRoom;

          const card = player.hand[cardIndex];

          // 1. كروت الهجوم والاعتلال والعدوى فقط تذهب لـ pendingAction للفرصة المقاطعة
          if (card.type === "attack" || card.subType === "infection") {
            player.hand.splice(cardIndex, 1);

            const targetPlayer = targetPlayerId ? currentRoom.players[targetPlayerId] : null;
            const targetOrgan = (targetPlayer && targetOrganId) ? targetPlayer.organs.find(o => o.id === targetOrganId) : null;

            const isGeneralAttack = ["acuteInflammation", "tumor"].includes(card.subType);

            // فحص: هل يملك اللاعب المستهدف كارت أجسام مضادة أو عدوى متحورة؟ (فقط في حال لم يكن هجوماً عاماً)
            const targetHasCounter = (!isGeneralAttack && targetPlayerId)
              ? currentRoom.players[targetPlayerId]?.hand?.some(
                  (c) => c.subType === "antibody" || c.subType === "infection"
                )
              : false;

            if (targetHasCounter) {
              // يوجد كارت دفاعي لدى المستهدف → أنشئ حدثاً معلقاً لمنح فرصة المقاطعة
              currentRoom.pendingAction = {
                playerId,
                card,
                targetPlayerId,
                targetOrganId,
                expiresAt: Date.now() + 5000,
              };
              if (targetPlayer && targetOrgan) {
                addRoomLog(currentRoom, `${player.name}: ${card.name} على ${targetOrgan.name} (${targetPlayer.name})`, "attack");
              } else {
                addRoomLog(currentRoom, `${player.name}: لعب ${card.name}`, "attack");
              }
            } else {
              // لا يوجد كارت دفاعي → نفذ الهجوم مباشرة
              currentRoom.pendingAction = {
                playerId,
                card,
                targetPlayerId,
                targetOrganId,
                expiresAt: Date.now(),
              };
              if (targetPlayer && targetOrgan) {
                addRoomLog(currentRoom, `${player.name}: ${card.name} على ${targetOrgan.name} (${targetPlayer.name})`, "attack");
              } else {
                addRoomLog(currentRoom, `${player.name}: لعب ${card.name}`, "attack");
              }
            }
          }
          // 2. الكروت التكتيكية والعلاجية والحصانة والخردة تنفذ فوراً دون انتظار وتمرر الدور
          else {
            player.hand.splice(cardIndex, 1);

            // أ. العلاجات
            if (card.type === "cure" && targetOrganId) {
              const targetPlayer = currentRoom.players[targetPlayerId || playerId];
              const targetOrgan = targetPlayer?.organs?.find(o => o.id === targetOrganId);
              if (targetOrgan) {
                if (card.subType === "antibiotic") {
                  if (!targetOrgan.isDead) {
                    if (targetOrgan.afflictions && targetOrgan.afflictions.length > 0) {
                      targetOrgan.afflictions.pop();
                    }
                    targetOrgan.hp = Math.min(2, targetOrgan.hp + 1);
                  }
                } else if (card.subType === "vitamin") {
                  if (!targetOrgan.isDead) {
                    targetOrgan.hp = Math.min(2, targetOrgan.hp + 1);
                  }
                } else if (card.subType === "icu") {
                  if (!targetOrgan.isDead) {
                    targetOrgan.hp = 2;
                  }
                } else if (card.subType === "surgery") {
                  targetOrgan.isDead = false;
                  targetOrgan.hp = 2;
                  targetOrgan.afflictions = [];
                  clearVaccineEffect(targetOrgan);
                  if (targetOrgan.hasOrganicDiet) clearOrganicDietEffect(targetOrgan);
                  if (targetPlayer) {
                    targetPlayer.isZombie = targetPlayer.organs.every(o => o.isDead);
                  }
                }
              }
            }
            // ب. الحصانة
            else if (card.type === "immunity") {
              if (card.subType === "vaccine" && targetOrganId) {
                const targetOrgan = player.organs.find(o => o.id === targetOrganId);
                if (targetOrgan && !targetOrgan.isDead) {
                  setVaccineEffect(targetOrgan);
                  targetOrgan.afflictions = [];
                }
              } else if (card.subType === "organicDiet" && targetOrganId) {
                const targetOrgan = player.organs.find(o => o.id === targetOrganId);
                if (targetOrgan && !targetOrgan.isDead) {
                  setOrganicDietEffect(targetOrgan);
                }
              }
            }
            // ج. التكتيكات
            else if (card.type === "tactical") {
              if (card.subType === "steal" && targetPlayerId) {
                const targetPlayer = currentRoom.players[targetPlayerId];
                if (targetPlayer && targetPlayer.hand && targetPlayer.hand.length > 0) {
                  const randIndex = Math.floor(Math.random() * targetPlayer.hand.length);
                  const stolen = targetPlayer.hand.splice(randIndex, 1)[0];
                  player.hand.push(stolen);
                }
              } else if (card.subType === "swap" && targetPlayerId) {
                const targetPlayer = currentRoom.players[targetPlayerId];
                if (targetPlayer) {
                  const temp = player.hand || [];
                  player.hand = targetPlayer.hand || [];
                  targetPlayer.hand = temp;
                }
              } else if (card.subType === "sedative") {
                currentRoom.skipAllOthers = true;
              } else if (card.subType === "doubleDraw") {
                let drawPile = currentRoom.drawPile || [];
                let discardPile = currentRoom.discardPile || [];
                for (let i = 0; i < 2; i++) {
                  if (drawPile.length === 0 && discardPile.length > 0) {
                    drawPile = shuffleList(discardPile);
                    currentRoom.discardPile = [];
                  }
                  if (drawPile.length > 0) {
                    const drawn = drawPile.pop()!;
                    player.hand.push(drawn);
                  }
                }
                currentRoom.drawPile = drawPile;
                currentRoom.discardPile = discardPile;
              }
            }

            // تسجيل التنبيه
            const targetPlayer = targetPlayerId ? currentRoom.players[targetPlayerId] : null;
            const targetOrgan = (targetPlayer && targetOrganId) ? targetPlayer.organs.find(o => o.id === targetOrganId) : null;
            if (card.type === "cure" && targetOrgan) {
              addRoomLog(currentRoom, `${player.name}: علاج ${targetOrgan.name} بـ ${card.name}`, "cure");
            } else if (card.type === "immunity" && targetOrgan) {
              addRoomLog(currentRoom, `${player.name}: حصّن عضواً بـ ${card.name}`, "immunity");
            } else if (card.subType === "steal" && targetPlayer) {
              addRoomLog(currentRoom, `${player.name}: سرق كارت من ${targetPlayer.name}`, "tactical");
            } else if (card.subType === "swap" && targetPlayer) {
              addRoomLog(currentRoom, `${player.name}: تبادل الأيدي مع ${targetPlayer.name}`, "swap");
            } else {
              addRoomLog(currentRoom, `${player.name}: لعب كارت ${card.name}`, "tactical");
            }

            // إضافته للكومة المستهلكة
            if (!currentRoom.discardPile) currentRoom.discardPile = [];
            currentRoom.discardPile.push(card);

            // فحص حالة الفوز
            const playerIds = Object.keys(currentRoom.players);
            const alivePlayers = playerIds.filter((pid) => !currentRoom.players[pid].isZombie);
            if (alivePlayers.length === 1) {
              currentRoom.status = "ended";
              currentRoom.winnerId = alivePlayers[0];
            }

            if (currentRoom.status === "playing") {
              transitionToNextTurn(currentRoom);
            }
          }
        } catch (err) {
          console.error("Error playing action card:", err);
        }

        return currentRoom;
      });
    },
    [roomId, playerId]
  );

  const commitPendingAction = useCallback(async () => {
    const currentRoom = roomRef.current;
    if (!roomId || !currentRoom || !currentRoom.pendingAction) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
      if (!currentRoom || !currentRoom.pendingAction) return currentRoom;

      try {
        const pending = currentRoom.pendingAction;
        const card = pending.card;
        const targetPid = pending.targetPlayerId;
        const targetOid = pending.targetOrganId;

        const activePlayer = currentRoom.players[pending.playerId];

        let resolvedTargetPid = targetPid;
        if (!resolvedTargetPid && activePlayer) {
          const opponents = Object.keys(currentRoom.players).filter((pid) => pid !== pending.playerId);
          if (opponents.length === 1) {
            resolvedTargetPid = opponents[0];
          }
        }

        const targetPlayer = resolvedTargetPid ? currentRoom.players[resolvedTargetPid] : null;
        const targetOrgan = (targetPlayer && targetOid) ? targetPlayer.organs.find((o) => o.id === targetOid) : null;

        // Core Combat Rules
        if (card.type === "attack" && targetPlayer && targetOrgan) {
          const isGeneralAttack = ["acuteInflammation", "tumor"].includes(card.subType);

          if (isGeneralAttack) {
            // General attacks nullify/remove Vaccine and Organic Diet immediately and deal damage directly!
            if (targetOrgan.hasVaccine) {
              clearVaccineEffect(targetOrgan);
              addRoomLog(currentRoom, `⚡ أبطل ${card.name} تأثير اللقاح على ${targetOrgan.name} لدى ${targetPlayer.name}!`, "system");
            }
            if (targetOrgan.hasOrganicDiet) {
              clearOrganicDietEffect(targetOrgan);
              addRoomLog(currentRoom, `⚡ أبطل ${card.name} تأثير النظام الغذائي على ${targetOrgan.name} لدى ${targetPlayer.name}!`, "system");
            }

            const dmg = card.damage ?? 1;
            targetOrgan.hp = Math.max(0, targetOrgan.hp - dmg);
            if (targetOrgan.hp <= 0) {
              targetOrgan.isDead = true;
              targetOrgan.afflictions = [];
              clearVaccineEffect(targetOrgan);
              if (targetOrgan.hasOrganicDiet) clearOrganicDietEffect(targetOrgan);
              addRoomLog(currentRoom, `💀 مات عضو ${targetOrgan.name} لدى ${targetPlayer.name}!`, "death");
            } else {
              addRoomLog(currentRoom, `💥 أصيب ${targetOrgan.name} (${targetPlayer.name}) بـ ${card.name}`, "attack");
            }

            const allDead = targetPlayer.organs.every((o) => o.isDead);
            if (allDead) {
              targetPlayer.isZombie = true;
            }
          }
          // Check Vaccine reflection for normal attacks
          else if (targetOrgan.hasVaccine === true) {
            const attacker = currentRoom.players[pending.playerId];
            const attackerOrgan = attacker?.organs?.find(o => o.id === targetOrgan.id);
            if (attackerOrgan && !attackerOrgan.isDead) {
              const dmg = card.damage ?? 1;
              attackerOrgan.hp = Math.max(0, attackerOrgan.hp - dmg);
              if (attackerOrgan.hp <= 0) {
                attackerOrgan.isDead = true;
                attackerOrgan.afflictions = [];
                clearVaccineEffect(attackerOrgan);
                if (attackerOrgan.hasOrganicDiet) clearOrganicDietEffect(attackerOrgan);
                addRoomLog(currentRoom, `🔁 انعكس الهجوم! مات عضو ${attackerOrgan.name} لدى المهاجم ${attacker.name}!`, "death");
              } else {
                if (card.subType !== "acuteInflammation") {
                  attackerOrgan.afflictions = [...(attackerOrgan.afflictions || []), card.subType];
                }
                addRoomLog(currentRoom, `🔁 انعكس الهجوم بـ ${card.name} على ${attackerOrgan.name} للمهاجم ${attacker.name}`, "attack");
              }

              if (attacker.organs.every(o => o.isDead)) {
                attacker.isZombie = true;
              }
            }
            clearVaccineEffect(targetOrgan);
          }
          // Organic Diet protection block for normal attacks
          else if (targetOrgan.hasOrganicDiet === true) {
            targetOrgan.hasOrganicDiet = false;
            addRoomLog(currentRoom, `🥦 حمى النظام الغذائي العضو ${targetOrgan.name} لـ ${targetPlayer.name} من ${card.name} وانتهى مفعوله!`, "immunity");
          }
          // Normal Attack resolution
          else {
            const isLegitimateTarget =
              card.targetOrganId === "any" || card.targetOrganId === targetOrgan.id;

            if (isLegitimateTarget && !targetOrgan.isDead) {
              const dmg = card.damage ?? 1;
              targetOrgan.hp = Math.max(0, targetOrgan.hp - dmg);
              if (targetOrgan.hp <= 0) {
                targetOrgan.isDead = true;
                targetOrgan.afflictions = [];
                clearVaccineEffect(targetOrgan);
                addRoomLog(currentRoom, `💀 مات عضو ${targetOrgan.name} لدى ${targetPlayer.name}!`, "death");
              } else {
                if (card.subType !== "acuteInflammation") {
                  targetOrgan.afflictions = [...(targetOrgan.afflictions || []), card.subType];
                }
                addRoomLog(currentRoom, `💥 أصيب ${targetOrgan.name} (${targetPlayer.name}) بـ ${card.name}`, "attack");
              }

              const allDead = targetPlayer.organs.every((o) => o.isDead);
              if (allDead) {
                targetPlayer.isZombie = true;
              }
            }
          }
        }
        // Cures Rules
        else if (card.type === "cure" && targetPlayer && targetOrgan) {
          if (card.subType === "antibiotic") {
            if (!targetOrgan.isDead) {
              if (targetOrgan.afflictions && targetOrgan.afflictions.length > 0) {
                targetOrgan.afflictions.pop();
              }
              targetOrgan.hp = Math.min(2, targetOrgan.hp + 1);
            }
          } else if (card.subType === "vitamin") {
            if (!targetOrgan.isDead) {
              targetOrgan.hp = Math.min(2, targetOrgan.hp + 1);
            }
          } else if (card.subType === "icu") {
            if (!targetOrgan.isDead) {
              targetOrgan.hp = 2;
            }
          } else if (card.subType === "surgery") {
            targetOrgan.isDead = false;
            targetOrgan.hp = 2;
            targetOrgan.afflictions = [];
            clearVaccineEffect(targetOrgan);
            if (targetOrgan.hasOrganicDiet) clearOrganicDietEffect(targetOrgan);
            targetPlayer.isZombie = targetPlayer.organs.every((o) => o.isDead);
          }
        }
        // Tactical Rules
        else if (card.type === "tactical" && activePlayer) {
          if (card.subType === "infection" && targetPlayer && targetOrgan && !targetOrgan.isDead) {
            // Find active affliction from own organs
            let extractedAffliction: string | undefined;
            for (const organ of activePlayer.organs) {
              if (organ.afflictions && organ.afflictions.length > 0) {
                extractedAffliction = organ.afflictions.pop();
                break;
              }
            }

            if (extractedAffliction) {
              if (targetOrgan.hasVaccine) {
                clearVaccineEffect(targetOrgan);
                addRoomLog(currentRoom, `🛡️ حمى اللقاح العضو ${targetOrgan.name} لـ ${targetPlayer.name} من العدوى وانتهى مفعوله!`, "immunity");
              } else if (targetOrgan.hasOrganicDiet) {
                targetOrgan.hasOrganicDiet = false;
                addRoomLog(currentRoom, `🥦 حمى النظام الغذائي العضو ${targetOrgan.name} لـ ${targetPlayer.name} من العدوى وانتهى مفعوله!`, "immunity");
              } else {
                targetOrgan.hp = Math.max(0, targetOrgan.hp - 1);
                if (targetOrgan.hp <= 0) {
                  targetOrgan.isDead = true;
                  targetOrgan.afflictions = [];
                  clearVaccineEffect(targetOrgan);
                } else {
                  targetOrgan.afflictions = [...(targetOrgan.afflictions || []), extractedAffliction];
                }

                if (targetPlayer.organs.every((o) => o.isDead)) {
                  targetPlayer.isZombie = true;
                }
              }
            }
          } else if (card.subType === "steal" && targetPlayer && targetPlayer.hand && targetPlayer.hand.length > 0) {
            const randIndex = Math.floor(Math.random() * targetPlayer.hand.length);
            const stolen = targetPlayer.hand.splice(randIndex, 1)[0];
            if (!activePlayer.hand) activePlayer.hand = [];
            activePlayer.hand.push(stolen);
          } else if (card.subType === "sedative") {
            currentRoom.skipAllOthers = true;
          } else if (card.subType === "swap" && targetPlayer) {
            const temp = activePlayer.hand || [];
            activePlayer.hand = targetPlayer.hand || [];
            targetPlayer.hand = temp;
          } else if (card.subType === "doubleDraw") {
            let drawPile = currentRoom.drawPile || [];
            let discardPile = currentRoom.discardPile || [];
            for (let i = 0; i < 2; i++) {
              if (drawPile.length === 0 && discardPile.length > 0) {
                drawPile = shuffleList(discardPile);
                currentRoom.discardPile = [];
              }
              if (drawPile.length > 0) {
                const drawn = drawPile.pop()!;
                if (!activePlayer.hand) activePlayer.hand = [];
                activePlayer.hand.push(drawn);
              }
            }
            currentRoom.drawPile = drawPile;
          }
        }
        // Immunity Rules
        else if (card.type === "immunity" && activePlayer) {
          if (card.subType === "vaccine" && targetOrgan && !targetOrgan.isDead) {
            setVaccineEffect(targetOrgan);
            targetOrgan.afflictions = [];
          } else if (card.subType === "organicDiet" && targetOrgan && !targetOrgan.isDead) {
            setOrganicDietEffect(targetOrgan);
          }
        }

        if (!currentRoom.discardPile) currentRoom.discardPile = [];
        currentRoom.discardPile.push(card);

        currentRoom.pendingAction = null;

        const playerIds = Object.keys(currentRoom.players);
        const alivePlayers = playerIds.filter((pid) => !currentRoom.players[pid].isZombie);
        if (alivePlayers.length === 1) {
          currentRoom.status = "ended";
          currentRoom.winnerId = alivePlayers[0];
        } else if (alivePlayers.length === 0) {
          currentRoom.status = "ended";
          currentRoom.winnerId = pending.playerId;
        }

        if (currentRoom.status === "playing") {
          transitionToNextTurn(currentRoom);
        }
      } catch (err) {
        console.error("Error committing action:", err);
      }

      return currentRoom;
    });
  }, [roomId]);

  const playInstantCounter = useCallback(
    async (instantCardId: string) => {
      const currentRoom = roomRef.current;
      if (!roomId || !currentRoom || !currentRoom.pendingAction) return;

      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `clashRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
        if (!currentRoom || !currentRoom.pendingAction) return currentRoom;

        try {
          let counterPlayerId: string | null = null;
          let cardIndex = -1;

          Object.keys(currentRoom.players).forEach((pid) => {
            const p = currentRoom.players[pid];
            const idx = p.hand.findIndex((c) => c.id === instantCardId && (c.subType === "antibody" || c.subType === "infection"));
            if (idx !== -1) {
              counterPlayerId = pid;
              cardIndex = idx;
            }
          });

          if (!counterPlayerId || cardIndex === -1) return currentRoom;

          const counterPlayer = currentRoom.players[counterPlayerId];
          const instantCard = counterPlayer.hand[cardIndex];
          const pendingCard = currentRoom.pendingAction.card;
          const attackerPid = currentRoom.pendingAction.playerId;

          counterPlayer.hand.splice(cardIndex, 1);

          if (!currentRoom.discardPile) currentRoom.discardPile = [];
          currentRoom.discardPile.push(instantCard);

          if (instantCard.subType === "infection") {
            // عدوى متحورة: عكس الهجوم على المهاجم نفسه
            const attacker = currentRoom.players[attackerPid];
            if (attacker) {
              // اختر عضواً عشوائياً حياً من أعضاء المهاجم
              const aliveOrgans = attacker.organs.filter(o => !o.isDead);
              if (aliveOrgans.length > 0) {
                const randomOrgan = aliveOrgans[Math.floor(Math.random() * aliveOrgans.length)];
                if (randomOrgan.hasVaccine) {
                  clearVaccineEffect(randomOrgan);
                  addRoomLog(currentRoom, `🔄 ${counterPlayer.name}: عكس الهجوم! حُمي ${randomOrgan.name} لدى ${attacker.name} باللقاح.`, "counter");
                } else if (randomOrgan.hasOrganicDiet) {
                  randomOrgan.hasOrganicDiet = false;
                  addRoomLog(currentRoom, `🔄 ${counterPlayer.name}: عكس الهجوم! حُمي ${randomOrgan.name} لدى ${attacker.name} بالنظام الغذائي وانتهى مفعوله.`, "counter");
                } else {
                  const dmg = pendingCard.damage ?? 1;
                  randomOrgan.hp = Math.max(0, randomOrgan.hp - dmg);
                  if (randomOrgan.hp <= 0) {
                    randomOrgan.isDead = true;
                    randomOrgan.afflictions = [];
                    clearVaccineEffect(randomOrgan);
                    if (randomOrgan.hasOrganicDiet) clearOrganicDietEffect(randomOrgan);
                    addRoomLog(currentRoom, `🔄 ${counterPlayer.name}: عكس الهجوم! 💀 مات ${randomOrgan.name} لدى ${attacker.name}`, "counter");
                  } else {
                    addRoomLog(currentRoom, `🔄 ${counterPlayer.name}: عكس الهجوم! 💥 أصيب ${randomOrgan.name} (${attacker.name})`, "counter");
                  }
                  if (attacker.organs.every(o => o.isDead)) {
                    attacker.isZombie = true;
                  }
                }
              } else {
                addRoomLog(currentRoom, `🔄 ${counterPlayer.name}: عكس الهجوم بعدوى متحورة!`, "counter");
              }
            }
            currentRoom.discardPile.push(pendingCard);
          } else {
            // أجسام مضادة: إلغاء الهجوم تماماً
            currentRoom.discardPile.push(pendingCard);
            addRoomLog(currentRoom, `${counterPlayer.name}: إلغاء الهجوم بـ ${instantCard.name}`, "counter");
          }

          currentRoom.pendingAction = null;
          transitionToNextTurn(currentRoom);
        } catch (err) {
          console.error("Error executing instant counter:", err);
        }

        return currentRoom;
      });
    },
    [roomId]
  );

  const endClashTurn = useCallback(async (forceByHost = false) => {
    const currentRoom = roomRef.current;
    if (!roomId || !currentRoom || currentRoom.status !== "playing") return;

    const isMyTurn = currentRoom.currentTurnPlayerId === playerId;
    const isHost = currentRoom.players?.[playerId]?.isHost || false;
    if (!isMyTurn && !(forceByHost && isHost)) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    await runTransaction(roomPathRef, (txRoom: ClashRoomState | null) => {
      if (!txRoom || txRoom.status !== "playing") return txRoom;

      try {
        transitionToNextTurn(txRoom);
      } catch (err) {
        console.error("Error transitioning turn manually:", err);
      }

      return txRoom;
    });
  }, [roomId, playerId]);

  const resetClashGame = useCallback(async () => {
    if (!roomId) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
      if (!currentRoom) return currentRoom;

      try {
        currentRoom.status = "lobby";
        currentRoom.drawPile = [];
        currentRoom.discardPile = [];
        currentRoom.winnerId = null;
        currentRoom.pendingAction = null;
        currentRoom.currentTurnPlayerId = "";
        currentRoom.turnPhase = "draw";
        currentRoom.skipNextTurn = false;
        currentRoom.logs = [];
        currentRoom.isPaused = false;
        currentRoom.pausedTimeRemaining = null;

        Object.keys(currentRoom.players || {}).forEach((pid) => {
          currentRoom.players[pid].hand = [];
          currentRoom.players[pid].organs = [];
          currentRoom.players[pid].isZombie = false;
        });
      } catch (err) {
        console.error("Error resetting Clash room:", err);
      }

      return currentRoom;
    });
  }, [roomId]);

  const updateClashRoomSettings = useCallback(
    async (maxPlayers: number, initialHandSize: number, turnTimerSeconds: number) => {
      if (!roomId) return;

      const database = getRealtimeDatabase() || getDatabase();
      const settingsRef = ref(database, `clashRooms/${roomId}/settings`);

      try {
        await set(settingsRef, {
          maxPlayers,
          initialHandSize,
          turnTimerSeconds,
        });
      } catch (err) {
        console.error("Failed to update room settings:", err);
      }
    },
    [roomId]
  );

  const drawAndReplaceCard = useCallback(async () => {
    const currentRoom = roomRef.current;
    if (!roomId || !currentRoom || currentRoom.status !== "playing") return;
    if (currentRoom.currentTurnPlayerId !== playerId) return;
    if (currentRoom.hasReplacedCardThisTurn) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
      if (!currentRoom || currentRoom.status !== "playing") return currentRoom;
      if (currentRoom.hasReplacedCardThisTurn) return currentRoom;

      try {
        const player = currentRoom.players[playerId];
        if (!player || !player.hand || player.hand.length === 0) return currentRoom;

        // 1. Pick a random card from hand and remove it
        const randomIndex = Math.floor(Math.random() * player.hand.length);
        const discardedCard = player.hand.splice(randomIndex, 1)[0];

        // Put the discarded card back into discardPile
        if (!currentRoom.discardPile) currentRoom.discardPile = [];
        currentRoom.discardPile.push(discardedCard);

        // 2. Draw a new card from drawPile
        let drawPile = currentRoom.drawPile || [];
        let discardPile = currentRoom.discardPile || [];

        if (drawPile.length === 0 && discardPile.length > 0) {
          drawPile = shuffleList(discardPile);
          currentRoom.discardPile = [];
        }

        if (drawPile.length > 0) {
          const drawnCard = drawPile.pop()!;
          player.hand.push(drawnCard);
        }

        currentRoom.drawPile = drawPile;
        currentRoom.hasReplacedCardThisTurn = true;
        addRoomLog(currentRoom, `${player.name}: سحب واستبدل كارت`, "draw");
      } catch (err) {
        console.error("Error in drawAndReplaceCard transaction:", err);
      }

      return currentRoom;
    });
  }, [roomId, playerId]);

  const togglePauseClashGame = useCallback(async () => {
    const currentRoom = roomRef.current;
    if (!roomId || !currentRoom || currentRoom.status !== "playing") return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
      if (!currentRoom || currentRoom.status !== "playing") return currentRoom;

      try {
        const currentlyPaused = !!currentRoom.isPaused;
        currentRoom.isPaused = !currentlyPaused;

        if (currentRoom.isPaused) {
          // Store how many seconds were remaining
          const remainingSeconds = Math.max(0, ((currentRoom.turnEndsAt || Date.now()) - Date.now()) / 1000);
          currentRoom.pausedTimeRemaining = remainingSeconds;
        } else {
          // Unpaused: calculate new turnEndsAt based on pausedTimeRemaining
          const remaining = currentRoom.pausedTimeRemaining || currentRoom.settings?.turnTimerSeconds || 30;
          currentRoom.turnEndsAt = Date.now() + remaining * 1000;
          currentRoom.pausedTimeRemaining = null;
        }
      } catch (err) {
        console.error("Error toggling pause Clash game:", err);
      }

      return currentRoom;
    });
  }, [roomId]);

  return {
    room,
    playerId,
    playerName,
    isReady,
    error,
    joinClashRoom,
    leaveClashRoom,
    kickClashPlayer,
    startClashGame,
    drawCardAuto,
    playActionCard,
    commitPendingAction,
    playInstantCounter,
    endClashTurn,
    resetClashGame,
    updateClashRoomSettings,
    drawAndReplaceCard,
    togglePauseClashGame,
  };
}
