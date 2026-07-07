"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDatabase, ref, onValue, set, runTransaction, onDisconnect } from "firebase/database";
import { getRealtimeDatabase } from "../lib/firebase";
import type { ClashRoomState, ClashPlayer, ActionCard, OrganCard, PendingAction } from "../types/organClash";

const SESSION_STORAGE_KEY = "iraqi-codenames-session";

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
    { subType: "caffeine", target: "heart", name: "جرعة كافيين زائدة", desc: "خفقان القلب، التوتر، واهتزاز اليدين." },
    { subType: "brokenHeart", target: "heart", name: "قلب مكسور", desc: "حزن شديد، ضيق في الصدر، ورغبة مفرطة في السكريات." },
    { subType: "cholesterol", target: "heart", name: "انسداد كوليسترول", desc: "انسداد الشرايين، ضيق التنفس، وضغط زائد على العضلة." },
    { subType: "insomnia", target: "mind", name: "أرق", desc: "تشتت الذهن، هالات سوداء عميقة، وإرهاق مستمر للدماغ." },
    { subType: "brainFreeze", target: "mind", name: "تجمد الدماغ", desc: "صداع حاد ومفاجئ، تجمد الرأس، وتوقف التفكير مؤقتاً." },
    { subType: "forgetfulness", target: "mind", name: "نوبة نسيان", desc: "ضياع المفاتيح، تحديق في الفراغ، وااختفاء الكلمات من اللسان." },
    { subType: "toxicDose", target: "liver", name: "جرعة سامة", desc: "تسمم حاد في الأنسجة، إجهاد خلوي، وفشل إنزيمي مفاجئ." },
    { subType: "fattyLiver", target: "liver", name: "كبد دهني", desc: "خمول وإرهاق مستمر بسبب تراكم الدهون حول الخلايا." },
    { subType: "smoke", target: "lung", name: "سحابة دخان", desc: "ضيق تنفس حاد وسعال جاف بسبب استنشاق الهواء الملوث." },
    { subType: "cough", target: "lung", name: "نوبة سعال", desc: "تشنج مستمر في القصبة الهوائية وتمزق مؤلم في الحلق." },
    { subType: "spicyFood", target: "stomach", name: "طعام حار", desc: "حرقة معوية شديدة، قرحة مفاجئة، والتهاب جدار المعدة." },
    { subType: "foodPoisoning", target: "stomach", name: "تسمم غذائي", desc: "غثيان حاد، آلام وتقلصات معوية، وفقدان مفاجئ للطاقة." },
    { subType: "kidneyStone", target: "kidney", name: "حصوة كلى", desc: "ألم حاد ومفاجئ في الجانب السفلي يمنع الحركة." },
    { subType: "dehydration", target: "kidney", name: "جفاف", desc: "نقص حاد في السوائل يؤدي لإجهاد وتراجع وظائف الكلى." },
    { subType: "appendicitis", target: "intestines", name: "التهاب زائدة", desc: "ألم مفاجئ وحاد في الجانب الأيمن يتطلب استئصالاً فورياً." }
  ] as const;

  let affIndex = 0;
  afflictionTypes.forEach((aff) => {
    const isThreeCopies = ["cholesterol", "smoke", "foodPoisoning", "dehydration", "appendicitis"].includes(aff.subType);
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
    { subType: "antibiotic", name: "مضاد حيوي", desc: "يزيل اعتلالاً واحداً نشطاً من أي عضو ويعالجه +1 صحة." },
    { subType: "vitamin", name: "جرعة فيتامين", desc: "يضيف +1 صحة لأي عضو (بحد أقصى 2 صحة)." },
    { subType: "icu", name: "عناية مركزة", desc: "يعيد فوراً عضواً بصحة 1 إلى كامل صحته القصوى (2 صحة)." },
    { subType: "surgery", name: "عملية جراحية", desc: "يحيي عضواً مدمراً بالكامل بصحة 1، أو يزيل اعتلالاً خطيراً (كالورم)." }
  ] as const;

  let cureIndex = 0;
  cureTypes.forEach((cure) => {
    const count = cure.subType === "antibiotic" ? 7 : 6;
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
    { subType: "antibody", type: "instant" as const, name: "أجسام مضادة", desc: "يلعب فوراً خارج دورك لتقويض وإلغاء أي اعتلال/هجوم قادم." },
    { subType: "infection", type: "tactical" as const, name: "عدوى متحورة", desc: "ينقل اعتلالاً نشطاً من أحد أعضائك إلى عضو صالح للخصم." },
    { subType: "steal", type: "tactical" as const, name: "سرقة", desc: "يسرق كارت عشوائي واحد من يد الخصم ويضيفه ليدك." },
    { subType: "sedative", type: "tactical" as const, name: "تخدير عام", desc: "يجبر اللاعب التالي على تخطي دوره تماماً." },
    { subType: "swap", type: "tactical" as const, name: "تبادل الأيدي", desc: "يجبر كلا اللاعبين على تبادل كامل أيديهما." },
    { subType: "doubleDraw", type: "tactical" as const, name: "السحب المزدوج", desc: "يسمح لك بسحب كارتين إضافيين من كومة السحب خلال دورك." }
  ] as const;

  let tacIndex = 0;
  tacticalTypes.forEach((tac) => {
    const count = (tac.subType === "antibody" || tac.subType === "doubleDraw") ? 4 : 3;
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
    { subType: "acuteInflammation", name: "التهاب حاد", desc: "يستهدف أي عضو من اختيارك على لوحة الخصم. يسبب -1 صحة." },
    { subType: "tumor", name: "ورم", desc: "يستهدف أي عضو. يسبب -2 صحة فوراً. لا يعالج إلا بالعملية الجراحية أو العناية المركزة." }
  ] as const;

  let genIndex = 0;
  generalAttackTypes.forEach((gen) => {
    for (let k = 0; k < 6; k++) {
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
    { subType: "vaccine", name: "لقاح / تطعيم", desc: "يرتبط بشكل دائم بعضو محدد. يصبح هذا العضو محصناً ضد أي اعتلالات." },
    { subType: "organicDiet", name: "نظام غذائي عضوي", desc: "حصانة دائمة ضد جميع كروت المعدة والكبد والكوليسترول." }
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

function transitionToNextTurn(currentRoom: ClashRoomState) {
  try {
    const playerIds = Object.keys(currentRoom.players);
    const currentIndex = playerIds.indexOf(currentRoom.currentTurnPlayerId);
    if (currentIndex === -1) return;

    let nextIndex = (currentIndex + 1) % playerIds.length;
    let nextPlayerId = playerIds[nextIndex];

    // Antibody/Sedative turn skip trigger
    if (currentRoom.skipNextTurn) {
      currentRoom.skipNextTurn = false;
      nextIndex = (nextIndex + 1) % playerIds.length;
      nextPlayerId = playerIds[nextIndex];
    }

    currentRoom.currentTurnPlayerId = nextPlayerId;
    currentRoom.turnPhase = "draw";
    currentRoom.pendingAction = null;

    const timerSeconds = currentRoom.settings?.turnTimerSeconds || 30;
    currentRoom.turnEndsAt = Date.now() + timerSeconds * 1000;

    const nextPlayer = currentRoom.players[nextPlayerId];
    if (nextPlayer && nextPlayer.isZombie) {
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
              randomOrgan.hasVaccine = false;
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
    }
  } catch (err) {
    console.error("Error in transitionToNextTurn:", err);
  }
}

export function useClashRoom(roomId: string) {
  const router = useRouter();
  const [room, setRoom] = useState<ClashRoomState | null>(null);
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
      if (!roomId || !room) return;

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
            for (let i = 0; i < initialHandSize; i++) {
              if (deck.length > 0) {
                playerHand.push(deck.pop()!);
              }
            }

            currentRoom.players[pid].organs = createInitialOrgans();
            currentRoom.players[pid].hand = playerHand;
            currentRoom.players[pid].isZombie = false;
            currentRoom.players[pid].hasOrganicDiet = false;
          });

          currentRoom.drawPile = deck;
          currentRoom.discardPile = [];
          currentRoom.status = "playing";
          currentRoom.winnerId = null;
          currentRoom.pendingAction = null;
          currentRoom.skipNextTurn = false;

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
        } catch (err) {
          console.error("Error inside startClashGame Transaction:", err);
        }

        return currentRoom;
      });
    },
    [roomId, room]
  );

  const drawCardAuto = useCallback(async () => {
    if (!roomId || !room || room.status !== "playing" || room.turnPhase !== "draw") return;
    if (room.currentTurnPlayerId !== playerId) return;

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
  }, [roomId, room, playerId]);

  const playActionCard = useCallback(
    async (cardId: string, targetPlayerId?: string, targetOrganId?: string) => {
      if (!roomId || !room || room.status !== "playing" || room.turnPhase !== "play") return;
      if (room.currentTurnPlayerId !== playerId) return;
      if (room.pendingAction) return;

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

          player.hand.splice(cardIndex, 1);

          if (
            card.type === "attack" ||
            card.type === "cure" ||
            card.type === "tactical" ||
            card.type === "immunity"
          ) {
            currentRoom.pendingAction = {
              playerId,
              card,
              targetPlayerId,
              targetOrganId,
              expiresAt: Date.now() + 5000,
            };
          } else {
            if (!currentRoom.discardPile) currentRoom.discardPile = [];
            currentRoom.discardPile.push(card);
            transitionToNextTurn(currentRoom);
          }
        } catch (err) {
          console.error("Error playing action card:", err);
        }

        return currentRoom;
      });
    },
    [roomId, room, playerId]
  );

  const commitPendingAction = useCallback(async () => {
    if (!roomId || !room || !room.pendingAction) return;

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
          // Immunity validation
          const hasVaccine = targetOrgan.hasVaccine === true;
          const hasOrganicDietImmunity =
            targetPlayer.hasOrganicDiet === true &&
            ["spicyFood", "foodPoisoning", "toxicDose", "fattyLiver", "cholesterol"].includes(card.subType);

          const isLegitimateTarget =
            card.targetOrganId === "any" || card.targetOrganId === targetOrgan.id;

          if (!hasVaccine && !hasOrganicDietImmunity && isLegitimateTarget && !targetOrgan.isDead) {
            const dmg = card.damage ?? 1;
            targetOrgan.hp = Math.max(0, targetOrgan.hp - dmg);
            if (targetOrgan.hp <= 0) {
              targetOrgan.isDead = true;
              targetOrgan.afflictions = [];
              targetOrgan.hasVaccine = false;
            } else {
              if (card.subType !== "acuteInflammation") {
                targetOrgan.afflictions = [...(targetOrgan.afflictions || []), card.subType];
              }
            }

            const allDead = targetPlayer.organs.every((o) => o.isDead);
            if (allDead) {
              targetPlayer.isZombie = true;
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
            if (!targetOrgan.isDead && targetOrgan.hp === 1) {
              targetOrgan.hp = 2;
            }
          } else if (card.subType === "surgery") {
            if (targetOrgan.isDead) {
              targetOrgan.isDead = false;
              targetOrgan.hp = 1;
              targetOrgan.afflictions = [];
              targetOrgan.hasVaccine = false;

              // Re-check target zombie state
              targetPlayer.isZombie = targetPlayer.organs.every((o) => o.isDead);
            } else {
              if (targetOrgan.afflictions && targetOrgan.afflictions.length > 0) {
                targetOrgan.afflictions = targetOrgan.afflictions.filter((a) => a !== "tumor");
                if (targetOrgan.afflictions.length > 0) {
                  targetOrgan.afflictions.pop();
                }
              }
            }
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

            if (extractedAffliction && !targetOrgan.hasVaccine) {
              const isDietImmune =
                targetPlayer.hasOrganicDiet === true &&
                ["spicyFood", "foodPoisoning", "toxicDose", "fattyLiver", "cholesterol"].includes(extractedAffliction);

              if (!isDietImmune) {
                targetOrgan.hp = Math.max(0, targetOrgan.hp - 1);
                if (targetOrgan.hp <= 0) {
                  targetOrgan.isDead = true;
                  targetOrgan.afflictions = [];
                  targetOrgan.hasVaccine = false;
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
            currentRoom.skipNextTurn = true;
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
            targetOrgan.hasVaccine = true;
            targetOrgan.afflictions = []; // clear afflictions when vaccinated
          } else if (card.subType === "organicDiet") {
            activePlayer.hasOrganicDiet = true;
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
  }, [roomId, room]);

  const playInstantCounter = useCallback(
    async (instantCardId: string) => {
      if (!roomId || !room || !room.pendingAction) return;

      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `clashRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
        if (!currentRoom || !currentRoom.pendingAction) return currentRoom;

        try {
          let counterPlayerId: string | null = null;
          let cardIndex = -1;

          Object.keys(currentRoom.players).forEach((pid) => {
            const p = currentRoom.players[pid];
            const idx = p.hand.findIndex((c) => c.id === instantCardId && c.subType === "antibody");
            if (idx !== -1) {
              counterPlayerId = pid;
              cardIndex = idx;
            }
          });

          if (!counterPlayerId || cardIndex === -1) return currentRoom;

          const counterPlayer = currentRoom.players[counterPlayerId];
          const instantCard = counterPlayer.hand[cardIndex];

          counterPlayer.hand.splice(cardIndex, 1);

          if (!currentRoom.discardPile) currentRoom.discardPile = [];
          currentRoom.discardPile.push(instantCard);
          currentRoom.discardPile.push(currentRoom.pendingAction.card);

          currentRoom.pendingAction = null;
          transitionToNextTurn(currentRoom);
        } catch (err) {
          console.error("Error executing instant counter:", err);
        }

        return currentRoom;
      });
    },
    [roomId, room]
  );

  const endClashTurn = useCallback(async (forceByHost = false) => {
    if (!roomId || !room || room.status !== "playing") return;

    const isMyTurn = room.currentTurnPlayerId === playerId;
    const isHost = room.players?.[playerId]?.isHost || false;
    if (!isMyTurn && !(forceByHost && isHost)) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
      if (!currentRoom || currentRoom.status !== "playing") return currentRoom;

      try {
        transitionToNextTurn(currentRoom);
      } catch (err) {
        console.error("Error transitioning turn manually:", err);
      }

      return currentRoom;
    });
  }, [roomId, room, playerId]);

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

        Object.keys(currentRoom.players || {}).forEach((pid) => {
          currentRoom.players[pid].hand = [];
          currentRoom.players[pid].organs = [];
          currentRoom.players[pid].isZombie = false;
          currentRoom.players[pid].hasOrganicDiet = false;
        });
      } catch (err) {
        console.error("Error resetting Clash room:", err);
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
  };
}
