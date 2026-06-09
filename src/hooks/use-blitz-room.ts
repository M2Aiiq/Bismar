"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDatabase, ref, onValue, set, onDisconnect, runTransaction } from "firebase/database";
import { getRealtimeDatabase } from "../lib/firebase";
import { shuffleList } from "../lib/game";
import { IRAQI_WORDS_BY_CATEGORY } from "../lib/words";
import { getBlitzCategoriesByPool } from "../lib/blitz-categories";
import type { BlitzCard, BlitzRoomPlayer, BlitzRoomState, BlitzTeam, BlitzRoomSettings } from "../types/game";

const SESSION_STORAGE_KEY = "iraqi-codenames-session";

interface SessionState {
  playerId: string;
  playerName: string;
  roomId?: string;
}

function readSession(): SessionState | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveSession(playerId: string, playerName: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ playerId, playerName })
    );
  }
}

export function useBlitzRoom(roomId: string) {
  const router = useRouter();
  const [room, setRoom] = useState<BlitzRoomState | null>(null);
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

  // 2. الاتصال اللحظي بالغرفة ومزامنة البيانات مع Firebase
  useEffect(() => {
    if (!isReady || !roomId) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomRef = ref(database, `blitzRooms/${roomId}`);

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

        const data = snapshot.val() as BlitzRoomState;
        
        // التأكد من تهيئة الهياكل الأساسية
        if (!data.players) data.players = {};
        if (!data.presence) data.presence = {};
        if (!data.scores) data.scores = { red: 0, blue: 0, green: 0 };
        if (data.lastWrongClick === undefined) data.lastWrongClick = null;

        // تطبيع بيانات الشبكة: Firebase يحذف القيم null تلقائياً، فيصبح clickedBy هو undefined بدلاً من null
        if (data.grid) {
          data.grid = data.grid.map((c) => ({
            ...c,
            clickedBy: c.clickedBy ?? null,
          }));
        }

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

  // 3. إدارة التواجد والحضور (Presence) للاتصال غير المنقطع
  useEffect(() => {
    if (!isReady || !roomId || !playerId) return;

    const database = getRealtimeDatabase() || getDatabase();
    const presenceRef = ref(database, `blitzRooms/${roomId}/presence/${playerId}`);
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

  // دالة مساعدة لتوليد جولة بليتز جديدة (مجموعة كروت وفئة جديدة)
  const generateRoundData = useCallback((settings: { roundTimerSeconds: number; categoryPools: string[] }) => {
    const pool = settings.categoryPools?.[0] || "all";
    const categories = getBlitzCategoriesByPool(pool);
    if (categories.length === 0) {
      throw new Error("لا توجد فئات كلمات متاحة.");
    }
    const category = categories[Math.floor(Math.random() * categories.length)];

    const correctWords = [...category.correct_words];
    const blacklist = new Set(category.blacklist || []);
    const correctSet = new Set(correctWords);

    const generalBank = IRAQI_WORDS_BY_CATEGORY.General || [];
    const safeDistractors = generalBank.filter(
      (word) => !correctSet.has(word) && !blacklist.has(word)
    );

    const distractorsCount = Math.max(0, 25 - correctWords.length);
    const chosenDistractors = shuffleList(safeDistractors).slice(0, distractorsCount);

    const finalWordsList = [
      ...correctWords.map((word) => ({ word, isCorrect: true })),
      ...chosenDistractors.map((word) => ({ word, isCorrect: false }))
    ];

    const shuffledFinalWords = shuffleList(finalWordsList);

    const grid: BlitzCard[] = shuffledFinalWords.map((item, index) => ({
      id: index,
      word: item.word,
      isCorrect: item.isCorrect,
      clickedBy: null
    }));

    return {
      currentCategory: category.target_word,
      grid,
      timer: settings.roundTimerSeconds
    };
  }, []);

  // 4. الانضمام إلى غرفة البليتز
  const joinBlitzRoom = useCallback(
    async (name: string) => {
      if (!roomId || !playerId) return;

      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        throw new Error("الاسم يجب أن يكون حرفين على الأقل.");
      }

      const database = getRealtimeDatabase() || getDatabase();
      const playerRef = ref(database, `blitzRooms/${roomId}/players/${playerId}`);

      // تحقق مما إذا كانت الغرفة موجودة أولاً
      const roomSnapshot = await get(ref(database, `blitzRooms/${roomId}`));
      if (!roomSnapshot.exists()) {
        throw new Error("الغرفة المطلوبة لم تعد متاحة.");
      }

      const currentRoom = roomSnapshot.val() as BlitzRoomState;
      const isHost = !currentRoom.players || Object.keys(currentRoom.players).length === 0;

      const newPlayer: BlitzRoomPlayer = {
        id: playerId,
        name: trimmedName,
        team: "unassigned",
        isHost
      };

      await set(playerRef, newPlayer);
      setPlayerName(trimmedName);
      saveSession(playerId, trimmedName);
    },
    [roomId, playerId]
  );

  // 5. مغادرة الغرفة
  const leaveBlitzRoom = useCallback(async () => {
    if (!roomId || !playerId) return;

    isLeavingRef.current = true;
    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `blitzRooms/${roomId}`);

    try {
      await runTransaction(roomPathRef, (currentRoom: BlitzRoomState | null) => {
        if (!currentRoom) return null;

        if (currentRoom.players) {
          delete currentRoom.players[playerId];
        }
        if (currentRoom.presence) {
          delete currentRoom.presence[playerId];
        }

        // إذا لم يتبقَ لاعبون، احذف الغرفة بالكامل
        if (!currentRoom.players || Object.keys(currentRoom.players).length === 0) {
          return null;
        }

        // نقل المضيف للاعب آخر إذا غادر المضيف الحالي
        const remainingPlayerIds = Object.keys(currentRoom.players);
        const wasHost = currentRoom.players[playerId]?.isHost;
        if (wasHost && remainingPlayerIds.length > 0) {
          currentRoom.players[remainingPlayerIds[0]].isHost = true;
        }

        return currentRoom;
      });

      router.replace("/");
    } catch (err) {
      console.error("Failed to leave Blitz room:", err);
      router.replace("/");
    }
  }, [roomId, playerId, router]);

  // 6. طرد لاعب (للمضيف فقط)
  const kickBlitzPlayer = useCallback(
    async (targetPlayerId: string) => {
      if (!roomId || !playerId) return;

      const database = getRealtimeDatabase() || getDatabase();
      const playerRef = ref(database, `blitzRooms/${roomId}/players/${targetPlayerId}`);
      const presenceRef = ref(database, `blitzRooms/${roomId}/presence/${targetPlayerId}`);
      await set(playerRef, null);
      await set(presenceRef, null);
    },
    [roomId, playerId]
  );

  // 6. اختيار الفريق
  const selectBlitzTeam = useCallback(
    async (team: BlitzTeam) => {
      if (!roomId || !playerId) return;

      const database = getRealtimeDatabase() || getDatabase();
      const teamRef = ref(database, `blitzRooms/${roomId}/players/${playerId}/team`);
      await set(teamRef, team);
    },
    [roomId, playerId]
  );

  // 7. بدء اللعبة
  const startBlitzGame = useCallback(
    async (newSettings?: BlitzRoomSettings) => {
      if (!roomId || !room) return;

      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `blitzRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: BlitzRoomState | null) => {
        if (!currentRoom) return currentRoom;

        try {
          if (newSettings) {
            currentRoom.settings = newSettings;
            const nextRound = generateRoundData(newSettings);
            currentRoom.currentCategory = nextRound.currentCategory;
            currentRoom.grid = nextRound.grid;
            currentRoom.timer = nextRound.timer;

            // إذا تم تغيير عدد الفرق إلى 2، يتم إرجاع أي لاعب في الفريق الأخضر إلى الحالة unassigned
            if (newSettings.teamCount === 2 && currentRoom.players) {
              Object.values(currentRoom.players).forEach((p) => {
                if (p.team === "green") {
                  p.team = "unassigned";
                }
              });
            }
          }
          currentRoom.status = "playing";
          currentRoom.scores = { red: 0, blue: 0, green: 0 };
          currentRoom.winner = null;
          currentRoom.isPaused = false;
          currentRoom.lastWrongClick = null;
        } catch (err) {
          console.error("Error starting Blitz game with settings:", err);
        }

        return currentRoom;
      });
    },
    [roomId, room, generateRoundData]
  );

  // 8. النقر التنافسي المتزامن (Firebase Transactions)
  const tapBlitzCard = useCallback(
    async (cardId: number) => {
      if (!roomId || !room || room.status !== "playing") return;

      const activePlayer = room.players[playerId];
      if (!activePlayer || activePlayer.team === "unassigned") {
        return; // يجب أن يكون في فريق للضغط
      }

      const team = activePlayer.team;
      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `blitzRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: BlitzRoomState | null) => {
        if (!currentRoom || currentRoom.status !== "playing") return currentRoom;

        const card = currentRoom.grid?.[cardId];
        // إذا تم النقر عليه بالفعل من قبل أي لاعب، تجاهل الطلب
        // نستخدم فحص truthy لأن Firebase يحذف القيم null فتصبح undefined
        if (!card || card.clickedBy) {
          return currentRoom;
        }

        // تحديث النقاط: فقط الكلمة الصحيحة تنقلب بلون الفريق
        if (card.isCorrect) {
          // الكلمة صحيحة: تنقلب البطاقة بلون الفريق الضاغط وتُحسب نقطة
          card.clickedBy = team;
          currentRoom.scores[team] = (currentRoom.scores[team] || 0) + 1;
        } else {
          // الكلمة خاطئة: لا تنقلب البطاقة، فقط عقوبة -1 نقطة وتحديث آخر نقرة خاطئة
          currentRoom.scores[team] = Math.max(0, (currentRoom.scores[team] || 0) - 1);
          currentRoom.lastWrongClick = {
            cardId: cardId,
            team: team,
            timestamp: Date.now()
          };
        }

        // 3. التحقق من وصول أي فريق للحد الأقصى للنقاط
        const limit = currentRoom.settings.scoreLimit;
        if (currentRoom.scores[team] >= limit) {
          currentRoom.status = "ended";
          currentRoom.winner = team;
          return currentRoom;
        }

        // 4. التحقق من النقر على جميع الإجابات الصحيحة في هذه الجولة
        const allCorrectClicked = currentRoom.grid.every(
          (c) => !c.isCorrect || !!c.clickedBy
        );

        if (allCorrectClicked) {
          // بدء جولة جديدة وتحديث الفئة والبطاقات مع الاحتفاظ بالنقاط المتراكمة
          try {
            const nextRound = generateRoundData(currentRoom.settings);
            currentRoom.currentCategory = nextRound.currentCategory;
            currentRoom.grid = nextRound.grid;
            currentRoom.timer = nextRound.timer;
          } catch (err) {
            console.error("Error generating next round in transaction:", err);
          }
        }

        return currentRoom;
      });
    },
    [roomId, room, playerId, generateRoundData]
  );

  // 9. الانتقال يدوياً للجولة التالية (للمضيف فقط)
  const nextBlitzRound = useCallback(async () => {
    if (!roomId || !room) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `blitzRooms/${roomId}`);

    await runTransaction(roomPathRef, (currentRoom: BlitzRoomState | null) => {
      if (!currentRoom || currentRoom.status !== "playing") return currentRoom;

      try {
        const nextRound = generateRoundData(currentRoom.settings);
        currentRoom.currentCategory = nextRound.currentCategory;
        currentRoom.grid = nextRound.grid;
        currentRoom.timer = nextRound.timer;
        currentRoom.lastWrongClick = null;
      } catch (err) {
        console.error("Error skipping to next round:", err);
      }

      return currentRoom;
    });
  }, [roomId, room, generateRoundData]);

  // 10. إعادة تعيين اللعبة (العودة للوبي لبدء لعبة جديدة)
  const resetBlitzGame = useCallback(
    async (newSettings?: BlitzRoomSettings) => {
      if (!roomId || !room) return;

      const database = getRealtimeDatabase() || getDatabase();
      const roomPathRef = ref(database, `blitzRooms/${roomId}`);

      await runTransaction(roomPathRef, (currentRoom: BlitzRoomState | null) => {
        if (!currentRoom) return currentRoom;

        try {
          const settingsToUse = newSettings || currentRoom.settings;
          const nextRound = generateRoundData(settingsToUse);
          currentRoom.status = "lobby";
          currentRoom.currentCategory = nextRound.currentCategory;
          currentRoom.grid = nextRound.grid;
          currentRoom.timer = nextRound.timer;
          currentRoom.scores = { red: 0, blue: 0, green: 0 };
          currentRoom.winner = null;
          currentRoom.settings = settingsToUse;
          currentRoom.lastWrongClick = null;

          // إذا تم تغيير عدد الفرق إلى 2، يتم إرجاع أي لاعب في الفريق الأخضر إلى الحالة unassigned
          if (settingsToUse.teamCount === 2 && currentRoom.players) {
            Object.values(currentRoom.players).forEach((p) => {
              if (p.team === "green") {
                p.team = "unassigned";
              }
            });
          }
          currentRoom.isPaused = false;
        } catch (err) {
          console.error("Error resetting Blitz game:", err);
        }

        return currentRoom;
      });
    },
    [roomId, room, generateRoundData]
  );

  // 11. إدارة وقت اللعبة التنافسي (المضيف فقط يقوم بخصم الوقت)
  useEffect(() => {
    if (!room || room.status !== "playing" || room.isPaused || !roomId || !playerId) return;

    const activePlayer = room.players[playerId];
    if (!activePlayer || !activePlayer.isHost) return;

    const database = getRealtimeDatabase() || getDatabase();
    const roomPathRef = ref(database, `blitzRooms/${roomId}`);

    const interval = setInterval(() => {
      void runTransaction(roomPathRef, (currentRoom: BlitzRoomState | null) => {
        if (!currentRoom || currentRoom.status !== "playing" || currentRoom.isPaused) return currentRoom;

        if (currentRoom.timer <= 1) {
          // انتهى وقت الفئة الحالية! ننتقل للفئة التالية تلقائياً
          try {
            const nextRound = generateRoundData(currentRoom.settings);
            currentRoom.currentCategory = nextRound.currentCategory;
            currentRoom.grid = nextRound.grid;
            currentRoom.timer = nextRound.timer;
          } catch (err) {
            console.error("Error generating next round on timeout:", err);
          }
        } else {
          currentRoom.timer -= 1;
        }

        return currentRoom;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.status, room?.players, room?.isPaused, roomId, playerId, generateRoundData]);

  // 12. تبديل حالة الإيقاف المؤقت للعب
  const togglePauseBlitzGame = useCallback(async () => {
    if (!roomId || !room || room.status !== "playing") return;

    const database = getRealtimeDatabase() || getDatabase();
    const isPausedRef = ref(database, `blitzRooms/${roomId}/isPaused`);
    await set(isPausedRef, !room.isPaused);
  }, [roomId, room]);

  return {
    room,
    playerId,
    playerName,
    isReady,
    error,
    joinBlitzRoom,
    leaveBlitzRoom,
    selectBlitzTeam,
    startBlitzGame,
    tapBlitzCard,
    nextBlitzRound,
    resetBlitzGame,
    kickBlitzPlayer,
    togglePauseBlitzGame
  };
}

// دالة مساعدة لجلب البيانات (للتحقق البسيط)
async function get(reference: any) {
  const { get: fbGet } = await import("firebase/database");
  return fbGet(reference);
}
