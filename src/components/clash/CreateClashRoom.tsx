"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDatabase, ref, set } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { useGameRoom } from "../../context/game-room-context";
import { getRealtimeDatabase } from "../../lib/firebase";
import { createRoomId } from "../../lib/game";
import type { ClashRoomState } from "../../types/organClash";

export function CreateClashRoomButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { playerId, playerName, firebaseReady, isBusy } = useGameRoom();
  const [isOpen, setIsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rulesTab, setRulesTab] = useState<"rules" | "types" | "cards">("rules");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [initialHandSize, setInitialHandSize] = useState(5);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState(30);
  const [organsCount, setOrgansCount] = useState(7);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const rulesParam = searchParams.get("rules");
    if (rulesParam === "clash") {
      setIsRulesOpen(true);
    }
  }, [searchParams]);

  function handleCopyLink() {
    const shareUrl = `${window.location.origin}${window.location.pathname}?rules=clash`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const disabled = isBusy || !firebaseReady || !playerName || creating;

  async function handleInitializeLobby() {
    if (disabled) return;
    setCreating(true);

    try {
      const database = getRealtimeDatabase() || getDatabase();
      const roomId = createRoomId();

      const initialRoom: ClashRoomState = {
        roomId,
        status: "lobby",
        players: {
          [playerId]: {
            id: playerId,
            name: playerName,
            organs: [],
            hand: [],
            isZombie: false,
            isHost: true,
          },
        },
        presence: {
          [playerId]: true,
        },
        drawPile: [],
        discardPile: [],
        currentTurnPlayerId: "",
        turnPhase: "draw",
        winnerId: null,
        settings: {
          maxPlayers,
          initialHandSize,
          turnTimerSeconds: Math.max(5, Math.min(300, turnTimerSeconds || 30)),
          organsCount,
        },
      };

      // حفظ الغرفة في Firebase والتوجيه للمسار الديناميكي
      await set(ref(database, `clashRooms/${roomId}`), initialRoom);
      setIsOpen(false);
      router.push(`/clash/${roomId}`);
    } catch (error) {
      console.error("Failed to launch Organ Clash room:", error);
      alert(
        "تعذر إنشاء غرفة صراع الأعضاء: " +
        (error instanceof Error ? error.message : "خطأ غير معروف")
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 w-full">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={disabled}
          className="flex-1 rounded-2xl border border-rose-500/30 bg-rose-950/20 px-5 py-4 text-base font-black text-rose-300 transition hover:bg-rose-950/40 hover:border-rose-500 disabled:cursor-not-allowed disabled:bg-rose-950/10 disabled:text-rose-300/40"
        >
          العب صراع الأعضاء
        </button>
        <button
          type="button"
          onClick={() => setIsRulesOpen(true)}
          className="w-14 rounded-2xl border border-rose-500/30 bg-rose-950/20 flex items-center justify-center text-rose-300 hover:bg-rose-950/40 hover:border-rose-500 transition text-xl font-black cursor-pointer shadow-lg shadow-rose-950/20"
          title="كيفية اللعب وقوانين صراع الأعضاء"
        >
          ؟
        </button>
      </div>

      {/* نافذة قوانين اللعبة */}
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
              className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-5 md:p-7 shadow-2xl text-[#F8FAFC] flex flex-col max-h-[85vh]"
            >
              {/* الهيدر العلوي */}
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5 select-none gap-4">
                <h2 className="text-lg md:text-xl font-black text-rose-400 text-right">
                  دليل وقوانين لعبة صراع الأعضاء
                </h2>
                <div className="flex gap-2 flex-shrink-0">
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
              </div>

              {/* أزرار التبويب */}
              <div className="flex bg-slate-950/50 border border-white/5 rounded-2xl p-1 mb-5 select-none text-xs md:text-sm font-black">
                <button
                  type="button"
                  onClick={() => setRulesTab("rules")}
                  className={`flex-1 py-2 text-center rounded-xl transition ${rulesTab === "rules"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  قوانين اللعبة
                </button>
                <button
                  type="button"
                  onClick={() => setRulesTab("types")}
                  className={`flex-1 py-2 text-center rounded-xl transition ${rulesTab === "types"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  أنواع الكروت
                </button>
                <button
                  type="button"
                  onClick={() => setRulesTab("cards")}
                  className={`flex-1 py-2 text-center rounded-xl transition ${rulesTab === "cards"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  شرح الكروت
                </button>
              </div>

              {/* محتوى التبويبات مع سكرول خارجي */}
              <div className="flex-1 overflow-y-auto pr-1 text-right text-sm leading-relaxed space-y-4 scrollbar-thin">
                {rulesTab === "rules" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                      <h3 className="font-black text-rose-300 text-base mb-2">🎯 الهدف من اللعبة</h3>
                      <p className="text-slate-350">
                        هدف اللعبة هو حماية أعضاء جسدك بالكامل من الإصابة بالاعتلالات أو الموت، وفي الوقت نفسه مهاجمة أعضاء منافسيك وتدميرها. اللاعب الأخير الذي يتبقى لديه عضو واحد على الأقل حي (يمتلك HP أكبر من 0) هو الفائز بالمعركة!
                      </p>
                    </div>

                    <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                      <h3 className="font-black text-rose-300 text-base mb-2">🔄 طريقة اللعب وسير الدور</h3>
                      <ul className="list-disc list-inside space-y-2 text-slate-350 mr-2">
                        <li>
                          <strong>سحب الكروت:</strong> في بداية دورك، تسحب كروت تلقائياً حتى يكتمل عدد الكروت بيدك (العدد الافتراضي 5 كروت).
                        </li>
                        <li>
                          <strong>لعب الكروت:</strong> في دورك، يمكنك اختيار كارت واحد من يدك لتلعبه. إذا لعبت كارت، ينتهي دورك فوراً وينتقل للاعب التالي.
                        </li>
                        <li>
                          <strong>تخطي الدور (Discard):</strong> إذا لم تكن قادراً أو راغباً في لعب أي كارت، يجب عليك تحديد كارت واحد من يدك وإلقائه في كومة المخلفات لتتخطى دورك.
                        </li>
                      </ul>
                    </div>

                    <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4">
                      <h3 className="font-black text-rose-300 text-base mb-2">❤️ الأعضاء ونقاط الحياة (HP)</h3>
                      <p className="text-slate-350">
                        يمتلك كل عضو 2 نقاط حياة (HP) كحد أقصى.
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-slate-350 mr-2">
                        <li><strong className="text-emerald-400">كامل الصحة (2 HP):</strong> يكون العضو سليماً ويتمتع بصحة كاملة.</li>
                        <li><strong className="text-amber-400">مصاب (1 HP):</strong> العضو مهدد ولديه اعتلال نشط ملتصق به.</li>
                        <li><strong className="text-rose-500">مدمر (0 HP):</strong> يموت العضو ويخرج من اللعبة ولا يمكن استخدامه إلا إذا أُجريت له عملية جراحية لإحيائه.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {rulesTab === "types" && (
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start bg-rose-950/20 border border-rose-900/40 rounded-2xl p-3.5">
                      <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2.5 py-1 rounded-xl font-black">اعتلال</div>
                      <div className="flex-1">
                        <h4 className="font-black text-[#F8FAFC] text-sm">كروت الاعتلال (Attack Cards)</h4>
                        <p className="text-slate-350 text-xs mt-1">كروت هجومية تُستخدم لإصابة عضو محدد للخصم (القلب، الدماغ، إلخ). تُنقص صحة العضو بمقدار 1 نقطة حياة وتلتصق به كإصابة نشطة.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start bg-emerald-950/20 border border-emerald-900/40 rounded-2xl p-3.5">
                      <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-xl font-black">علاج</div>
                      <div className="flex-1">
                        <h4 className="font-black text-[#F8FAFC] text-sm">كروت العلاج (Cure Cards)</h4>
                        <p className="text-slate-350 text-xs mt-1">تُستخدم لعلاج أعضائك. تزيل الكروت المصابة أو الملتصقة بالعضو وتعيد له 1 نقطة حياة (بحد أقصى 2).</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start bg-amber-950/20 border border-amber-900/40 rounded-2xl p-3.5">
                      <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-1 rounded-xl font-black">حصانة</div>
                      <div className="flex-1">
                        <h4 className="font-black text-[#F8FAFC] text-sm">كروت الحصانة (Immunity Cards)</h4>
                        <p className="text-slate-350 text-xs mt-1">كروت حماية ترتبط بعضوك لتحميه من الاعتلالات والهجمات المستقبلية (مثل اللقاح والنظام الغذائي العضوي).</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start bg-purple-950/20 border border-purple-900/40 rounded-2xl p-3.5">
                      <div className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-2.5 py-1 rounded-xl font-black">تكتيك</div>
                      <div className="flex-1">
                        <h4 className="font-black text-[#F8FAFC] text-sm">كروت التكتيك (Tactical Cards)</h4>
                        <p className="text-slate-350 text-xs mt-1">تؤثر على مجرى اللعبة بالكامل، مثل سرقة الكروت من أيدي المنافسين أو تبادل كامل الأوراق معهم أو إجبارهم على تخطي دورهم.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start bg-sky-950/20 border border-sky-900/40 rounded-2xl p-3.5">
                      <div className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs px-2.5 py-1 rounded-xl font-black">فوري</div>
                      <div className="flex-1">
                        <h4 className="font-black text-[#F8FAFC] text-sm">الكروت الفورية (Instant Cards)</h4>
                        <p className="text-slate-350 text-xs mt-1">يمكن لعبها خارج دورك مباشرة استجابةً لأفعال الخصوم لإبطال هجماتهم أو عكسها عليهم.</p>
                      </div>
                    </div>
                  </div>
                )}

                {rulesTab === "cards" && (
                  <div className="space-y-4 text-xs md:text-sm">
                    {/* كروت الاعتلال الخاصة بالأعضاء */}
                    <div>
                      <h4 className="font-black text-rose-500 text-sm border-b border-white/10 pb-1.5 mb-2">🔴 كروت اعتلال الأعضاء (تستهدف أعضاء محددة)</h4>
                      <p className="text-slate-400 text-xs mb-2">تُسبب ضرراً بمقدار -1 HP للعضو المستهدف ولا تصيب غيره:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-rose-900/30">
                          <strong className="text-rose-300 text-xs block">❤️ القلب:</strong>
                          <span className="text-slate-350 text-[11px] leading-relaxed">جرعة كافيين زائدة / قلب مكسور / انسداد كوليسترول</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-rose-900/30">
                          <strong className="text-rose-300 text-xs block">🧠 الدماغ:</strong>
                          <span className="text-slate-350 text-[11px] leading-relaxed">أرق / تجمد الدماغ / نوبة نسيان</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-rose-900/30">
                          <strong className="text-rose-300 text-xs block">🧪 الكبد:</strong>
                          <span className="text-slate-350 text-[11px] leading-relaxed">جرعة سامة / كبد دهني</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-rose-900/30">
                          <strong className="text-rose-300 text-xs block">🫁 الرئتين:</strong>
                          <span className="text-slate-350 text-[11px] leading-relaxed">سحابة دخان / نوبة سعال</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-rose-900/30">
                          <strong className="text-rose-300 text-xs block">🍕 المعدة:</strong>
                          <span className="text-slate-350 text-[11px] leading-relaxed">طعام حار / تسمم غذائي</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-rose-900/30">
                          <strong className="text-rose-300 text-xs block">💧 الكلى:</strong>
                          <span className="text-slate-350 text-[11px] leading-relaxed">حصوة كلى / جفاف</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-rose-900/30 md:col-span-2">
                          <strong className="text-rose-300 text-xs block">🧬 الأمعاء:</strong>
                          <span className="text-slate-350 text-[11px] leading-relaxed">التهاب زائدة</span>
                        </div>
                      </div>
                    </div>

                    {/* هجوم عام */}
                    <div>
                      <h4 className="font-black text-rose-450 text-sm border-b border-white/10 pb-1.5 mb-2">💥 هجوم عام (أقوى أنواع الهجوم)</h4>
                      <div className="space-y-2">
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-rose-500/10">
                          <strong className="text-rose-300 text-xs block">التهاب حاد:</strong>
                          <span className="text-slate-350 text-[11px]">يستهدف أي عضو ويسبب له -1 صحة، ويدمر أي لقاح أو نظام غذائي عليه بالكامل دون إمكانية إلغائه بكروت المقاطعة.</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-rose-500/10">
                          <strong className="text-rose-300 text-xs block">ورم:</strong>
                          <span className="text-slate-350 text-[11px]">يستهدف أي عضو ويسبب له -2 صحة فوراً (تدمير كامل)، ويلغي الحصانة ولا يمكن مقاطعته.</span>
                        </div>
                      </div>
                    </div>

                    {/* العلاج */}
                    <div>
                      <h4 className="font-black text-emerald-400 text-sm border-b border-white/10 pb-1.5 mb-2">💚 كروت العلاج المتقدمة</h4>
                      <div className="space-y-2">
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-emerald-500/10">
                          <strong className="text-emerald-300 text-xs block">مضاد حيوي:</strong>
                          <span className="text-slate-350 text-[11px]">يزيل اعتلالاً نشطاً واحداً عن أي عضو ويعالجه +1 صحة.</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-emerald-500/10">
                          <strong className="text-emerald-300 text-xs block">جرعة فيتامين:</strong>
                          <span className="text-slate-350 text-[11px]">تزيد صحة أي عضو غير مصاب بمقدار +1.</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-emerald-500/10">
                          <strong className="text-emerald-300 text-xs block">عناية مركزة (ICU):</strong>
                          <span className="text-slate-350 text-[11px]">تعيد العضو شبه الميت (1 HP) إلى كامل صحته القصوى (2 HP) فوراً.</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-emerald-500/10">
                          <strong className="text-emerald-300 text-xs block">عملية جراحية:</strong>
                          <span className="text-slate-350 text-[11px]">تُحيي العضو المدمر بالكامل (0 HP) وتعيده للعب بصحة 1 HP.</span>
                        </div>
                      </div>
                    </div>

                    {/* الكروت الفورية باللون الأزرق */}
                    <div>
                      <h4 className="font-black text-sky-400 text-sm border-b border-white/10 pb-1.5 mb-2">🔵 الكروت الفورية</h4>
                      <div className="space-y-2">
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-sky-500/20">
                          <strong className="text-sky-300 text-xs block">أجسام مضادة:</strong>
                          <span className="text-slate-350 text-[11px]">تُلعب خارج دورك فور تعرضك للهجوم لإلغاء وإبطال الهجوم القادم تماماً.</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-sky-500/20">
                          <strong className="text-sky-300 text-xs block">عدوى متحورة:</strong>
                          <span className="text-slate-350 text-[11px]">تُلعب خارج دورك لعكس الهجوم الموجه إليك ليصيب اللاعب الذي هاجمك بدلاً منك.</span>
                        </div>
                      </div>
                    </div>

                    {/* كروت التكتيك باللون البنفسجي */}
                    <div>
                      <h4 className="font-black text-purple-400 text-sm border-b border-white/10 pb-1.5 mb-2">🔮 كروت التكتيك</h4>
                      <div className="space-y-2">
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-purple-500/20">
                          <strong className="text-purple-300 text-xs block">سرقة:</strong>
                          <span className="text-slate-350 text-[11px]">تأخذ كارت عشوائي واحد من يد الخصم المختار وتضيفه ليدك.</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-purple-500/20">
                          <strong className="text-purple-300 text-xs block">تخدير عام:</strong>
                          <span className="text-slate-350 text-[11px]">تجبر جميع اللاعبين على تفويت أدوارهم، ليصبح دورك التالي مباشرة.</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-purple-500/20">
                          <strong className="text-purple-300 text-xs block">تبادل الأيدي:</strong>
                          <span className="text-slate-350 text-[11px]">تُبدل جميع كروت يدك الحالية بكروت يد خصمك بالكامل.</span>
                        </div>
                        <div className="bg-slate-950/30 p-2.5 rounded-xl border border-purple-500/20">
                          <strong className="text-purple-300 text-xs block">سحب مزدوج:</strong>
                          <span className="text-slate-350 text-[11px]">تسمح لك بسحب كارتين إضافيين لتوسيع يدك خلال دورك الحالي.</span>
                        </div>
                      </div>
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

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            {/* الخلفية القابلة للنقر للإغلاق */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 cursor-pointer"
            />

            {/* محتوى النافذة المنبثقة */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl md:p-8 text-[#F8FAFC]"
            >
              <h2 className="text-2xl font-black text-rose-400 mb-6 text-center">
                إعداد لعبة صراع الأعضاء
              </h2>

              {/* تحديد عدد اللاعبين */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  الحد الأقصى للاعبين: {maxPlayers} لاعبين
                </label>
                <div className="flex gap-2 justify-center">
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxPlayers(num)}
                      className={`flex-1 py-2 text-sm font-bold rounded-xl transition ${maxPlayers === num
                        ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* حجم اليد الابتدائي */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  عدد الكروت البدائية في اليد: {initialHandSize} كروت
                </label>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={initialHandSize}
                  onChange={(e) => setInitialHandSize(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>3 كروت</span>
                  <span>5 كروت (افتراضي)</span>
                  <span>8 كروت</span>
                </div>
              </div>

              {/* مؤقت دور اللاعب بالثواني */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  مؤقت دور اللاعب (بالثواني):
                </label>
                <div className="flex gap-2 items-center bg-slate-800 rounded-xl p-1 border border-white/5">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={turnTimerSeconds || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTurnTimerSeconds(val === "" ? 0 : Number(val) || 0);
                    }}
                    onBlur={() => setTurnTimerSeconds((prev) => Math.max(5, Math.min(300, prev || 30)))}
                    className="w-full bg-transparent px-3 py-2 text-sm text-[#F8FAFC] outline-none text-center font-bold font-mono"
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1 text-right">
                  الحد الأدنى 5 ثوانٍ، الأقصى 300 ثانية.
                </div>
              </div>

              {/* تحديد عدد الأعضاء لكل لاعب */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  عدد الأعضاء لكل لاعب: {organsCount} أعضاء
                </label>
                <div className="flex gap-1.5 justify-center">
                  {[3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setOrgansCount(num)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${organsCount === num
                        ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={handleInitializeLobby}
                  disabled={creating}
                  className="flex-1 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-500 shadow-lg shadow-rose-600/20 disabled:bg-rose-800 disabled:cursor-not-allowed"
                >
                  {creating ? "جاري إنشاء الغرفة..." : "إنشاء الغرفة والبدء"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={creating}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

