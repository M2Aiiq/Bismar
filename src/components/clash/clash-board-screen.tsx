"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClashRoom } from "../../hooks/use-clash-room";
import { motion, AnimatePresence } from "framer-motion";
import type { ActionCard, OrganCard, ClashPlayer } from "../../types/organClash";

function MiniOrganBadge({ organ }: { organ: OrganCard }) {
  const hpColors = organ.isDead
    ? "bg-slate-900/60 border-slate-800 grayscale"
    : organ.hp === 2
      ? "bg-emerald-500/10 border-emerald-500/20"
      : "bg-amber-500/10 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]";

  const imgPath = organ.isDead ? `/${organ.id}_died.png` : `/${organ.id}.png`;

  return (
    <div
      className={`h-7 w-7 rounded-lg flex items-center justify-center border transition relative overflow-hidden p-0.5 ${hpColors}`}
      title={`${organ.name}: ${organ.hp} HP`}
    >
      <img
        src={imgPath}
        alt={organ.name}
        className="w-full h-full object-contain"
      />
    </div>
  );
}

interface OpponentsRadarProps {
  opponents: ClashPlayer[];
  currentTurnPlayerId: string;
  gameStatus: "lobby" | "playing" | "ended";
}

function OpponentsRadar({ opponents, currentTurnPlayerId, gameStatus }: OpponentsRadarProps) {
  if (opponents.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto h-20 flex items-center justify-center text-xs font-semibold text-slate-500 select-none">
        بانتظار انضمام منافسين...
      </div>
    );
  }

  const isLobby = gameStatus === "lobby";

  if (opponents.length === 1) {
    const opp = opponents[0];
    const isTurn = currentTurnPlayerId === opp.id;
    return (
      <div className="w-full max-w-3xl mx-auto h-24 px-4 py-2 select-none">
        <div className={`w-full h-full rounded-2xl border bg-slate-900/80 p-3 flex items-center justify-between transition-all ${isTurn ? "border-rose-500 shadow-md shadow-rose-500/10" : "border-slate-800"
          }`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">{opp.name}</span>
              {opp.isZombie && <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded-md animate-pulse">Zombie 🧟</span>}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              {isLobby ? "🟢 متصل - في الانتظار" : `🎴 يد اللاعب: ${opp.hand?.length || 0} كروت`}
            </span>
          </div>
          {!isLobby && (
            <div className="flex gap-2 w-48">
              {opp.organs?.map((o) => (
                <MiniOrganBadge key={o.id} organ={o} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (opponents.length === 2) {
    return (
      <div className="w-full max-w-3xl mx-auto h-24 grid grid-cols-2 gap-2 px-4 py-2 select-none">
        {opponents.map((opp) => {
          const isTurn = currentTurnPlayerId === opp.id;
          return (
            <div key={opp.id} className={`rounded-2xl border bg-slate-900/80 p-3 flex flex-col justify-between transition-all ${isTurn ? "border-rose-500 shadow-md shadow-rose-500/10" : "border-slate-800"
              }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white truncate max-w-[80px]">{opp.name}</span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {isLobby ? "🟢 متصل" : `🎴 ${opp.hand?.length || 0}`}
                </span>
              </div>
              {!isLobby && (
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {opp.organs?.map((o) => (
                    <MiniOrganBadge key={o.id} organ={o} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (opponents.length === 3) {
    return (
      <div className="w-full max-w-3xl mx-auto h-20 grid grid-cols-3 gap-1.5 px-3 py-1.5 select-none">
        {opponents.map((opp) => {
          const isTurn = currentTurnPlayerId === opp.id;
          return (
            <div key={opp.id} className={`rounded-xl border bg-slate-900/90 p-2.5 flex flex-col justify-between transition-all ${isTurn ? "border-rose-500 shadow-sm shadow-rose-500/10" : "border-slate-800"
              }`}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-white truncate max-w-[65px]">{opp.name}</span>
                <span className="text-[8px] text-slate-400 font-mono">
                  {isLobby ? "🟢 متصل" : `🎴 ${opp.hand?.length || 0}`}
                </span>
              </div>
              {!isLobby && (
                <div className="grid grid-cols-4 gap-0.5 mt-1.5">
                  {opp.organs?.map((o) => (
                    <MiniOrganBadge key={o.id} organ={o} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // 4 opponents (5-player game) -> horizontal swiper
  return (
    <div className="w-full max-w-3xl mx-auto h-20 flex overflow-x-auto gap-2 px-4 py-1.5 snap-x scrollbar-none select-none">
      {opponents.map((opp) => {
        const isTurn = currentTurnPlayerId === opp.id;
        return (
          <div key={opp.id} className={`min-w-[130px] snap-center rounded-xl border bg-slate-900/90 p-2.5 flex flex-col justify-between transition-all ${isTurn ? "border-rose-500 shadow-sm shadow-rose-500/10" : "border-slate-800"
            }`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-white truncate max-w-[70px]">{opp.name}</span>
              <span className="text-[8px] text-slate-400 font-mono">
                {isLobby ? "🟢 متصل" : `🎴 ${opp.hand?.length || 0}`}
              </span>
            </div>
            {!isLobby && (
              <div className="grid grid-cols-4 gap-1 mt-1">
                {opp.organs?.map((o) => (
                  <MiniOrganBadge key={o.id} organ={o} />
                ))}
              </div>
            )}
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
    updateClashRoomSettings,
  } = useClashRoom(roomId);

  const [lobbyName, setLobbyName] = useState("");
  const [selectedCard, setSelectedCard] = useState<ActionCard | null>(null);
  const [targetSelectorOpen, setTargetSelectorOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [nameError, setNameError] = useState<string | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localTimer, setLocalTimer] = useState(30);

  useEffect(() => {
    if (settingsOpen && room?.settings?.turnTimerSeconds) {
      setLocalTimer(room.settings.turnTimerSeconds);
    }
  }, [settingsOpen, room?.settings?.turnTimerSeconds]);

  const me = room?.players?.[playerId];
  const isHost = me?.isHost || false;
  const isMyTurn = room?.currentTurnPlayerId === playerId;
  const activePlayerName = room?.players?.[room.currentTurnPlayerId]?.name || "غير معروف";

  const [localTimeRemaining, setLocalTimeRemaining] = useState(30);
  const totalDuration = room?.settings?.turnTimerSeconds || 30;

  useEffect(() => {
    if (room?.status !== "playing" || !room.turnEndsAt) return;

    setLocalTimeRemaining(Math.max(0, (room.turnEndsAt - Date.now()) / 1000));

    const interval = setInterval(() => {
      const remaining = Math.max(0, room.turnEndsAt! - Date.now());
      setLocalTimeRemaining(remaining / 1000);

      if (remaining <= 0 && isMyTurn) {
        clearInterval(interval);
        void endClashTurn();
      }

      if (remaining <= 0 && isHost && room.currentTurnPlayerId !== playerId) {
        const overtime = Date.now() - room.turnEndsAt!;
        if (overtime >= 2500) {
          clearInterval(interval);
          void endClashTurn(true);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [room?.status, room?.turnEndsAt, isMyTurn, isHost, room?.currentTurnPlayerId, playerId, endClashTurn]);

  // 1. الانضمام التلقائي للوبي إذا لم نكن مسجلين
  useEffect(() => {
    if (isReady && room && !me && playerName) {
      joinClashRoom(playerName).catch((err) => {
        if (err.message === "ROOM_FULL" || err.message?.includes("ROOM_FULL")) {
          alert("تنبيه: هذه الغرفة ممتلئة ولا يمكنك الانضمام إليها!");
          router.replace("/");
        }
      });
    }
  }, [isReady, room, me, playerName, joinClashRoom, router]);

  // 1.5. المضيف يفتح الإعدادات تلقائياً عند أول دخول إذا كانت الغرفة في حالة انتظار
  useEffect(() => {
    if (isReady && room?.status === "lobby" && isHost) {
      setSettingsOpen(true);
    }
  }, [isReady, room?.status, isHost]);

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
                } catch (err: any) {
                  if (err.message === "ROOM_FULL" || err.message?.includes("ROOM_FULL")) {
                    alert("تنبيه: هذه الغرفة ممتلئة ولا يمكنك الانضمام إليها!");
                    router.replace("/");
                  } else {
                    setNameError(err instanceof Error ? err.message : "حدث خطأ غير معروف");
                  }
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



  // 5. واجهة اللعب الأساسية (Playing State)
  const opponents = Object.values(room.players).filter((p) => p.id !== playerId);

  const handleCardClick = (card: ActionCard) => {
    if (!isMyTurn || room.turnPhase !== "play" || room.pendingAction) return;

    if (
      card.subType === "organicDiet" ||
      card.subType === "sedative" ||
      card.subType === "doubleDraw" ||
      card.type === "useless"
    ) {
      void playActionCard(card.id);
    } else {
      setSelectedCard(card);
      setTargetSelectorOpen(true);
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
      {/* شريط الإعدادات والتحكم العلوي */}
      <div className="w-full max-w-3xl mx-auto flex items-center justify-between px-2 mb-1 select-none">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">صراع الأعضاء</span>
          <span className="text-[9px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 text-slate-400 font-mono">
            كود: {room.roomId}
          </span>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-lg border border-slate-850 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-900 transition-all cursor-pointer"
          title="الإعدادات"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      </div>

      {/* 1. منطقة الخصوم (Top Zone - Enemy Radar) */}
      <OpponentsRadar opponents={opponents} currentTurnPlayerId={room.currentTurnPlayerId} gameStatus={room.status} />

      {/* 2. منطقة المعركة واللاعب الحالي (Middle Zone - Player Battlefield & Turn Ticker) */}
      <div className="flex-1 flex flex-col items-center justify-center py-2 relative w-full max-w-3xl mx-auto">
        {/* Turn Ticker */}
        {room.status === "playing" && (
          <div className="w-full max-w-md md:max-w-xl flex justify-center mb-3">
            {(() => {
              const timePercent = Math.min(100, Math.max(0, (localTimeRemaining / totalDuration) * 100));
              const barColor = timePercent > 50
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                : timePercent > 20
                  ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                  : "bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)] animate-pulse";

              return (
                <div className={`w-full py-2.5 px-4 rounded-xl border text-center transition-all relative overflow-hidden ${isMyTurn
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400 font-black shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                    : "border-slate-800 bg-slate-900/50 text-slate-400 font-medium"
                  }`}>
                  <span className="text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                    {isMyTurn ? "🔔 حان دورك الآن! العب بحكمة" : `🕒 دور اللاعب الحالي: ${activePlayerName}`}
                  </span>

                  {room.turnEndsAt && (
                    <div
                      className={`absolute bottom-0 h-1 transition-all duration-100 ${barColor}`}
                      style={{
                        width: `${timePercent}%`,
                        left: `${(100 - timePercent) / 2}%`,
                      }}
                    />
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Player Organs Grid / Lobby waiting card */}
        {room.status === "lobby" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-900/30 border border-white/5 rounded-3xl w-full max-w-md my-auto">
            <span className="text-4xl mb-4 animate-bounce">🎮</span>
            <h3 className="text-lg font-black text-rose-400 mb-2">غرفة انتظار صراع الأعضاء</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4 text-center">
              بانتظار اللاعبين للانضمام. المضيف يمكنه ضبط إعدادات المباراة وتعديلها عبر أيقونة الترس بالعلّي.
            </p>
            <div className="text-xs font-mono bg-slate-950/80 px-3 py-1.5 rounded-lg border border-white/5 text-slate-400 mb-6">
              عدد المتصلين: {Object.keys(room.players).length} / {room.settings?.maxPlayers || 4}
            </div>

            {isHost ? (
              <button
                onClick={() => startClashGame(room.settings.maxPlayers, room.settings.initialHandSize, room.settings.turnTimerSeconds)}
                disabled={Object.keys(room.players).length < 2}
                className="w-full rounded-2xl bg-rose-600 py-3.5 font-bold text-white transition hover:bg-rose-500 disabled:bg-rose-900/40 disabled:text-white/40 disabled:cursor-not-allowed text-xs shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                بدء المعركة الآن ➔
              </button>
            ) : (
              <div className="text-xs text-slate-500 font-semibold animate-pulse">
                بانتظار المضيف لبدء اللعبة...
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2.5 my-auto max-h-[30vh] md:max-h-[22vh] w-full max-w-sm sm:max-w-4xl px-2">
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
                  className={`relative overflow-hidden rounded-xl border p-1.5 sm:p-2 flex flex-col justify-between transition-all aspect-square ${isDead
                      ? "border-slate-800 bg-slate-950/60 text-slate-600 grayscale contrast-75 opacity-60 pointer-events-none"
                      : o.hp === 2
                        ? "border-emerald-500/20 bg-emerald-950/10 shadow-lg shadow-emerald-500/5 text-emerald-200"
                        : "border-amber-500/20 bg-amber-950/10 shadow-lg shadow-amber-500/5 text-amber-200"
                    }`}
                >
                  {/* Vaccine badge */}
                  {o.hasVaccine && (
                    <span className="absolute top-1 left-1 text-[9px] sm:text-[11px]" title="محصن باللقاح">🛡️</span>
                  )}

                  {/* Afflictions count badge */}
                  {o.afflictions && o.afflictions.length > 0 && (
                    <span className="absolute top-1 right-1 text-[8px] sm:text-[9px] bg-rose-600 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse">
                      {o.afflictions.length}
                    </span>
                  )}

                  <div className="flex justify-center items-center w-full">
                    <span className="text-[9px] sm:text-[11px] font-black text-slate-300 tracking-wide truncate">{o.name}</span>
                  </div>

                  {/* Organ Image Display */}
                  <div className="flex-1 flex items-center justify-center my-0.5 select-none w-full h-full min-h-0">
                    <img
                      src={o.isDead ? `/${o.id}_died.png` : `/${o.id}.png`}
                      alt={o.name}
                      className="w-10 h-10 sm:w-14 sm:h-14 object-contain max-h-full"
                    />
                  </div>

                  {/* 2-segment HP bar */}
                  <div className="flex gap-1 w-full mt-0.5">
                    <div className={`h-1 flex-1 rounded-full ${o.hp >= 1 ? hpColor : "bg-slate-800"}`} />
                    <div className={`h-1 flex-1 rounded-full ${o.hp === 2 ? hpColor : "bg-slate-800"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Turn Phase manual action */}
        {room.status === "playing" && room.turnPhase === "play" && isMyTurn && !room.pendingAction && (
          <button
            onClick={() => void endClashTurn(false)}
            className="mt-3 rounded-2xl bg-slate-800 border border-slate-700 px-6 py-2.5 font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white shadow-lg text-xs cursor-pointer"
          >
            تخطي الدور وتمرير اللعب ➔
          </button>
        )}
      </div>

      {/* 3. منطقة اليد المروحية (Bottom Zone - The Fan Deck) */}
      <div className="relative pb-4 w-full h-[25vh] md:h-[28vh] flex items-end justify-center">
        {room.status !== "lobby" && me?.hand && me.hand.length > 0 ? (
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
                tactical: "border-purple-600/50 hover:border-purple-500 shadow-purple-900/10",
                immunity: "border-amber-500/50 hover:border-amber-400 shadow-amber-900/10",
              };

              const badgeColors = {
                attack: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
                cure: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                instant: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
                useless: "bg-slate-800 text-slate-400 border border-slate-700/30",
                tactical: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
                immunity: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
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
                  className={`w-28 h-40 rounded-2xl border-2 bg-slate-900 p-2.5 flex flex-col justify-between cursor-pointer select-none shadow-2xl transition-all duration-200 ${borderColors[card.type]
                    }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md self-start ${badgeColors[card.type]}`}>
                      {card.type === "attack" && (card.targetOrganId === "any" ? "هجوم عام" : "هجوم")}
                      {card.type === "cure" && "علاج"}
                      {card.type === "instant" && "فوري"}
                      {card.type === "tactical" && "تكتيك"}
                      {card.type === "immunity" && "حصانة"}
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
                {(selectedCard.type === "attack" || selectedCard.subType === "infection") &&
                  opponents.map((opp) => (
                    <div key={opp.id} className="rounded-2xl border border-white/5 bg-[#181E2F]/40 p-3 text-right">
                      <span className="text-xs font-bold block mb-2 text-rose-300">{opp.name}</span>
                      <div className="grid grid-cols-2 gap-2">
                        {opp.organs?.map((o) => {
                          const isImmune = o.hasVaccine || (opp.hasOrganicDiet && ["spicyFood", "foodPoisoning", "toxicDose", "fattyLiver", "cholesterol"].includes(selectedCard.subType));
                          const isLegitimate = selectedCard.targetOrganId === "any" || selectedCard.targetOrganId === o.id || selectedCard.subType === "infection";
                          const isClickable = !o.isDead && !isImmune && isLegitimate;
                          return (
                            <button
                              key={o.id}
                              disabled={!isClickable}
                              onClick={() => executePlayOnTarget(opp.id, o.id)}
                              className="rounded-xl border border-white/5 bg-slate-800/80 py-2 text-xs font-bold hover:bg-rose-900/30 hover:border-rose-500 disabled:opacity-30 transition flex flex-col items-center justify-center gap-0.5"
                            >
                              <span>{o.name}</span>
                              <span className="text-[9px] text-slate-400">{o.isDead ? "🔒" : `${o.hp}/2HP`} {o.hasVaccine && "🛡️"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                {(selectedCard.type === "cure" || selectedCard.subType === "vaccine") && me && (
                  <div className="rounded-2xl border border-white/5 bg-[#181E2F]/40 p-3 text-right">
                    <span className="text-xs font-bold block mb-2 text-emerald-300">أعضاؤك الشخصية</span>
                    <div className="grid grid-cols-2 gap-2">
                      {me.organs?.map((o) => {
                        const isSurgery = selectedCard.subType === "surgery";
                        const isVitamin = selectedCard.subType === "vitamin";
                        const isIcu = selectedCard.subType === "icu";

                        const isClickable = isSurgery
                          ? true
                          : !o.isDead && (isVitamin ? o.hp < 3 : (isIcu ? o.hp === 1 : o.hp < 2 || (o.afflictions && o.afflictions.length > 0)));

                        return (
                          <button
                            key={o.id}
                            disabled={!isClickable}
                            onClick={() => executePlayOnTarget(playerId, o.id)}
                            className="rounded-xl border border-white/5 bg-slate-800/80 py-2 text-xs font-bold hover:bg-emerald-900/30 hover:border-emerald-500 disabled:opacity-30 transition flex flex-col items-center justify-center gap-0.5"
                          >
                            <span>{o.name}</span>
                            <span className="text-[9px] text-slate-400">{o.isDead ? "ميت 💀" : `${o.hp}HP`} {o.hasVaccine && "🛡️"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(selectedCard.subType === "steal" || selectedCard.subType === "swap") && (
                  <div className="space-y-2">
                    {opponents.map((opp) => (
                      <button
                        key={opp.id}
                        onClick={() => executePlayOnTarget(opp.id, "")}
                        disabled={opp.isZombie}
                        className="w-full rounded-2xl bg-slate-800 border border-white/5 py-3.5 text-xs font-bold hover:bg-rose-900/20 hover:border-rose-500 disabled:opacity-30 transition"
                      >
                        {opp.name} (عدد الكروت: {opp.hand?.length || 0}) {opp.isZombie && "🧟"}
                      </button>
                    ))}
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
                {room.pendingAction.targetOrganId ? (
                  <>
                    (عضو{" "}
                    <span className="font-bold text-white">
                      {room.players?.[room.pendingAction.targetPlayerId || ""]?.organs?.find((o) => o.id === room.pendingAction!.targetOrganId)?.name || room.pendingAction.targetOrganId}
                    </span>
                    )
                  </>
                ) : null}
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

      {/* نافذة الإعدادات (Settings Modal) */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-right flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h3 className="text-base font-black text-rose-400">إعدادات الغرفة</h3>
                </div>

                {/* تفاصيل الغرفة والكود */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">كود الغرفة</label>
                    <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-white/5">
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(room.roomId);
                          alert("تم نسخ كود الغرفة!");
                        }}
                        className="px-2.5 py-1 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold hover:bg-rose-600/30 transition cursor-pointer"
                      >
                        نسخ الكود
                      </button>
                      <span className="flex-1 font-mono text-center text-xs font-bold text-white tracking-widest">{room.roomId}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">رابط الدعوة</label>
                    <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-white/5">
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/clash/${room.roomId}`;
                          void navigator.clipboard.writeText(link);
                          alert("تم نسخ رابط الدعوة!");
                        }}
                        className="px-2.5 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold hover:bg-emerald-600/30 transition cursor-pointer"
                      >
                        نسخ الرابط
                      </button>
                      <span className="flex-1 text-center text-[10px] text-slate-400 truncate dir-ltr select-all">
                        {typeof window !== "undefined" ? `${window.location.origin}/clash/${room.roomId}` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* تفاصيل اللعبة (إعدادات المباراة) */}
                <div className="rounded-xl border border-white/5 bg-slate-950 p-3.5 mb-6 space-y-3 text-xs text-right">
                  <span className="text-[10px] text-slate-400 block border-b border-white/5 pb-1.5 mb-2 font-black">إعدادات الجولة</span>
                  
                  {isHost ? (
                    <div className="space-y-3 animate-fadeIn">
                      <div>
                        <label className="block text-slate-400 mb-1 text-[11px]">الحد الأقصى للاعبين:</label>
                        <div className="flex gap-2">
                          {[2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                void updateClashRoomSettings(
                                  num,
                                  room.settings?.initialHandSize || 5,
                                  room.settings?.turnTimerSeconds || 30
                                );
                              }}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                room.settings?.maxPlayers === num
                                  ? "bg-rose-600 text-white shadow-sm"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 text-[11px]">الكروت البدائية باليد:</label>
                        <input
                          type="range"
                          min={3}
                          max={8}
                          value={room.settings?.initialHandSize || 5}
                          onChange={(e) => {
                            void updateClashRoomSettings(
                              room.settings?.maxPlayers || 4,
                              Number(e.target.value),
                              room.settings?.turnTimerSeconds || 30
                            );
                          }}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-600"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                          <span>3 كروت</span>
                          <span>{room.settings?.initialHandSize || 5} كروت</span>
                          <span>8 كروت</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1 text-[11px]">مؤقت الجولة (ثوانٍ - كتابة فقط):</label>
                        <input
                          type="number"
                          min={5}
                          max={300}
                          value={localTimer || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalTimer(val === "" ? 0 : (Number(val) || 0));
                          }}
                          onBlur={() => {
                            const clamped = Math.max(5, Math.min(300, localTimer || 30));
                            setLocalTimer(clamped);
                            void updateClashRoomSettings(
                              room.settings?.maxPlayers || 4,
                              room.settings?.initialHandSize || 5,
                              clamped
                            );
                          }}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white text-center font-bold font-mono outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">الحد الأقصى للاعبين:</span>
                        <span className="font-bold text-white">{room.settings?.maxPlayers || 4} لاعبين</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الكروت البدائية باليد:</span>
                        <span className="font-bold text-white">{room.settings?.initialHandSize || 5} كروت</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">مؤقت الجولة:</span>
                        <span className="font-bold text-white">{room.settings?.turnTimerSeconds || 30} ثانية</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* أزرار التحكم والمغادرة */}
              <div className="space-y-3">
                {isHost && (
                  <button
                    onClick={async () => {
                      if (confirm("هل أنت متأكد من رغبتك في إنهاء المباراة الحالية والعودة للوبي؟")) {
                        await resetClashGame();
                        setSettingsOpen(false);
                      }
                    }}
                    className="w-full rounded-xl border border-amber-600/30 bg-amber-600/10 py-2.5 text-xs font-black text-amber-400 hover:bg-amber-600/20 transition text-center cursor-pointer"
                  >
                    إعادة تعيين المباراة والعودة للوبي 🔄
                  </button>
                )}

                <button
                  onClick={async () => {
                    if (confirm("هل أنت متأكد من مغادرة اللعبة؟")) {
                      await leaveClashRoom();
                    }
                  }}
                  className="w-full rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white hover:bg-rose-500 transition text-center shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  مغادرة الغرفة والعودة للرئيسية ➔
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
