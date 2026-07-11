"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDatabase, ref, set } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { useGameRoom } from "../../context/game-room-context";
import { getRealtimeDatabase } from "../../lib/firebase";
import { createRoomId, shuffleList } from "../../lib/game";
import { IRAQI_WORDS_BY_CATEGORY } from "../../lib/words";
import { getBlitzCategoriesByPool } from "../../lib/blitz-categories";
import type { BlitzCard, BlitzRoomPlayer, BlitzRoomState } from "../../types/game";

export function CreateBlitzRoomButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { playerId, playerName, firebaseReady, isBusy } = useGameRoom();
  const [creating, setCreating] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rulesTab, setRulesTab] = useState<"rules" | "gameplay">("rules");

  useEffect(() => {
    const rulesParam = searchParams.get("rules");
    if (rulesParam === "blitz") {
      setIsRulesOpen(true);
    }
  }, [searchParams]);

  function handleCopyLink() {
    const shareUrl = `${window.location.origin}${window.location.pathname}?rules=blitz`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
    <>
      <div className="flex gap-2 w-full">
        <button
          type="button"
          onClick={handleLaunchLobby}
          disabled={disabled}
          className="flex-1 rounded-2xl border border-[#EF4444]/30 bg-[#7F1D1D]/20 px-5 py-4 text-base font-black text-[#FCA5A5] transition hover:bg-[#7F1D1D]/45 hover:border-[#EF4444] disabled:cursor-not-allowed disabled:bg-[#7F1D1D]/10 disabled:text-[#FCA5A5]/40"
        >
          {creating ? "جاري إنشاء الغرفة..." : "العب بليتز"}
        </button>
        <button
          type="button"
          onClick={() => setIsRulesOpen(true)}
          className="w-14 rounded-2xl border border-[#EF4444]/30 bg-[#7F1D1D]/20 flex items-center justify-center text-[#FCA5A5] hover:bg-[#7F1D1D]/45 hover:border-[#EF4444] transition text-xl font-black cursor-pointer shadow-lg shadow-rose-950/20"
          title="كيفية اللعب وقوانين بليتز"
        >
          ؟
        </button>
      </div>

      {/* نافذة قوانين صراع السرعة */}
      <AnimatePresence>
        {isRulesOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRulesOpen(false)}
              className="absolute inset-0 cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 p-5 md:p-7 shadow-2xl text-[#F8FAFC] flex flex-col max-h-[80vh]"
            >
              {/* أزرار التحكم العلوية (النسخ والإغلاق) */}
              <div className="absolute left-4 top-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex h-8 px-3 items-center justify-center rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer gap-1.5"
                >
                  <span>{copied ? "تم النسخ!" : "نسخ الرابط"}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRulesOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-xl font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                >
                  ×
                </button>
              </div>

              <h2 className="text-xl md:text-2xl font-black text-[#FCA5A5] mb-4 text-center">
                دليل وقوانين لعبة صراع السرعة (بليتز)
              </h2>

              {/* أزرار التبويب */}
              <div className="flex bg-slate-950/50 border border-white/5 rounded-2xl p-1 mb-5 select-none text-xs md:text-sm font-black">
                <button
                  type="button"
                  onClick={() => setRulesTab("rules")}
                  className={`flex-1 py-2 text-center rounded-xl transition ${
                    rulesTab === "rules"
                      ? "bg-[#EF4444] text-white shadow-lg shadow-red-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  قوانين اللعبة
                </button>
                <button
                  type="button"
                  onClick={() => setRulesTab("gameplay")}
                  className={`flex-1 py-2 text-center rounded-xl transition ${
                    rulesTab === "gameplay"
                      ? "bg-[#EF4444] text-white shadow-lg shadow-red-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  طريقة اللعب
                </button>
              </div>

              {/* محتوى التبويبات */}
              <div className="flex-1 overflow-y-auto pr-1 text-right text-sm leading-relaxed space-y-4 scrollbar-thin">
                {rulesTab === "rules" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                      <h3 className="font-black text-[#FCA5A5] text-base mb-2">🎯 الهدف من اللعبة</h3>
                      <p className="text-slate-350">
                        هدف اللعبة هو العثور على جميع الكلمات الصحيحة التي تتبع الفئة المطلوبة بأسرع وقت ممكن قبل أن تكتشفها الفرق الأخرى. كل تخمين صحيح يمنح فريقك نقاطاً، وأول فريق يحصد النقاط المطلوبة (الافتراضي 15 نقطة) يفوز باللعبة بالكامل!
                      </p>
                    </div>

                    <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                      <h3 className="font-black text-[#FCA5A5] text-base mb-2">👥 تقسيم الفرق</h3>
                      <p className="text-slate-350">
                        يمكن للاعبين تقسيم أنفسهم في اللوبي إلى فريقين (الأحمر والأزرق) أو ثلاثة فرق (الأحمر، الأزرق، والأخضر)، أو اللعب بشكل عشوائي.
                      </p>
                    </div>

                    <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                      <h3 className="font-black text-[#FCA5A5] text-base mb-2">⏳ مؤقت الجولة</h3>
                      <p className="text-slate-350">
                        كل جولة لها وقت محدد (افتراضياً 30 ثانية). يجب العثور على أكبر عدد من الكلمات الصحيحة قبل انتهاء المؤقت.
                      </p>
                    </div>
                  </div>
                )}

                {rulesTab === "gameplay" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                      <h3 className="font-black text-[#FCA5A5] text-base mb-2">🎴 لوحة اللعب</h3>
                      <p className="text-slate-350">
                        ستظهر أمامك شبكة 5x5 تحتوي على 25 بطاقة كلمات، منها كلمات صحيحة تنتمي للفئة، وكلمات مشتتة وخاطئة لإرباك اللاعبين.
                      </p>
                    </div>

                    <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                      <h3 className="font-black text-[#FCA5A5] text-base mb-2">☝️ التفاعل مع البطاقات</h3>
                      <ul className="list-disc list-inside space-y-2 text-slate-350 mr-2">
                        <li>
                          <strong>عند الضغط على كلمة صحيحة:</strong> تُلون البطاقة بلون فريقك فوراً وتمنح فريقك <strong>+1 نقطة</strong>.
                        </li>
                        <li>
                          <strong>عند الضغط على كلمة خاطئة:</strong> تُلون البطاقة باللون الرمادي (مشتت)، وتخسر فرصة الحصول على نقاط منها.
                        </li>
                      </ul>
                    </div>

                    <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                      <h3 className="font-black text-[#FCA5A5] text-base mb-2">⚡ اللعب المتزامن والسريع</h3>
                      <p className="text-slate-350">
                        لا يوجد أدوار في صراع السرعة! اللعب مفتوح ومتزامن لجميع اللاعبين والفرق في نفس الوقت. من يلمح الكلمة الصحيحة أولاً ويضغط عليها يظفر بنقطتها لفريقه!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* زر إغلاق سفلي */}
              <div className="mt-6 border-t border-white/10 pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsRulesOpen(false)}
                  className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white cursor-pointer"
                >
                  فهمت ذلك!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
