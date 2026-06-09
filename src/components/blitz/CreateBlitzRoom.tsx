"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDatabase, ref, set } from "firebase/database";
import { useGameRoom } from "../../context/game-room-context";
import { getRealtimeDatabase } from "../../lib/firebase";
import { createRoomId, shuffleList } from "../../lib/game";
import { IRAQI_WORDS_BY_CATEGORY } from "../../lib/words";
import { getBlitzCategoriesByPool, BLITZ_POOL_LABELS } from "../../lib/blitz-categories";
import type { BlitzCard, BlitzRoomPlayer, BlitzRoomState } from "../../types/game";

export function CreateBlitzRoomButton() {
  const router = useRouter();
  const { playerId, playerName, firebaseReady, isBusy } = useGameRoom();
  const [isOpen, setIsOpen] = useState(false);
  const [roundTimer, setRoundTimer] = useState(30);
  const [scoreLimit, setScoreLimit] = useState(15);
  const [selectedPool, setSelectedPool] = useState("all");
  const [teamCount, setTeamCount] = useState(3);
  const [creating, setCreating] = useState(false);

  const disabled = isBusy || !firebaseReady || !playerName || creating;

  async function handleLaunchLobby() {
    if (disabled) return;

    setCreating(true);
    try {
      const database = getRealtimeDatabase() || getDatabase();
      const roomId = createRoomId();

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
        winner: null
      };

      // 4. حفظ الغرفة في Firebase والتوجيه للمسار الديناميكي
      await set(ref(database, `blitzRooms/${roomId}`), initialRoom);

      setIsOpen(false);
      router.push(`/blitz/${roomId}`);
    } catch (error) {
      console.error("Failed to launch Blitz room:", error);
      alert("تعذر إنشاء غرفة بليتز: " + (error instanceof Error ? error.message : "خطأ غير معروف"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full rounded-2xl border border-[#EF4444]/30 bg-[#7F1D1D]/20 px-5 py-4 text-base font-black text-[#FCA5A5] transition hover:bg-[#7F1D1D]/45 hover:border-[#EF4444] disabled:cursor-not-allowed disabled:bg-[#7F1D1D]/10 disabled:text-[#FCA5A5]/40"
      >
        العب Blitz
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/85 px-4 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md scale-100 rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl transition-all duration-300 md:p-8">
            <div className="text-right">
              <h2 className="text-2xl font-black text-[#F8FAFC] flex items-center gap-2">
                <span>اللعب</span>
                <span className="text-[#EF4444]">Blitz</span>
              </h2>
              <p className="mt-1.5 text-xs font-semibold text-[#94A3B8]">
                تنافسوا في السرعة لتخمين الكلمات المرتبطة بالفئة الهدف مباشرة وفي نفس اللحظة!
              </p>
            </div>

            {/* إعداد مؤقت الجولة */}
            <div className="mt-6 text-right">
              <label className="flex items-center justify-between text-sm font-bold text-[#F8FAFC]">
                <span>وقت الجولة</span>
                <span className="text-[#EF4444] font-black">{roundTimer} ثانية</span>
              </label>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={roundTimer}
                onChange={(e) => setRoundTimer(Number(e.target.value))}
                className="mt-2 w-full accent-[#EF4444] bg-[#0F172A] h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* إعداد حد النقاط للفوز */}
            <div className="mt-5 text-right">
              <label className="flex items-center justify-between text-sm font-bold text-[#F8FAFC]">
                <span>نقاط الفوز (الهدف)</span>
                <span className="text-[#EF4444] font-black">{scoreLimit} نقطة</span>
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={scoreLimit}
                onChange={(e) => setScoreLimit(Number(e.target.value))}
                className="mt-2 w-full accent-[#EF4444] bg-[#0F172A] h-2 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* إعداد عدد الفرق */}
            <div className="mt-5 text-right">
              <p className="text-sm font-bold text-[#F8FAFC]">عدد الفرق</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[2, 3].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTeamCount(count)}
                    className={`rounded-2xl py-3 text-sm font-bold transition ${teamCount === count
                      ? "bg-[#EF4444] text-[#F8FAFC]"
                      : "border border-white/10 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-white/5"
                      }`}
                  >
                    {count} فرق
                  </button>
                ))}
              </div>
            </div>

            {/* مجمع الفئات */}
            <div className="mt-5 text-right">
              <label className="text-sm font-bold text-[#F8FAFC]">مجمع الفئات المستهدفة</label>
              <select
                value={selectedPool}
                onChange={(e) => setSelectedPool(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-[#F8FAFC] outline-none transition focus:border-[#EF4444]"
              >
                {Object.entries(BLITZ_POOL_LABELS).map(([key, label]) => (
                  <option key={key} value={key} className="bg-[#1E293B]">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* أزرار الإجراءات */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={handleLaunchLobby}
                disabled={creating}
                className="flex-1 rounded-2xl bg-[#EF4444] px-5 py-3.5 text-sm font-black text-[#F8FAFC] transition hover:bg-[#DC2626] disabled:cursor-not-allowed disabled:bg-[#EF4444]/40"
              >
                {creating ? "جاري إنشاء الغرفة..." : "بدء اللوبي 🚀"}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={creating}
                className="rounded-2xl border border-white/10 px-5 py-3.5 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#0F172A]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
