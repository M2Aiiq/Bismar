"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClashRoom } from "../../hooks/use-clash-room";
import { motion, AnimatePresence } from "framer-motion";
import type { ActionCard, OrganCard } from "../../types/organClash";

interface ClashBoardScreenProps {
  roomId: string;
}

export function ClashBoardScreen({ roomId }: ClashBoardScreenProps) {
  const router = useRouter();
  const {
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
  } = useClashRoom(roomId);

  const [lobbyName, setLobbyName] = useState("");
  const [selectedCard, setSelectedCard] = useState<ActionCard | null>(null);
  const [targetSelectorOpen, setTargetSelectorOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  const me = room?.players?.[playerId];
  const isHost = me?.isHost || false;
  const isMyTurn = room?.currentTurnPlayerId === playerId;
  const activePlayerName = room?.players?.[room.currentTurnPlayerId]?.name || "غير معروف";

  // 1. الانضمام التلقائي للوبي إذا لم نكن مسجلين
  useEffect(() => {
    if (isReady && room && !me && playerName) {
      void joinClashRoom(playerName);
    }
  }, [isReady, room, me, playerName, joinClashRoom]);

  // 2. السحب التلقائي للكارت عند بدء دور اللاعب
  useEffect(() => {
    if (room?.status === "playing" && room?.turnPhase === "draw" && isMyTurn) {
      const timer = setTimeout(() => {
        void drawCardAuto();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [room?.status, room?.turnPhase, isMyTurn, drawCardAuto]);

  // 3. معالجة مؤقت الحركة المعلقة والمقاطعة
  useEffect(() => {
    if (!room?.pendingAction) {
      setTargetSelectorOpen(false);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((room.pendingAction!.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // تنفيذ الحركة إذا انتهى الوقت وكنا المضيف أو صاحب الدور
        if (room.currentTurnPlayerId === playerId || room.players?.[playerId]?.isHost) {
          void commitPendingAction();
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [room?.pendingAction, room?.currentTurnPlayerId, playerId, commitPendingAction]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0F172A] text-slate-200">
        <div className="rounded-3xl border border-rose-500/20 bg-rose-950/20 p-8 text-center max-w-md shadow-2xl">
          <p className="text-xl font-bold text-rose-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="rounded-2xl bg-rose-600 px-6 py-2 font-bold text-white transition hover:bg-rose-500"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F172A] text-slate-400 font-bold">
        جاري تحميل الغرفة...
      </div>
    );
  }

  // 4. واجهة اللوبي (Lobby State)
  if (room.status === "lobby") {
    return (
      <div className="flex h-screen flex-col bg-[#0F172A] text-[#F8FAFC] overflow-hidden">
        {/* شريط علوي */}
        <div className="flex items-center justify-between border-b border-white/5 bg-[#1E293B]/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-rose-600/20 px-3 py-1 text-sm font-bold text-rose-400 border border-rose-600/30">
              صراع الأعضاء
            </span>
            <span className="text-sm font-medium text-slate-400">كود الغرفة: {room.roomId}</span>
          </div>
          <button
            onClick={leaveClashRoom}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            خروج
          </button>
        </div>

        {/* جسم اللوبي الرئيسي */}
        <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 max-w-6xl mx-auto w-full overflow-y-auto">
          {/* قائمة اللاعبين */}
          <div className="flex-1 rounded-3xl border border-white/5 bg-[#1E293B]/30 p-6 flex flex-col">
            <h3 className="text-xl font-black text-rose-400 mb-4">اللاعبون المتصلون</h3>
            <div className="flex-1 flex flex-col gap-3">
              {Object.values(room.players).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-2xl bg-[#0F172A] p-4 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold">{p.name}</span>
                    {p.isHost && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30">
                        مضيف
                      </span>
                    )}
                  </div>
                  {isHost && p.id !== playerId && (
                    <button
                      onClick={() => kickClashPlayer(p.id)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-400"
                    >
                      طرد
                    </button>
                  )}
                </div>
              ))}

              {/* خانات انتظار خالية */}
              {Array.from({ length: Math.max(0, (room.settings?.maxPlayers || 4) - Object.keys(room.players).length) }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm font-semibold text-slate-600"
                >
                  بانتظار لاعب آخر...
                </div>
              ))}
            </div>
          </div>

          {/* لوحة التحكم والإعدادات */}
          <div className="w-full md:w-80 rounded-3xl border border-white/5 bg-[#1E293B]/30 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-300 mb-4">تفاصيل المباراة</h3>
              <div className="space-y-4 text-sm font-medium text-slate-400">
                <div className="flex justify-between">
                  <span>الحد الأقصى للاعبين:</span>
                  <span className="text-[#F8FAFC]">{room.settings?.maxPlayers || 4} لاعبين</span>
                </div>
                <div className="flex justify-between">
                  <span>الكروت البدائية باليد:</span>
                  <span className="text-[#F8FAFC]">{room.settings?.initialHandSize || 5} كروت</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {isHost ? (
                <button
                  onClick={() => startClashGame(room.settings.maxPlayers, room.settings.initialHandSize)}
                  disabled={Object.keys(room.players).length < 2}
                  className="w-full rounded-2xl bg-rose-600 py-4 font-bold text-white transition hover:bg-rose-500 disabled:bg-rose-900 disabled:cursor-not-allowed"
                >
                  بدء المعركة الآن
                </button>
              ) : (
                <div className="text-center text-sm text-slate-500 font-semibold py-4 animate-pulse">
                  بانتظار مضيف الغرفة لبدء اللعب...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. واجهة اللعب الأساسية (Playing State)
  const opponents = Object.values(room.players).filter((p) => p.id !== playerId);

  const handleCardClick = (card: ActionCard) => {
    if (!isMyTurn || room.turnPhase !== "play" || room.pendingAction) return;

    if (card.type === "attack" || card.type === "cure") {
      setSelectedCard(card);
      setTargetSelectorOpen(true);
    } else {
      // كروت بلا فائدة أو فوري ملعوب كخردة
      void playActionCard(card.id);
    }
  };

  const executePlayOnTarget = (targetPid: string, targetOrganId: string) => {
    if (!selectedCard) return;
    void playActionCard(selectedCard.id, targetPid, targetOrganId);
    setSelectedCard(null);
    setTargetSelectorOpen(false);
  };

  // كروت المقاطعة المتوفرة في يد اللاعب الحالي
  const counterCardsInHand = me?.hand?.filter((c) => c.type === "instant") || [];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B0F19] text-[#F8FAFC] flex flex-col">
      {/* 1. منطقة الخصوم (Top Zone - Enemy Radar) */}
      <div className="flex justify-center gap-4 p-4 border-b border-white/5 bg-[#111625]/80 backdrop-blur-sm overflow-x-auto select-none">
        {opponents.map((opp) => (
          <div
            key={opp.id}
            className={`min-w-[160px] rounded-2xl border p-3 bg-[#181E2F]/60 flex flex-col justify-between transition ${
              opp.isZombie
                ? "border-emerald-600/30 bg-emerald-950/10"
                : room.currentTurnPlayerId === opp.id
                ? "border-rose-500 shadow-lg shadow-rose-500/10"
                : "border-white/5"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold truncate max-w-[100px]">{opp.name}</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                🎴 {opp.hand?.length || 0}
              </span>
            </div>

            {/* مؤشرات الأعضاء الأربعة للخصم */}
            <div className="grid grid-cols-4 gap-1">
              {opp.organs?.map((o) => (
                <div
                  key={o.id}
                  title={`${o.name}: ${o.hp} HP`}
                  className={`h-6 rounded-lg flex items-center justify-center border transition ${
                    o.isDead
                      ? "border-slate-800 bg-slate-900/40 text-slate-600 grayscale"
                      : o.hp === 2
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  }`}
                >
                  <span className="text-[10px] font-bold">
                    {o.isDead ? "🔒" : o.id[0].toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            {opp.isZombie && (
              <span className="text-[8px] text-center font-bold text-emerald-400 mt-1 animate-pulse">
                🧟 زومبي تخريبي
              </span>
            )}
          </div>
        ))}
      </div>

      {/* 2. منطقة المعركة واللاعب الحالي (Middle Zone - Player Battlefield) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <h3 className="text-sm font-bold text-slate-500 mb-2 tracking-widest">ساحة المعركة الخاصة بك</h3>

        {/* عرض أعضاء اللاعب الأربعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl select-none">
          {me?.organs?.map((o) => (
            <div
              key={o.id}
              className={`relative rounded-2xl border p-4 flex flex-col items-center justify-between text-center transition h-32 ${
                o.isDead
                  ? "border-slate-800 bg-slate-950/60 text-slate-600 grayscale"
                  : o.hp === 2
                  ? "border-emerald-500/30 bg-emerald-950/20 shadow-lg shadow-emerald-500/5 text-emerald-200"
                  : "border-amber-500/30 bg-amber-950/20 shadow-lg shadow-amber-500/5 text-amber-200"
              }`}
            >
              <span className="text-xs font-bold text-slate-400">{o.name}</span>
              <span className="text-3xl font-black">{o.isDead ? "💀" : o.hp === 2 ? "❤️" : "💔"}</span>
              <div className="flex gap-1">
                <div className={`h-2 w-4 rounded-full ${o.isDead ? "bg-slate-800" : "bg-emerald-500"}`} />
                <div className={`h-2 w-4 rounded-full ${o.isDead ? "bg-slate-800" : o.hp === 2 ? "bg-emerald-500" : "bg-slate-700"}`} />
              </div>
            </div>
          ))}
        </div>

        {/* مؤشر دور اللاعب الحالي */}
        <div className="mt-8 text-center">
          {room.turnPhase === "draw" && (
            <p className="text-sm text-yellow-400 font-bold animate-pulse">
              جاري سحب كارت وتجهيز الدور...
            </p>
          )}
          {room.turnPhase === "play" && (
            <p className="text-sm font-medium text-slate-400">
              الدور الحالي لـ: <span className="font-bold text-rose-400">{isMyTurn ? "دورك أنت" : activePlayerName}</span>
            </p>
          )}
          {room.turnPhase === "pass" && isMyTurn && (
            <button
              onClick={endClashTurn}
              className="mt-2 rounded-2xl bg-rose-600 px-6 py-2.5 font-bold text-white transition hover:bg-rose-500 shadow-lg shadow-rose-600/30"
            >
              إنهاء الدور وتمرير اللعب ➔
            </button>
          )}
        </div>
      </div>

      {/* 3. منطقة اليد المروحية (Bottom Zone - The Fan Deck) */}
      <div className="relative h-60 w-full flex items-end justify-center pb-8 bg-gradient-to-t from-[#090D18] to-transparent">
        {me?.hand && me.hand.length > 0 ? (
          <div className="relative w-full max-w-2xl h-full flex justify-center">
            {me.hand.map((card, index) => {
              const totalCards = me.hand.length;
              // حساب الزاوية والإزاحة لخلق شكل المروحة (Fan Deck)
              const angleStep = Math.min(30 / Math.max(1, totalCards - 1), 8);
              const startAngle = -((totalCards - 1) * angleStep) / 2;
              const rotate = startAngle + index * angleStep;
              const translateY = Math.abs(rotate) * 0.8;
              const translateX = rotate * 2.5;

              // الألوان بناء على النوع
              const borderColors = {
                attack: "border-rose-600/40 hover:border-rose-500",
                cure: "border-emerald-600/40 hover:border-emerald-500",
                instant: "border-sky-600/40 hover:border-sky-500",
                useless: "border-slate-700 hover:border-slate-500",
              };

              const badgeColors = {
                attack: "bg-rose-500/20 text-rose-300",
                cure: "bg-emerald-500/20 text-emerald-300",
                instant: "bg-sky-500/20 text-sky-300",
                useless: "bg-slate-800 text-slate-400",
              };

              return (
                <motion.div
                  key={card.id}
                  style={{
                    position: "absolute",
                    bottom: 0,
                    transformOrigin: "bottom center",
                  }}
                  animate={{
                    rotate: rotate,
                    y: translateY,
                    x: translateX,
                    zIndex: index,
                  }}
                  whileHover={{
                    y: -50,
                    scale: 1.12,
                    zIndex: 100,
                    transition: { type: "spring", stiffness: 300, damping: 15 },
                  }}
                  onClick={() => handleCardClick(card)}
                  className={`w-32 h-44 rounded-2xl border-2 bg-slate-900/95 p-3 flex flex-col justify-between cursor-pointer select-none shadow-2xl transition-all ${
                    borderColors[card.type]
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md self-start ${badgeColors[card.type]}`}>
                      {card.type === "attack" && "هجوم"}
                      {card.type === "cure" && "علاج"}
                      {card.type === "instant" && "فوري"}
                      {card.type === "useless" && "خردة"}
                    </span>
                    <span className="text-xs font-black leading-tight text-white">{card.name}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 leading-normal">{card.description}</span>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-600 animate-pulse">لا توجد كروت في يدك حالياً</div>
        )}
      </div>

      {/* 4. نافذة تحديد الهدف المعلقة (Target Selector Overlay) */}
      <AnimatePresence>
        {targetSelectorOpen && selectedCard && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-center"
            >
              <h3 className="text-lg font-black text-rose-400 mb-2">اختر العضو المستهدف</h3>
              <p className="text-xs text-slate-400 mb-6">لتطبيق كارت: {selectedCard.name}</p>

              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {selectedCard.type === "attack"
                  ? opponents.map((opp) => (
                      <div key={opp.id} className="rounded-2xl border border-white/5 bg-[#181E2F]/40 p-3">
                        <span className="text-xs font-bold block mb-2 text-rose-300">{opp.name}</span>
                        <div className="grid grid-cols-2 gap-2">
                          {opp.organs?.map((o) => (
                            <button
                              key={o.id}
                              disabled={o.isDead}
                              onClick={() => executePlayOnTarget(opp.id, o.id)}
                              className="rounded-xl border border-white/5 bg-slate-800/80 py-2 text-xs font-bold hover:bg-rose-900/30 hover:border-rose-500 disabled:opacity-30 transition"
                            >
                              {o.name} {o.isDead ? "🔒" : `${o.hp}/2HP`}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  : me && (
                      <div className="rounded-2xl border border-white/5 bg-[#181E2F]/40 p-3">
                        <span className="text-xs font-bold block mb-2 text-emerald-300">أعضاؤك الشخصية</span>
                        <div className="grid grid-cols-2 gap-2">
                          {me.organs?.map((o) => (
                            <button
                              key={o.id}
                              disabled={o.isDead || o.hp === 2}
                              onClick={() => executePlayOnTarget(playerId, o.id)}
                              className="rounded-xl border border-white/5 bg-slate-800/80 py-2 text-xs font-bold hover:bg-emerald-900/30 hover:border-emerald-500 disabled:opacity-30 transition"
                            >
                              {o.name} {o.hp}/2HP
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
              </div>

              <button
                onClick={() => {
                  setSelectedCard(null);
                  setTargetSelectorOpen(false);
                }}
                className="mt-6 w-full rounded-2xl border border-white/10 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                إلغاء التحديد
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. شاشة حالة المقاطعة والحدث المعلق (Pending Action Countdown Panel) */}
      <AnimatePresence>
        {room.pendingAction && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border border-rose-500/30 bg-slate-900 p-8 text-center shadow-2xl"
            >
              <span className="text-xs font-bold tracking-widest text-rose-500 uppercase animate-pulse">
                🚨 تنبيه حرج: إجراء معلق 🚨
              </span>

              <h2 className="text-xl font-black mt-4 text-white">
                يلعب{" "}
                <span className="text-rose-400">
                  {room.players?.[room.pendingAction.playerId]?.name || "غير معروف"}
                </span>{" "}
                كارت:
              </h2>
              <p className="text-3xl font-black mt-2 text-rose-300">
                {room.pendingAction.card.name}
              </p>

              <p className="mt-4 text-sm text-slate-400">
                المستهدف:{" "}
                <span className="font-bold text-white">
                  {room.players?.[room.pendingAction.targetPlayerId || ""]?.name || "نفسه"}
                </span>{" "}
                (عضو{" "}
                <span className="font-bold text-white">
                  {room.pendingAction.targetOrganId === "heart" && "القلب"}
                  {room.pendingAction.targetOrganId === "lung" && "الرئة"}
                  {room.pendingAction.targetOrganId === "liver" && "الكبد"}
                  {room.pendingAction.targetOrganId === "kidney" && "الكلية"}
                </span>
                )
              </p>

              {/* شريط المؤقت التنازلي */}
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mt-6 relative border border-white/5">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: timeLeft, ease: "linear" }}
                  className="bg-rose-600 h-full"
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 block mt-2">
                متبقي {timeLeft} ثوانٍ للرد وإلغاء الحركة
              </span>

              {/* أزرار المقاطعة الفورية */}
              {counterCardsInHand.length > 0 ? (
                <div className="mt-8 space-y-3">
                  <p className="text-xs font-bold text-emerald-400 animate-bounce">
                    ✨ لديك كارت فوري للمقاطعة في يدك! ✨
                  </p>
                  {counterCardsInHand.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => void playInstantCounter(c.id)}
                      className="w-full rounded-2xl bg-sky-600 py-4 font-bold text-white transition hover:bg-sky-500 shadow-lg shadow-sky-600/30 text-sm"
                    >
                      إلغاء الإجراء باستخدام كارت: {c.name} 🚫
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-8 text-xs font-semibold text-slate-500">
                  لا تملك كروت مقاطعة فورية (نوع فوري) لإلغاء هذا الإجراء.
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. شاشة انتهاء اللعبة (Ended State) */}
      <AnimatePresence>
        {room.status === "ended" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-slate-900 p-8 text-center shadow-2xl"
            >
              <span className="text-5xl">👑</span>
              <h2 className="text-2xl font-black mt-4 text-amber-400">انتهت المعركة!</h2>
              <p className="mt-2 text-slate-300 font-bold">
                الفائز بالمركز الأول:{" "}
                <span className="text-white text-lg">
                  {room.players?.[room.winnerId || ""]?.name || "غير معروف"}
                </span>
              </p>

              <div className="mt-8 space-y-3">
                {isHost ? (
                  <button
                    onClick={resetClashGame}
                    className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-bold text-white transition hover:bg-amber-500 shadow-lg shadow-amber-600/20"
                  >
                    العودة للوبي لبدء لعبة جديدة
                  </button>
                ) : (
                  <p className="text-xs text-slate-500 animate-pulse">
                    بانتظار مضيف الغرفة لإعادتكم للوبي...
                  </p>
                )}
                <button
                  onClick={leaveClashRoom}
                  className="w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  الخروج إلى القائمة الرئيسية
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
