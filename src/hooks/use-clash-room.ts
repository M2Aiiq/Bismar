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

  // 38 Attacks
  const attackTypes = [
    { name: "ضربة جرثومية", desc: "تسبب 1 ضرر لعضو مستهدف", dmg: 1 },
    { name: "تسمم غذائي", desc: "تسبب 1 ضرر لعضو مستهدف", dmg: 1 },
    { name: "فشل كلوي", desc: "تسبب 1 ضرر لعضو مستهدف", dmg: 1 },
    { name: "التهاب رئوي", desc: "تسبب 1 ضرر لعضو مستهدف", dmg: 1 },
    { name: "التهاب الكبد الحاد", desc: "تسبب 1 ضرر لعضو مستهدف", dmg: 1 },
    { name: "سرطان خبيث", desc: "تسبب 2 ضرر لعضو مستهدف", dmg: 2 },
    { name: "سكتة قلبية مفاجئة", desc: "تسبب 2 ضرر لعضو مستهدف", dmg: 2 },
  ];
  for (let i = 0; i < 38; i++) {
    const type = attackTypes[i % attackTypes.length];
    deck.push({
      id: `att_${i}`,
      name: type.name,
      type: "attack",
      description: type.desc,
      damage: type.dmg,
    });
  }

  // 24 Cures
  const cureTypes = [
    { name: "مضاد حيوي قوي", desc: "يعالج 1 نقطة صحة لعضو مستهدف", cure: 1 },
    { name: "تطعيم ولقاح", desc: "يعالج 1 نقطة صحة لعضو مستهدف", cure: 1 },
    { name: "مسكن آلام سريع", desc: "يعالج 1 نقطة صحة لعضو مستهدف", cure: 1 },
    { name: "أوكسجين نقي", desc: "يعالج 1 نقطة صحة لعضو مستهدف", cure: 1 },
    { name: "عملية جراحية كبرى", desc: "يعالج 2 نقطة صحة لعضو مستهدف", cure: 2 },
    { name: "عملية زرع عضو", desc: "يعالج 2 نقطة صحة لعضو مستهدف", cure: 2 },
  ];
  for (let i = 0; i < 24; i++) {
    const type = cureTypes[i % cureTypes.length];
    deck.push({
      id: `cure_${i}`,
      name: type.name,
      type: "cure",
      description: type.desc,
      cureAmount: type.cure,
    });
  }

  // 16 Instants
  const instantTypes = [
    { name: "رفض التأمين الصحي", desc: "إلغاء إجراء الخصم المعلق فوراً خارج الدور" },
    { name: "حقنة طوارئ سريعة", desc: "إلغاء إجراء الخصم المعلق فوراً خارج الدور" },
  ];
  for (let i = 0; i < 16; i++) {
    const type = instantTypes[i % instantTypes.length];
    deck.push({
      id: `inst_${i}`,
      name: type.name,
      type: "instant",
      description: type.desc,
    });
  }

  // 6 Useless
  const uselessTypes = [
    { name: "علكة مستعملة", desc: "لا فائدة منها، تملأ يدك فقط" },
    { name: "صورة أشعة قديمة", desc: "لا فائدة منها، تملأ يدك فقط" },
    { name: "بروشور طبي منتهي", desc: "لا فائدة منها، تملأ يدك فقط" },
  ];
  for (let i = 0; i < 6; i++) {
    const type = uselessTypes[i % uselessTypes.length];
    deck.push({
      id: `useless_${i}`,
      name: type.name,
      type: "useless",
      description: type.desc,
    });
  }

  return deck;
}

export function createInitialOrgans(): OrganCard[] {
  const allOrgans: OrganCard[] = [
    { id: "heart", name: "القلب", hp: 2, isDead: false },
    { id: "mind", name: "العقل", hp: 2, isDead: false },
    { id: "lung", name: "الرئة", hp: 2, isDead: false },
    { id: "liver", name: "الكبد", hp: 2, isDead: false },
    { id: "kidney", name: "الكلية", hp: 2, isDead: false },
  ];
  return shuffleList(allOrgans).slice(0, 4);
}

function shuffleList<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useClashRoom(roomId: string) {
  const router = useRouter();
  const [room, setRoom] = useState<ClashRoomState | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLeavingRef = useRef(false);

  // 1. تهيئة الجلسة المحلية عند البدء
  useEffect(() => {
    const session = readSession();
    const nextPlayerId = session?.playerId ?? crypto.randomUUID();
    const nextPlayerName = session?.playerName ?? "";

    setPlayerId(nextPlayerId);
    setPlayerName(nextPlayerName);
    saveSession(nextPlayerId, nextPlayerName);
    setIsReady(true);
  }, []);

  // 2. الاتصال اللحظي ومزامنة البيانات
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

        // تهيئة الهياكل الفارغة
        if (!data.players) data.players = {};
        if (!data.presence) data.presence = {};
        if (!data.drawPile) data.drawPile = [];
        if (!data.discardPile) data.discardPile = [];

        // التأكد من تطبيع أيدي اللاعبين
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
        setError("فشل الاتصال اللحظي بقاعدة البيانات.");
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isReady, roomId]);

  // 3. إدارة الحضور والاتصال
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

  // 4. الانضمام إلى الغرفة
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

  // 5. مغادرة الغرفة
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

        // إذا لم يتبق أحد، نحذف الغرفة
        if (!currentRoom.players || Object.keys(currentRoom.players).length === 0) {
          return null;
        }

        // تعيين مضيف جديد إذا كان المغادر هو المضيف
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

  // 6. طرد لاعب
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

  // 7. بدء اللعب
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

          // توليد وخلط حزمة كروت الأكشن
          let deck = shuffleList(createInitialDeck());

          // توزيع الكروت والأعضاء لكل لاعب
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
          });

          currentRoom.drawPile = deck;
          currentRoom.discardPile = [];
          currentRoom.status = "playing";
          currentRoom.winnerId = null;
          currentRoom.pendingAction = null;

          // تعيين أول لاعب
          const hostId = playerIds.find((pid) => currentRoom.players[pid].isHost) || playerIds[0];
          currentRoom.currentTurnPlayerId = hostId;
          currentRoom.turnPhase = "draw";

          // تعيين مؤقت الجولة الأولى
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

  // 8. سحب كارت تلقائياً في بداية الدور
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

        // إعادة خلط كروت الديسكارد إذا نفذت كروت السحب
        let drawPile = currentRoom.drawPile || [];
        const discardPile = currentRoom.discardPile || [];
        if (drawPile.length === 0) {
          if (discardPile.length > 0) {
            drawPile = shuffleList(discardPile);
            currentRoom.discardPile = [];
          } else {
            // لا توجد كروت تماماً
            currentRoom.turnPhase = "play";
            return currentRoom;
          }
        }

        const drawnCard = drawPile.pop()!;
        if (!player.hand) player.hand = [];
        player.hand.push(drawnCard);

        currentRoom.drawPile = drawPile;
        currentRoom.turnPhase = "play";
      } catch (err) {
        console.error("Error drawing card:", err);
      }

      return currentRoom;
    });
  }, [roomId, room, playerId]);

  // 9. لعب كارت أكشن عادي (هجوم، علاج، أو بلا فائدة)
  const playActionCard = useCallback(
    async (cardId: string, targetPlayerId?: string, targetOrganId?: string) => {
      if (!roomId || !room || room.status !== "playing" || room.turnPhase !== "play") return;
      if (room.currentTurnPlayerId !== playerId) return;

      // تحقق من وجود حركة معلقة بالفعل
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

          // إزالة الكارت من اليد
          player.hand.splice(cardIndex, 1);

          if (card.type === "attack" || card.type === "cure") {
            // كروت تفاعلية تحتاج مقاطعة: نضعها في pendingAction
            currentRoom.pendingAction = {
              playerId,
              card,
              targetPlayerId,
              targetOrganId,
              expiresAt: Date.now() + 5000, // 5 ثوانٍ مقاطعة
            };
          } else {
            // كرت بلا فائدة أو فوري ملعوب كخردة: يُلقى في discard مباشرة وينتهي الدور
            if (!currentRoom.discardPile) currentRoom.discardPile = [];
            currentRoom.discardPile.push(card);
            currentRoom.turnPhase = "pass";
          }
        } catch (err) {
          console.error("Error playing action card:", err);
        }

        return currentRoom;
      });
    },
    [roomId, room, playerId]
  );

  // 10. تطبيق الحركة المعلقة بعد انتهاء وقت المقاطعة
  const commitPendingAction = useCallback(async () => {
    if (!roomId || !room || !room.pendingAction) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
      if (!currentRoom || !currentRoom.pendingAction) return currentRoom;

      try {
        const pending = currentRoom.pendingAction;
        const card = pending.card;

        if (card.type === "attack" && pending.targetPlayerId && pending.targetOrganId) {
          const targetPlayer = currentRoom.players[pending.targetPlayerId];
          if (targetPlayer) {
            const organ = targetPlayer.organs.find((o) => o.id === pending.targetOrganId);
            if (organ && !organ.isDead) {
              organ.hp = Math.max(0, organ.hp - (card.damage || 1));
              if (organ.hp <= 0) {
                organ.isDead = true;
              }
            }

            // التحقق مما إذا أصبح الخصم زومبي
            const allDead = targetPlayer.organs.every((o) => o.isDead);
            if (allDead) {
              targetPlayer.isZombie = true;
            }
          }
        } else if (card.type === "cure" && pending.targetPlayerId && pending.targetOrganId) {
          const targetPlayer = currentRoom.players[pending.targetPlayerId];
          if (targetPlayer) {
            const organ = targetPlayer.organs.find((o) => o.id === pending.targetOrganId);
            if (organ && !organ.isDead) {
              organ.hp = Math.min(2, organ.hp + (card.cureAmount || 1));
            }
          }
        }

        // رمي الكارت المستهلك في discard
        if (!currentRoom.discardPile) currentRoom.discardPile = [];
        currentRoom.discardPile.push(card);

        // تنظيف الحركة المعلقة
        currentRoom.pendingAction = null;
        currentRoom.turnPhase = "pass";

        // فحص الفائز باللعبة
        const playerIds = Object.keys(currentRoom.players);
        const alivePlayers = playerIds.filter((pid) => !currentRoom.players[pid].isZombie);
        if (alivePlayers.length === 1) {
          currentRoom.status = "ended";
          currentRoom.winnerId = alivePlayers[0];
        } else if (alivePlayers.length === 0) {
          currentRoom.status = "ended";
          currentRoom.winnerId = pending.playerId; // فوز افتراضي لمن سبب الضربة القاضية
        }
      } catch (err) {
        console.error("Error committing action:", err);
      }

      return currentRoom;
    });
  }, [roomId, room]);

  // 11. لعب كارت مقاطعة فوري من قبل أي لاعب خارج دوره لإلغاء الحركة المعلقة
  const playInstantCounter = useCallback(
    async (instantCardId: string) => {
      if (!roomId || !room || !room.pendingAction) return;

      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `clashRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
        if (!currentRoom || !currentRoom.pendingAction) return currentRoom;

        try {
          // البحث عن اللاعب صاحب الكارت الفوري
          let counterPlayerId: string | null = null;
          let cardIndex = -1;

          Object.keys(currentRoom.players).forEach((pid) => {
            const p = currentRoom.players[pid];
            const idx = p.hand.findIndex((c) => c.id === instantCardId && c.type === "instant");
            if (idx !== -1) {
              counterPlayerId = pid;
              cardIndex = idx;
            }
          });

          if (!counterPlayerId || cardIndex === -1) return currentRoom;

          const counterPlayer = currentRoom.players[counterPlayerId];
          const instantCard = counterPlayer.hand[cardIndex];

          // إزالة كارت المقاطعة من يد اللاعب
          counterPlayer.hand.splice(cardIndex, 1);

          // إلقاء كارت المقاطعة والكارت المُلغى في سلة المهملات
          if (!currentRoom.discardPile) currentRoom.discardPile = [];
          currentRoom.discardPile.push(instantCard);
          currentRoom.discardPile.push(currentRoom.pendingAction.card);

          // إلغاء الحركة المعلقة تماماً
          currentRoom.pendingAction = null;

          // تحويل الفاز (Phase) للاعب صاحب الدور الحالي إلى pass ليتمكن من إنهاء دوره
          currentRoom.turnPhase = "pass";
        } catch (err) {
          console.error("Error executing instant counter:", err);
        }

        return currentRoom;
      });
    },
    [roomId, room]
  );

  // 12. إنهاء الدور الحالي والانتقال للاعب التالي (مع دعم التجاوز الإجباري من المضيف forceByHost)
  const endClashTurn = useCallback(async (forceByHost = false) => {
    if (!roomId || !room || room.status !== "playing") return;
    
    // التحقق من أنه دور اللاعب الحالي أو فرض من المضيف
    const isMyTurn = room.currentTurnPlayerId === playerId;
    const isHost = room.players?.[playerId]?.isHost || false;
    if (!isMyTurn && !(forceByHost && isHost)) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `clashRooms/${roomId}`);

    await runTransaction(roomPathRef, (currentRoom: ClashRoomState | null) => {
      if (!currentRoom || currentRoom.status !== "playing") return currentRoom;

      try {
        const playerIds = Object.keys(currentRoom.players);
        const currentIndex = playerIds.indexOf(currentRoom.currentTurnPlayerId);
        if (currentIndex === -1) return currentRoom;

        // البحث عن التالي بالتناوب
        let nextIndex = (currentIndex + 1) % playerIds.length;
        let nextPlayerId = playerIds[nextIndex];

        // تعيين الدور الجديد
        currentRoom.currentTurnPlayerId = nextPlayerId;
        currentRoom.turnPhase = "draw";
        currentRoom.pendingAction = null;

        // تعيين مؤقت الدور الجديد للاعب التالي
        const timerSeconds = currentRoom.settings?.turnTimerSeconds || 30;
        currentRoom.turnEndsAt = Date.now() + timerSeconds * 1000;

        // معالجة دور الزومبي تلقائياً إذا كان اللاعب زومبي
        const nextPlayer = currentRoom.players[nextPlayerId];
        if (nextPlayer && nextPlayer.isZombie) {
          // دور الزومبي التلقائي السريع لإثارة الفوضى دون الخضوع للمقاطعة
          let drawPile = currentRoom.drawPile || [];
          let discardPile = currentRoom.discardPile || [];
          if (drawPile.length === 0 && discardPile.length > 0) {
            drawPile = shuffleList(discardPile);
            currentRoom.discardPile = [];
          }

          // سحب كرت هجوم عشوائي للزومبي وتطبيقه فوراً
          const zombieAttack = drawPile.pop() || {
            id: `zombie_att_${Date.now()}`,
            name: "عضة زومبي عشوائية",
            type: "attack" as const,
            description: "تسبب 1 ضرر لعضو عشوائي للخصم",
            damage: 1,
          };

          // البحث عن هدف حي عشوائي
          const liveOpponents = playerIds.filter((pid) => pid !== nextPlayerId && !currentRoom.players[pid].isZombie);
          if (liveOpponents.length > 0) {
            const randomOpponentId = liveOpponents[Math.floor(Math.random() * liveOpponents.length)];
            const randomOpponent = currentRoom.players[randomOpponentId];
            const liveOrgans = randomOpponent.organs.filter((o) => !o.isDead);
            if (liveOrgans.length > 0) {
              const randomOrgan = liveOrgans[Math.floor(Math.random() * liveOrgans.length)];
              randomOrgan.hp = Math.max(0, randomOrgan.hp - (zombieAttack.damage || 1));
              if (randomOrgan.hp <= 0) {
                randomOrgan.isDead = true;
              }

              // التحقق مما إذا مات الخصم بعد عضة الزومبي
              const allDead = randomOpponent.organs.every((o) => o.isDead);
              if (allDead) {
                randomOpponent.isZombie = true;
              }
            }
          }

          // إلقاء كرت الزومبي
          if (!currentRoom.discardPile) currentRoom.discardPile = [];
          currentRoom.discardPile.push(zombieAttack);
          currentRoom.drawPile = drawPile;

          // تمرير دور الزومبي فوراً للاعب الذي يليه
          let nextNextIndex = (nextIndex + 1) % playerIds.length;
          currentRoom.currentTurnPlayerId = playerIds[nextNextIndex];
          currentRoom.turnPhase = "draw";

          // تعيين مؤقت الدور الجديد للاعب بعد الزومبي
          currentRoom.turnEndsAt = Date.now() + timerSeconds * 1000;

          // إعادة فحص الفائز
          const alivePlayers = playerIds.filter((pid) => !currentRoom.players[pid].isZombie);
          if (alivePlayers.length === 1) {
            currentRoom.status = "ended";
            currentRoom.winnerId = alivePlayers[0];
          }
        }
      } catch (err) {
        console.error("Error transitioning turn:", err);
      }

      return currentRoom;
    });
  }, [roomId, room, playerId]);

  // 13. إعادة اللعب للوبي من جديد
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

        // تفريغ اليد والأعضاء للكل
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
