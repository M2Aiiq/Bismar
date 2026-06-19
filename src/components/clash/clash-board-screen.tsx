"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClashRoom } from "../../hooks/use-clash-room";
import { motion, AnimatePresence } from "framer-motion";
import type { ActionCard, OrganCard, ClashPlayer } from "../../types/organClash";

function MiniOrganBadge({ organ }: { organ: OrganCard }) {
  const hpColors = organ.isDead
    ? "bg-slate-900 border-slate-800 text-slate-600 grayscale"
    : organ.hp === 2
    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
    : "bg-amber-500/20 border-amber-500/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]";

  return (
    <div
      className={`h-6 rounded-lg flex items-center justify-center border font-bold text-[9px] w-full transition ${hpColors}`}
      title={`${organ.name}: ${organ.hp} HP`}
    >
      {organ.isDead ? "💀" : organ.id[0].toUpperCase()}
    </div>
  );
}

interface OpponentsRadarProps {
  opponents: ClashPlayer[];
  currentTurnPlayerId: string;
}

function OpponentsRadar({ opponents, currentTurnPlayerId }: OpponentsRadarProps) {
  if (opponents.length === 0) {
    return (
      <div className="w-full h-20 flex items-center justify-center text-xs font-semibold text-slate-500 select-none">
        بانتظار انضمام منافسين...
      </div>
    );
  }

  if (opponents.length === 1) {
    const opp = opponents[0];
    const isTurn = currentTurnPlayerId === opp.id;
    return (
      <div className="w-full h-24 px-4 py-2 select-none">
        <div className={`w-full h-full rounded-2xl border bg-slate-900/80 p-3 flex items-center justify-between transition-all ${
          isTurn ? "border-rose-500 shadow-md shadow-rose-500/10" : "border-slate-800"
        }`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">{opp.name}</span>
              {opp.isZombie && <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded-md animate-pulse">Zombie 🧟</span>}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">🎴 يد اللاعب: {opp.hand?.length || 0} كروت</span>
          </div>
          <div className="flex gap-2 w-48">
            {opp.organs?.map((o) => (
              <MiniOrganBadge key={o.id} organ={o} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (opponents.length === 2) {
    return (
      <div className="w-full h-24 grid grid-cols-2 gap-2 px-4 py-2 select-none">
        {opponents.map((opp) => {
          const isTurn = currentTurnPlayerId === opp.id;
          return (
            <div key={opp.id} className={`rounded-2xl border bg-slate-900/80 p-3 flex flex-col justify-between transition-all ${
              isTurn ? "border-rose-500 shadow-md shadow-rose-500/10" : "border-slate-800"
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white truncate max-w-[80px]">{opp.name}</span>
                <span className="text-[9px] text-slate-400 font-mono">🎴 {opp.hand?.length || 0}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-2">
                {opp.organs?.map((o) => (
                  <MiniOrganBadge key={o.id} organ={o} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (opponents.length === 3) {
    return (
      <div className="w-full h-20 grid grid-cols-3 gap-1.5 px-3 py-1.5 select-none">
        {opponents.map((opp) => {
          const isTurn = currentTurnPlayerId === opp.id;
          return (
            <div key={opp.id} className={`rounded-xl border bg-slate-900/90 p-2.5 flex flex-col justify-between transition-all ${
              isTurn ? "border-rose-500 shadow-sm shadow-rose-500/10" : "border-slate-800"
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-white truncate max-w-[65px]">{opp.name}</span>
                <span className="text-[8px] text-slate-400 font-mono">🎴 {opp.hand?.length || 0}</span>
              </div>
              <div className="grid grid-cols-4 gap-0.5 mt-1.5">
                {opp.organs?.map((o) => (
                  <MiniOrganBadge key={o.id} organ={o} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 4 opponents (5-player game) -> horizontal swiper
  return (
    <div className="w-full h-20 flex overflow-x-auto gap-2 px-4 py-1.5 snap-x scrollbar-none select-none">
      {opponents.map((opp) => {
        const isTurn = currentTurnPlayerId === opp.id;
        return (
          <div key={opp.id} className={`min-w-[130px] snap-center rounded-xl border bg-slate-900/90 p-2.5 flex flex-col justify-between transition-all ${
            isTurn ? "border-rose-500 shadow-sm shadow-rose-500/10" : "border-slate-800"
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-white truncate max-w-[70px]">{opp.name}</span>
              <span className="text-[8px] text-slate-400 font-mono">🎴 {opp.hand?.length || 0}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {opp.organs?.map((o) => (
                <MiniOrganBadge key={o.id} organ={o} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
  const [nameError, setNameError] = useState<string | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

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

  // إذا لم يكن اللاعب مسجلاً في الغرفة بعد
  if (room && !me) {
    // إذا كان هناك اسم مسجل مسبقاً في الجلسة، نعرض شاشة تحميل خفيفة أثناء الانضمام التلقائي
    if (playerName) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#0F172A] text-[#F8FAFC]">
          <div className="text-center font-bold">جاري تسجيل دخولك للغرفة...</div>
        </div>
      );
    }

    // وإلا، نطلب منه كتابة اسمه
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/85 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl md:p-8">
          <div className="text-right">
            <h2 className="text-2xl font-black text-[#F8FAFC]">اكتب اسمك للانضمام</h2>
          </div>

          <div className="mt-5 text-right">
            <input
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              placeholder="مثال: علي"
              className="w-full rounded-2xl border border-white/15 bg-[#0F172A] px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-rose-500"
            />
          </div>

          {nameError && <p className="mt-2 text-sm text-rose-500 text-right">{nameError}</p>}

          <div className="mt-6 flex">
            <button
              type="button"
              onClick={async () => {
                const name = lobbyName.trim();
                if (name.length < 2) {
                  setNameError("الاسم يجب أن يكون حرفين على الأقل.");
                  return;
                }
                try {
                  // حفظ الجلسة محلياً ليتطابق مع Codenames/Blitz
                  localStorage.setItem(
                    "iraqi-codenames-session",
                    JSON.stringify({ playerId, playerName: name })
                  );
                  await joinClashRoom(name);
                  setNameError(null);
                  window.location.reload();
                } catch (err) {
                  setNameError(err instanceof Error ? err.message : "حدث خطأ غير معروف");
                }
              }}
              className="w-full rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-rose-500"
            >
              دخول الغرفة
            </button>
          </div>
        </div>
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
    <div className="relative h-screen w-screen overflow-hidden p-3 bg-slate-950 text-white flex flex-col justify-between select-none">
      {/* 1. منطقة الخصوم (Top Zone - Enemy Radar) */}
      <OpponentsRadar opponents={opponents} currentTurnPlayerId={room.currentTurnPlayerId} />

      {/* 2. منطقة المعركة واللاعب الحالي (Middle Zone - Player Battlefield & Turn Ticker) */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 relative">
        {/* Turn Ticker */}
        <div className="w-full max-w-md flex justify-center mb-3">
          <div className={`w-full py-2 px-4 rounded-xl border text-center transition-all ${
            isMyTurn
              ? "border-emerald-500 bg-emerald-950/20 text-emerald-400 font-black animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              : "border-slate-800 bg-slate-900/50 text-slate-400 font-medium"
          }`}>
            <span className="text-xs uppercase tracking-wider">
              {isMyTurn ? "🔔 حان دورك الآن! العب بحكمة" : `🕒 دور اللاعب الحالي: ${activePlayerName}`}
            </span>
          </div>
        </div>

        {/* Player Organs Grid */}
        <div className="grid grid-cols-2 gap-3 my-auto max-h-[35vh] w-full max-w-md px-2">
          {me?.organs?.map((o) => {
            const isDead = o.isDead;
            const hpColor = o.hp === 2
              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              : o.hp === 1
              ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
              : "bg-slate-800";
            
            return (
              <div
                key={o.id}
                className={`relative overflow-hidden rounded-2xl border p-3 flex flex-col justify-between transition-all aspect-video ${
                  isDead
                    ? "border-slate-800 bg-slate-950/60 text-slate-600 grayscale contrast-75 opacity-60 pointer-events-none"
                    : o.hp === 2
                    ? "border-emerald-500/20 bg-emerald-950/10 shadow-lg shadow-emerald-500/5 text-emerald-200"
                    : "border-amber-500/20 bg-amber-950/10 shadow-lg shadow-amber-500/5 text-amber-200"
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold text-slate-400">{o.name}</span>
                  <span className="text-sm">{o.isDead ? "💀" : o.hp === 2 ? "❤️" : "💔"}</span>
                </div>

                {/* Asset placeholder box */}
                <div className="flex-1 flex items-center justify-center my-1 opacity-20">
                  {o.id === "heart" && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 text-rose-500">
                      <path d="m11.645 20.91-.007-.003-.003-.001a11.13 11.13 0 0 1-5.101-3.927C3.512 13.111 2.25 9.495 2.25 6.947c0-2.466 1.908-4.447 4.25-4.447 1.854 0 3.422 1.218 3.99 2.923.568-1.705 2.136-2.923 3.99-2.923 2.342 0 4.25 1.981 4.25 4.447 0 2.548-1.262 6.164-4.284 10.034a11.13 11.13 0 0 1-5.102 3.927l-.003.001-.007.003Z" />
                    </svg>
                  )}
                  {o.id === "lung" && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 text-sky-400">
                      <path d="M12 2.25a.75.75 0 0 1 .75.75v3.25h1c2.071 0 3.75 1.679 3.75 3.75v3.5c0 2.898-2.352 5.25-5.25 5.25-.17 0-.33-.046-.49-.126l-1.51-.755A.75.75 0 0 0 9.5 18.5v1.75a.75.75 0 0 1-1.5 0V18.5a.75.75 0 0 0-.75-.75h-.5a4.25 4.25 0 0 1-4.25-4.25V9.75A3.75 3.75 0 0 1 6.25 6h1V2.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 0 .75.75h1.5a.75.75 0 0 0 .75-.75V3a.75.75 0 0 1 .75-.75Z" />
                    </svg>
                  )}
                  {o.id === "liver" && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 text-orange-400">
                      <path d="M11.645 2.25H12.355A9.645 9.645 0 0 1 22 11.895v.21A9.645 9.645 0 0 1 12.355 21.75H11.645A9.645 9.645 0 0 1 2 12.105v-.21A9.645 9.645 0 0 1 11.645 2.25Z" />
                    </svg>
                  )}
                  {o.id === "kidney" && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 text-yellow-500">
                      <path d="M7.5 2.25a.75.75 0 0 1 .75.75v2.25h7.5V3a.75.75 0 0 1 1.5 0v1.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V6.75A2.25 2.25 0 0 1 6.75 4.5V3a.75.75 0 0 1 .75-.75Z" />
                    </svg>
                  )}
                </div>

                {/* 2-segment HP bar */}
                <div className="flex gap-1.5 w-full">
                  <div className={`h-1.5 flex-1 rounded-full ${o.hp >= 1 ? hpColor : "bg-slate-800"}`} />
                  <div className={`h-1.5 flex-1 rounded-full ${o.hp === 2 ? hpColor : "bg-slate-800"}`} />
                </div>

                {/* Dead Overlay */}
                {isDead && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center flex-col gap-1 z-10">
                    <span className="text-xl">💀</span>
                    <span className="text-[9px] uppercase font-black text-rose-500 tracking-wider">ميت / مغلق</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Turn Phase manual action */}
        {room.turnPhase === "pass" && isMyTurn && (
          <button
            onClick={endClashTurn}
            className="mt-3 rounded-2xl bg-rose-600 px-6 py-2.5 font-bold text-white transition hover:bg-rose-500 shadow-lg shadow-rose-600/30 text-xs"
          >
            إنهاء الدور وتمرير اللعب ➔
          </button>
        )}
      </div>

      {/* 3. منطقة اليد المروحية (Bottom Zone - The Fan Deck) */}
      <div className="relative pb-4 w-full h-[25vh] flex items-end justify-center">
        {me?.hand && me.hand.length > 0 ? (
          <div className="relative w-full max-w-xl h-full flex justify-center items-end">
            {me.hand.map((card, index) => {
              const totalCards = me.hand.length;
              const angleStep = Math.min(30 / Math.max(1, totalCards - 1), 6);
              const startAngle = -((totalCards - 1) * angleStep) / 2;
              const rotate = startAngle + index * angleStep;
              
              const translateY = Math.abs(rotate) * 0.9;
              const translateX = rotate * 2.8;

              const borderColors = {
                attack: "border-rose-600/50 hover:border-rose-500 shadow-rose-900/10",
                cure: "border-emerald-600/50 hover:border-emerald-500 shadow-emerald-900/10",
                instant: "border-sky-600/50 hover:border-sky-500 shadow-sky-900/10",
                useless: "border-slate-700 hover:border-slate-600 shadow-slate-950/10",
              };

              const badgeColors = {
                attack: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
                cure: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                instant: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
                useless: "bg-slate-800 text-slate-400 border border-slate-700/30",
              };

              const isHovered = hoveredCardIndex === index;
              const isAnyHovered = hoveredCardIndex !== null;

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
                    y: isHovered ? -35 : translateY,
                    x: translateX,
                    scale: isHovered ? 1.12 : 1.0,
                    zIndex: isHovered ? 100 : index,
                    opacity: isAnyHovered && !isHovered ? 0.5 : 1.0,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  onMouseEnter={() => setHoveredCardIndex(index)}
                  onMouseLeave={() => setHoveredCardIndex(null)}
                  onTouchStart={() => setHoveredCardIndex(index)}
                  onTouchEnd={() => setHoveredCardIndex(null)}
                  onClick={() => handleCardClick(card)}
                  className={`w-28 h-40 rounded-2xl border-2 bg-slate-900 p-2.5 flex flex-col justify-between cursor-pointer select-none shadow-2xl transition-all duration-200 ${
                    borderColors[card.type]
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md self-start ${badgeColors[card.type]}`}>
                      {card.type === "attack" && "هجوم"}
                      {card.type === "cure" && "علاج"}
                      {card.type === "instant" && "فوري"}
                      {card.type === "useless" && "خردة"}
                    </span>
                    <span className="text-[11px] font-black leading-tight text-white">{card.name}</span>
                  </div>
                  <span className="text-[8px] text-slate-400 leading-normal">{card.description}</span>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-[10px] font-bold text-slate-600 animate-pulse pb-6">لا توجد كروت في يدك حالياً</div>
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
