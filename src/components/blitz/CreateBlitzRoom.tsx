"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDatabase, ref, set } from "firebase/database";
import { useGameRoom } from "../../context/game-room-context";
import { getRealtimeDatabase } from "../../lib/firebase";
import { createRoomId, shuffleList } from "../../lib/game";
import { IRAQI_WORDS_BY_CATEGORY } from "../../lib/words";
import { getBlitzCategoriesByPool } from "../../lib/blitz-categories";
import type { BlitzCard, BlitzRoomPlayer, BlitzRoomState } from "../../types/game";

export function CreateBlitzRoomButton() {
  const router = useRouter();
  const { playerId, playerName, firebaseReady, isBusy } = useGameRoom();
  const [creating, setCreating] = useState(false);

  const disabled = isBusy || !firebaseReady || !playerName || creating;

  async function handleLaunchLobby() {
    if (disabled) return;

    setCreating(true);
    try {
      const database = getRealtimeDatabase() || getDatabase();
      const roomId = createRoomId();

      // الإعدادات الافتراضية عند الإنشاء الفوري
      const roundTimer = 30;
      const scoreLimit = 15;
      const selectedPool = "all";
      const teamCount = 2;

      // 1. جلب فئات الكلمات وتحديد واحدة عشوائية
      const categories = getBlitzCategoriesByPool(selectedPool);
      if (categories.length === 0) {
        throw new Error("لا توجد فئات متاحة في هذا المجمع.");
      }
      const category = categories[Math.floor(Math.random() * categories.length)];

      // 2. توليد شبكة الكلمات الآمنة (Safe Distractors System)
      const correctWords = [...category.correct_words];
      const blacklist = new Set(category.blacklist || []);
      const correctSet = new Set(correctWords);

      // جلب بنك الكلمات العامة
      const generalBank = IRAQI_WORDS_BY_CATEGORY.General || [];

      // تصفية الكلمات العامة لمنع التداخل اللفظي والدلالي
      const safeDistractors = generalBank.filter(
        (word) => !correctSet.has(word) && !blacklist.has(word)
      );

      // خلط المشتتات وأخذ العدد الكافي لإكمال 25 بطاقة
      const distractorsCount = Math.max(0, 25 - correctWords.length);
      const shuffledDistractors = shuffleList(safeDistractors);
      const chosenDistractors = shuffledDistractors.slice(0, distractorsCount);

      // دمج الكلمات الصحيحة والمشتتات
      const finalWordsList = [
        ...correctWords.map((word) => ({ word, isCorrect: true })),
        ...chosenDistractors.map((word) => ({ word, isCorrect: false }))
      ];

      // خلط القائمة النهائية عشوائياً (Fisher-Yates) لتوزيعها في الشبكة 5x5
      const shuffledFinalWords = shuffleList(finalWordsList);

      const grid: BlitzCard[] = shuffledFinalWords.map((item, index) => ({
        id: index,
        word: item.word,
        isCorrect: item.isCorrect,
        clickedBy: null
      }));

      // 3. إنشاء كائن الغرفة
      const host: BlitzRoomPlayer = {
        id: playerId,
        name: playerName,
        team: "unassigned",
        isHost: true
      };

      const initialRoom: BlitzRoomState = {
        roomId,
        status: "lobby",
        currentCategory: category.target_word,
        timer: roundTimer,
        scores: { red: 0, blue: 0, green: 0 },
        grid,
        settings: {
          roundTimerSeconds: roundTimer,
          scoreLimit,
          categoryPools: [selectedPool],
          teamCount
        },
        players: {
          [playerId]: host
        },
        presence: {
          [playerId]: true
        },
        winner: null,
        usedCategories: [category.category_id]
      };


      // 4. حفظ الغرفة في Firebase والتوجيه للمسار الديناميكي
      await set(ref(database, `blitzRooms/${roomId}`), initialRoom);

      router.push(`/blitz/${roomId}`);
    } catch (error) {
      console.error("Failed to launch Blitz room:", error);
      alert("تعذر إنشاء غرفة بليتز: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLaunchLobby}
      disabled={disabled}
      className="w-full rounded-2xl border border-[#EF4444]/30 bg-[#7F1D1D]/20 px-5 py-4 text-base font-black text-[#FCA5A5] transition hover:bg-[#7F1D1D]/45 hover:border-[#EF4444] disabled:cursor-not-allowed disabled:bg-[#7F1D1D]/10 disabled:text-[#FCA5A5]/40"
    >
      {creating ? "جاري إنشاء الغرفة..." : "العب بليتز"}
    </button>
  );
}
