"use client";

import React, { useEffect, useState, useRef } from "react";
import { useBlitzRoom } from "../../hooks/use-blitz-room";
import { GameBoard } from "../game-board";
import { BLITZ_POOL_LABELS } from "../../lib/blitz-categories";
import type { BlitzRoomPlayer, BlitzTeam, Card, CardType } from "../../types/game";

interface BlitzBoardScreenProps {
  roomId: string;
}

// دالة لتحديد الخلفية التفاعلية للغرفة بناءً على ثييم اللعبة الحالي
function blitzBackgroundClass(bgTheme: string | null | undefined) {
  switch (bgTheme) {
    case "red":
      return "bg-[linear-gradient(180deg,_#DC2626_0%,_#B91C1C_38%,_#7F1D1D_100%)]";
    case "blue":
      return "bg-[linear-gradient(180deg,_#2563EB_0%,_#1D4ED8_38%,_#1E3A8A_100%)]";
    case "green":
      return "bg-[linear-gradient(180deg,_#059669_0%,_#047857_38%,_#064E3B_100%)]";
    default:
      return "bg-[linear-gradient(180deg,_#1E293B_0%,_#0F172A_100%)]"; // ثييم اللعبة الافتراضي الداكن
  }
}

// دالة لتحديد كلاسات ألوان بطاقة الفئة المستهدفة بناءً على ثييم اللعبة الحالي
function categoryCardClass(bgTheme: string | null | undefined) {
  switch (bgTheme) {
    case "red":
      return "border-[#EF4444]/45 bg-[#7F1D1D]/80 shadow-[0_0_12px_rgba(239,68,68,0.3)] text-white";
    case "blue":
      return "border-[#3B82F6]/45 bg-[#1E3A8A]/80 shadow-[0_0_12px_rgba(59,130,246,0.3)] text-white";
    case "green":
      return "border-[#10B981]/45 bg-[#064E3B]/80 shadow-[0_0_12px_rgba(16,185,129,0.3)] text-white";
    default:
      return "border-white/20 bg-slate-800/80 shadow-[0_0_12px_rgba(255,255,255,0.05)] text-white";
  }
}

// دالة تحديد ألوان الفريق في لوحة الفريق
function teamPanelClass(team: string) {
  switch (team) {
    case "red":
      return "border-[#DC2626] bg-[#DC2626]";
    case "blue":
      return "border-[#2563EB] bg-[#2563EB]";
    case "green":
      return "border-[#059669] bg-[#059669]";
    default:
      return "border-transparent bg-transparent";
  }
}

function presenceDotClass(isOnline: boolean) {
  return isOnline
    ? "bg-[#22C55E] shadow-[0_0_6px_rgba(34,197,94,0.92),0_0_12px_rgba(34,197,94,0.42)]"
    : "bg-[#EF4444] shadow-[0_0_6px_rgba(239,68,68,0.85),0_0_12px_rgba(239,68,68,0.34)]";
}

// 1. مكون لوحة الفريق المتطابقة مع كود نيم (لا يوجد قائد، فقط أعضاء)
interface BlitzTeamPanelProps {
  team: string;
  players: BlitzRoomPlayer[];
  presence: Record<string, boolean>;
  currentPlayer: BlitzRoomPlayer;
  score: number;
  isBusy: boolean;
  onJoin: (team: BlitzTeam) => void;
  onKickPlayer: (playerId: string) => void;
}

const BlitzTeamPanel = React.memo(
  ({
    team,
    players,
    presence,
    currentPlayer,
    score,
    isBusy,
    onJoin,
    onKickPlayer,
  }: BlitzTeamPanelProps) => {
    const isPlayerOnline = (targetPlayer: BlitzRoomPlayer) => presence[targetPlayer.id] === true;
    const canJoin = team !== currentPlayer.team;
    const canKickPlayer = (playerToKick: BlitzRoomPlayer) =>
      currentPlayer.isHost && !playerToKick.isHost && playerToKick.id !== currentPlayer.id;

    return (
      <div
        id={`blitz-team-panel-${team}`}
        className={`relative flex min-h-0 flex-col justify-start overflow-hidden border px-2 pb-2 pt-1 text-[#F8FAFC] transition-transform duration-300 ${teamPanelClass(
          team
        )}`}
      >
        {/* الرقم الكبير في الخلفية يمثل النقاط الحالية للفريق */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="select-none text-[5.5rem] font-black leading-none text-white/16">
            {score}
          </span>
        </div>

        <div className="relative z-10 flex w-full flex-col items-end text-right">
          {/* تم إزالة اسم الفريق من الجزء العلوي بالكامل */}

          {/* قائمة اللاعبين كأعضاء فقط مع زر الانضمام بنفس ترتيب وتصميم كود نيم */}
          <div className="mt-1 flex w-full flex-col items-start gap-1 overflow-y-auto max-h-[18vh] w-full [scrollbar-width:none] text-left text-xs font-bold text-[#F8FAFC]/95">
            {canJoin ? (
              <button
                type="button"
                onClick={() => onJoin(team as BlitzTeam)}
                disabled={isBusy}
                className="mb-1 self-start rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-bold text-[#F8FAFC] transition active:scale-95 disabled:opacity-60"
              >
                انضم للفريق
              </button>
            ) : null}
            {players.map((currentPlayerEntry) => (
              <div
                key={currentPlayerEntry.id}
                className="flex w-full items-center justify-end gap-2 self-start overflow-visible text-right"
              >
                <div className="flex min-w-0 flex-1 flex-row-reverse items-center justify-end gap-1.5 overflow-visible text-right">
                  <span
                    aria-hidden="true"
                    className={`mb-px h-1.5 w-1.5 shrink-0 rounded-full ${presenceDotClass(
                      isPlayerOnline(currentPlayerEntry)
                    )}`}
                  />
                  <span className="truncate text-right">{currentPlayerEntry.name}</span>
                  {currentPlayerEntry.isHost && (
                    <span className="text-[8px] bg-red-600 px-1.5 py-0.5 rounded text-white shrink-0 font-bold mr-1">
                      مضيف
                    </span>
                  )}
                </div>
                {canKickPlayer(currentPlayerEntry) ? (
                  <button
                    type="button"
                    onClick={() => onKickPlayer(currentPlayerEntry.id)}
                    disabled={isBusy}
                    aria-label={`طرد ${currentPlayerEntry.name}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/20 text-[11px] font-black text-[#F8FAFC] transition active:scale-95 disabled:opacity-60"
                  >
                    x
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

BlitzTeamPanel.displayName = "BlitzTeamPanel";

// 3. شاشة إعلان الفائز المنبثقة
interface WinnerModalProps {
  winner: "red" | "blue" | "green" | null;
  scores: { red: number; blue: number; green: number };
  onReset: () => void;
  isHost: boolean;
}

function BlitzWinnerModal({ winner, scores, onReset, isHost }: WinnerModalProps) {
  let winnerLabel = "المشاهدين";
  let winnerBg = "bg-slate-800 border-slate-700";
  if (winner === "red") {
    winnerLabel = "الفريق الأحمر ❤️";
    winnerBg = "bg-red-600/15 border-red-500/30 text-red-400";
  } else if (winner === "blue") {
    winnerLabel = "الفريق الأزرق 💙";
    winnerBg = "bg-blue-600/15 border-blue-500/30 text-blue-400";
  } else if (winner === "green") {
    winnerLabel = "الفريق الأخضر 💚";
    winnerBg = "bg-emerald-600/15 border-emerald-500/30 text-emerald-400";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border bg-[#1E293B] p-6 text-[#F8FAFC] shadow-2xl text-center flex flex-col items-center gap-5 border-white/10 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-full bg-[#EF4444]/20 flex items-center justify-center text-3xl animate-bounce">
          🏆
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">انتهت اللعبة!</h2>
          <p className="mt-1 text-xs text-[#94A3B8]">وصل أحد الفرق للحد الأقصى للنقاط</p>
        </div>

        <div className={`w-full py-3.5 px-5 rounded-2xl border ${winnerBg} text-lg font-black tracking-wide`}>
          البطل الفائز هو: <br />
          <span className="text-xl mt-1 block">{winnerLabel}</span>
        </div>

        <div className="w-full flex justify-around items-center border-t border-b border-white/5 py-3 text-xs">
          <div>
            <span className="text-xs text-red-400 font-bold block">أحمر</span>
            <span className="font-black text-lg text-white">{scores.red ?? 0}</span>
          </div>
          <div>
            <span className="text-xs text-blue-400 font-bold block">أزرق</span>
            <span className="font-black text-lg text-white">{scores.blue ?? 0}</span>
          </div>
          <div>
            <span className="text-xs text-emerald-400 font-bold block">أخضر</span>
            <span className="font-black text-lg text-white">{scores.green ?? 0}</span>
          </div>
        </div>

        {isHost ? (
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-2xl bg-[#EF4444] py-3 text-sm font-black text-white hover:bg-red-600 transition"
          >
            لعب مجدداً 🔄
          </button>
        ) : (
          <p className="text-xs font-semibold text-[#94A3B8] animate-pulse">
            بانتظار المضيف لبدء لعبة جديدة...
          </p>
        )}
      </div>
    </div>
  );
}

// 4. المكون الرئيسي المحدث لشاشة البورد
export function BlitzBoardScreen({ roomId }: BlitzBoardScreenProps) {
  const {
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
    togglePauseBlitzGame,
  } = useBlitzRoom(roomId);

  const [nameDraft, setNameDraft] = useState(playerName || "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [copiedValue, setCopiedValue] = useState<"code" | "link" | null>(null);

  // حالات المسودة (Draft Settings)
  const [draftTimer, setDraftTimer] = useState(30);
  const [draftScoreLimit, setDraftScoreLimit] = useState(15);
  const [draftPool, setDraftPool] = useState("all");
  const [draftTeamCount, setDraftTeamCount] = useState(3);

  // مرجع لضمان فتح الإعدادات تلقائياً للمضيف مرة واحدة فقط عند الإنشاء
  const hasAutoOpenedRef = useRef(false);

  // حالة لتتبع عملية الانضمام التلقائي بالاسم المسجل مسبقاً
  const [isAutoJoining, setIsAutoJoining] = useState(false);

  // حالة البطاقة الخاطئة التي يجب أن تنقلب بالخطأ حالياً
  const [localWrongCardId, setLocalWrongCardId] = useState<number | null>(null);

  // مراقبة النقرة الخاطئة الأخيرة لتشغيل التأثير البصري
  useEffect(() => {
    if (room?.lastWrongClick) {
      const { cardId, timestamp } = room.lastWrongClick;
      const elapsed = Date.now() - timestamp;
      const duration = 800; // إجمالي مدة التأثير 800ms
      
      if (elapsed < duration) {
        setLocalWrongCardId(cardId);
        const timer = setTimeout(() => {
          setLocalWrongCardId(null);
        }, duration - elapsed);
        return () => clearTimeout(timer);
      }
    } else {
      setLocalWrongCardId(null);
    }
  }, [room?.lastWrongClick?.timestamp, room?.lastWrongClick?.cardId]);

  // تتبع شبكة الكروت السابقة لمقارنتها بالجديدة وتحديد النقرات الصحيحة
  const prevGridRef = useRef<any>(null);

  // دالة لإنشاء وتسيير الجسيم الطائر (Fly Particle Effect)
  const createFlyingParticle = (startX: number, startY: number, endX: number, endY: number, team: string) => {
    if (typeof window === "undefined") return;

    const particle = document.createElement("div");

    let color = "#EF4444"; // أحمر
    let shadowColor = "rgba(239, 68, 68, 0.6)";
    if (team === "blue") {
      color = "#2563EB";
      shadowColor = "rgba(37, 99, 235, 0.6)";
    } else if (team === "green") {
      color = "#059669";
      shadowColor = "rgba(5, 150, 105, 0.6)";
    }

    // إعداد تنسيقات الجسيم
    particle.style.position = "fixed";
    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    particle.style.width = "28px";
    particle.style.height = "28px";
    particle.style.borderRadius = "50%";
    particle.style.backgroundColor = color;
    particle.style.boxShadow = `0 0 14px ${shadowColor}, 0 0 5px ${color}`;
    particle.style.zIndex = "9999";
    particle.style.display = "flex";
    particle.style.alignItems = "center";
    particle.style.justifyContent = "center";
    particle.style.color = "white";
    particle.style.fontSize = "14px";
    particle.style.fontWeight = "900";
    particle.innerText = "+1";
    particle.style.pointerEvents = "none";

    // البداية
    particle.style.transform = "translate(-50%, -50%) scale(0.3)";
    particle.style.opacity = "0";
    particle.style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";

    document.body.appendChild(particle);

    // تفعيل الحركة
    requestAnimationFrame(() => {
      particle.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(1.6)`;
      particle.style.opacity = "1";
    });

    // عند الوصول: نبض وتلاشي الجسيم
    setTimeout(() => {
      particle.style.opacity = "0";
      particle.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.1)`;

      // تطبيق نبض بصري (bump) على لوحة نقاط الفريق
      const panelEl = document.getElementById(`blitz-team-panel-${team}`);
      if (panelEl) {
        panelEl.classList.add("score-bump");
        setTimeout(() => {
          panelEl.classList.remove("score-bump");
        }, 300);
      }

      setTimeout(() => {
        particle.remove();
      }, 200);
    }, 800);
  };

  // مراقبة شبكة الكروت لتشغيل تأثير تحليق النقاط عند الإجابة الصحيحة للفرق
  useEffect(() => {
    if (!room || room.status !== "playing") {
      prevGridRef.current = room?.grid || null;
      return;
    }

    const prevGrid = prevGridRef.current;
    const currentGrid = room.grid;

    if (prevGrid && currentGrid && prevGrid.length === currentGrid.length) {
      // نتحقق مما إذا كنا في نفس الجولة
      const isSameRound = prevGrid.every((c: any, idx: number) => c.word === currentGrid[idx].word);

      if (isSameRound) {
        currentGrid.forEach((card: any, idx: number) => {
          const prevCard = prevGrid[idx];
          if (!prevCard.clickedBy && card.clickedBy) {
            // كارت تم نقره بنجاح للتو!
            const cardEl = document.getElementById(`blitz-card-${card.id}`);
            const panelEl = document.getElementById(`blitz-team-panel-${card.clickedBy}`);

            if (cardEl && panelEl) {
              const cardRect = cardEl.getBoundingClientRect();
              const panelRect = panelEl.getBoundingClientRect();

              const startX = cardRect.left + cardRect.width / 2;
              const startY = cardRect.top + cardRect.height / 2;

              const endX = panelRect.left + panelRect.width / 2;
              const endY = panelRect.top + panelRect.height / 2;

              createFlyingParticle(startX, startY, endX, endY, card.clickedBy);
            }
          }
        });
      }
    }

    prevGridRef.current = currentGrid;
  }, [room?.grid, room?.status]);

  // مزامنة المسودات مع إعدادات الغرفة الفعلية من Firebase
  useEffect(() => {
    if (room?.settings) {
      setDraftTimer(room.settings.roundTimerSeconds);
      setDraftScoreLimit(room.settings.scoreLimit);
      setDraftPool(room.settings.categoryPools?.[0] || "all");
      setDraftTeamCount(room.settings.teamCount ?? 3);
    }
  }, [room?.settings]);

  // إغلاق مودال الإعدادات تلقائياً عند بدء اللعب
  useEffect(() => {
    if (room?.status === "playing") {
      setIsSettingsOpen(false);
    }
  }, [room?.status]);

  // فتح الإعدادات تلقائياً للمضيف عند إنشاء الغرفة لأول مرة (في اللوبي)
  useEffect(() => {
    if (room && room.status === "lobby" && playerId) {
      const activePlayer = room.players?.[playerId];
      const isPlayerHost = activePlayer?.isHost;
      if (isPlayerHost && !hasAutoOpenedRef.current) {
        setIsSettingsOpen(true);
        hasAutoOpenedRef.current = true;
      }
    }
  }, [room?.status, room?.players, playerId]);

  // انضمام تلقائي للغرفة إذا كان الاسم محفوظاً في الجلسة مسبقاً
  useEffect(() => {
    if (isReady && room && playerId && playerName && !room.players?.[playerId] && !isAutoJoining) {
      setIsAutoJoining(true);
      joinBlitzRoom(playerName)
        .catch((err) => {
          console.error("Auto join blitz room failed:", err);
        })
        .finally(() => {
          setIsAutoJoining(false);
        });
    }
  }, [isReady, room, playerId, playerName, joinBlitzRoom, isAutoJoining]);

  // تحديث إحصائيات اللاعب عند انتهاء لعبة بليتز
  useEffect(() => {
    if (!room || room.status !== "ended" || !room.winner || !playerId) {
      return;
    }

    const activePlayer = room.players?.[playerId];
    if (!activePlayer || activePlayer.team === "unassigned") {
      return;
    }

    const pTeam = activePlayer.team;
    // توليد بصمة فريدة للعبة بليتز المنتهية لمنع تكرار الاحتساب
    const fingerprint = `blitz-${roomId}-${room.grid.map((card) => card.word).join(",")}`;

    const STATS_KEY = "iraqi-codenames-stats";
    const PROCESSED_GAMES_KEY = "iraqi-codenames-processed-games";

    const rawProcessed = localStorage.getItem(PROCESSED_GAMES_KEY);
    let processed: string[] = [];
    try {
      processed = rawProcessed ? JSON.parse(rawProcessed) : [];
    } catch {
      processed = [];
    }

    if (processed.includes(fingerprint)) {
      return;
    }

    // تحديث الإحصائيات المحلية
    const rawStats = localStorage.getItem(STATS_KEY);
    let stats = { played: 0, won: 0, lost: 0 };
    try {
      if (rawStats) {
        stats = JSON.parse(rawStats);
      }
    } catch {
      // افتراضي
    }

    stats.played += 1;
    if (pTeam === room.winner) {
      stats.won += 1;
    } else {
      stats.lost += 1;
    }

    processed.push(fingerprint);
    if (processed.length > 50) {
      processed.shift();
    }

    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    localStorage.setItem(PROCESSED_GAMES_KEY, JSON.stringify(processed));
  }, [room?.status, room?.winner, room?.grid, room?.players, playerId, roomId]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-[#F8FAFC]">
        <div className="text-center font-bold">جاري تحميل الغرفة السريعة...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 text-[#F8FAFC]">
        <div className="w-full max-w-md rounded-2xl border border-[#DC2626]/40 bg-[#DC2626]/10 p-6 text-center">
          <p className="font-bold text-[#F8FAFC]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20 transition"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  const player = room.players?.[playerId];
  if (!player) {
    // إذا كان هناك اسم مسجل مسبقاً في الجلسة أو جاري الانضمام تلقائياً، نعرض شاشة تحميل خفيفة لمنع الوميض البصري
    if (isAutoJoining || playerName) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-[#F8FAFC]">
          <div className="text-center font-bold">جاري تسجيل دخولك للغرفة...</div>
        </div>
      );
    }

    const handleSaveName = async () => {
      try {
        await joinBlitzRoom(nameDraft);
        setNameError(null);
      } catch (err) {
        setNameError(err instanceof Error ? err.message : "حدث خطأ غير معروف");
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/90 px-4 backdrop-blur-md">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#1E293B] p-6 shadow-2xl md:p-8">
          <div className="text-right">
            <h2 className="text-2xl font-black text-[#F8FAFC]">انضم للبسامير السريعة ⚡</h2>
            <p className="mt-1 text-xs text-[#94A3B8]">اكتب اسمك للمشاركة في اللعب التنافسي</p>
          </div>

          <div className="mt-5 text-right">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="مثال: يوسف"
              className="w-full rounded-2xl border border-white/15 bg-[#0F172A] px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#EF4444]"
            />
          </div>

          {nameError && <p className="mt-2 text-sm text-[#EF4444] text-right">{nameError}</p>}

          <div className="mt-6 flex">
            <button
              type="button"
              onClick={handleSaveName}
              className="w-full rounded-2xl bg-[#EF4444] px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-red-600"
            >
              دخول اللوبي 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isHost = player.isHost;
  const playerTeam = player.team || "unassigned";

  const redPlayers = Object.values(room.players).filter((p) => p.team === "red");
  const bluePlayers = Object.values(room.players).filter((p) => p.team === "blue");
  const greenPlayers = Object.values(room.players).filter((p) => p.team === "green");

  const maxTimer = room.settings?.roundTimerSeconds || 30;
  const timerProgress = maxTimer <= 0 ? 0 : Math.min(1, Math.max(0, room.timer / maxTimer));

  // تحويل شبكة كروت البليتز لمطابقة بنية كروت كود نيم لكي يقرأها مكون GameBoard الأصلي
  const mappedBoard: Card[] = room.grid.map((card) => {
    // نستخدم فحص truthy لأن Firebase يحذف القيم null تلقائياً فيصبح clickedBy هو undefined بدلاً من null
    const isClicked = !!card.clickedBy;
    const isWrongFlip = localWrongCardId === card.id;
    let type: CardType = "Neutral";

    if (isClicked) {
      if (card.clickedBy === "red") type = "Red";
      else if (card.clickedBy === "blue") type = "Blue";
      else if (card.clickedBy === "green") type = "Green";
    } else if (room.status === "ended") {
      type = card.isCorrect ? "Gold" : "Neutral";
    }

    return {
      id: card.id,
      text: card.word,
      type,
      isRevealed: isClicked || room.status === "ended" || isWrongFlip,
      isWrongFlip,
    };
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = `${origin}/blitz/${roomId}`;

  const copyValue = async (value: string, type: "code" | "link") => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(type);
    window.setTimeout(() => setCopiedValue((current) => (current === type ? null : current)), 2000);
  };

  const handleNameSave = async () => {
    try {
      await joinBlitzRoom(nameDraft);
      setNameError(null);
      setIsRenameOpen(false);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "تعذر تحديث الاسم.");
    }
  };

  const boardFontScale = isLargeFont ? "comfortable" : "compact";

  // حساب الارتفاعات ديناميكياً بناءً على عدد الفرق المختار في اللعبة
  const teamCount = room.settings?.teamCount ?? 3;
  const usesMultiRowTeamGrid = teamCount > 2;
  const teamGridHeightClass = usesMultiRowTeamGrid ? "h-[25vh]" : "h-[22vh]";
  const boardSectionHeightClass = usesMultiRowTeamGrid ? "h-[62vh]" : "h-[65vh]";
  const gameBoardMaxHeight = usesMultiRowTeamGrid ? 62 : 65;

  // استخدام ثييم الخلفية المشترك (bgTheme)، وفي اللوبي نلتزم دائماً بالثييم الافتراضي الداكن
  const currentBgTheme = room.status === "lobby" ? "default" : (room.bgTheme ?? "default");

  return (
    <section
      className={`flex h-full w-full max-h-screen flex-col overflow-hidden text-[#F8FAFC] transition-colors duration-500 ${blitzBackgroundClass(
        currentBgTheme
      )}`}
      dir="rtl"
    >
      {/* 1. شبكة الفرق في الأعلى (تتطابق ديناميكياً مع عدد الفرق 2 أو 3) */}
      <div className={`grid min-h-0 grid-cols-2 gap-0 ${teamGridHeightClass} ${usesMultiRowTeamGrid ? "grid-rows-2" : ""}`}>
        <BlitzTeamPanel
          team="red"
          players={redPlayers}
          presence={room.presence}
          currentPlayer={player}
          score={room.scores?.red ?? 0}
          isBusy={false}
          onJoin={selectBlitzTeam}
          onKickPlayer={kickBlitzPlayer}
        />
        <BlitzTeamPanel
          team="blue"
          players={bluePlayers}
          presence={room.presence}
          currentPlayer={player}
          score={room.scores?.blue ?? 0}
          isBusy={false}
          onJoin={selectBlitzTeam}
          onKickPlayer={kickBlitzPlayer}
        />
        {usesMultiRowTeamGrid && (
          <>
            <BlitzTeamPanel
              team="green"
              players={greenPlayers}
              presence={room.presence}
              currentPlayer={player}
              score={room.scores?.green ?? 0}
              isBusy={false}
              onJoin={selectBlitzTeam}
              onKickPlayer={kickBlitzPlayer}
            />
            {/* الخلية الرابعة فارغة تماماً لمطابقة كود نيم 100% */}
            <div aria-hidden="true" className="border border-transparent opacity-0 bg-transparent" />
          </>
        )}
      </div>

      {/* 2. مؤقت اللعب كخط فاصل متحرك */}
      <div className="h-1.5 w-full overflow-hidden bg-black/25 shrink-0">
        <div className="flex h-full w-full justify-end">
          <div
            className={`h-full transition-[width,background-color] duration-1000 ${room.isPaused ? "bg-white/55" : room.timer <= 6 ? "bg-[#EF4444] animate-pulse" : "bg-[#F8FAFC]"
              }`}
            style={{ width: `${timerProgress * 100}%` }}
          />
        </div>
      </div>

      {/* 3. شريط السؤال النشط (الفئة المستهدفة في مكان التلميحات تماماً) */}
      <div className="mx-2 mt-0.5 shrink-0">
        <div className="mx-auto w-full max-w-[44rem] flex flex-col justify-center">
          {room.status === "lobby" ? (
            <div className="flex flex-wrap justify-center gap-2 py-0">
              <span className="rounded-full border border-[#EF4444]/30 bg-[#7F1D1D]/35 px-3 py-0.5 text-[10px] font-black text-[#FCA5A5]">
                بانتظار بدء اللعبة من المضيف...
              </span>
            </div>
          ) : room.isPaused ? (
            <div className="flex flex-wrap justify-center gap-2 py-0 animate-pulse">
              <span className="rounded-full border border-[#EF4444]/30 bg-[#7F1D1D]/35 px-3 py-0.5 text-[10px] font-black text-[#FCA5A5]">
                تم إيقاف اللعبة مؤقتاً
              </span>
            </div>
          ) : (
            <div className="flex justify-center py-0">
              <div className={`flex items-center rounded-full border px-5 py-1.5 shadow-md backdrop-blur-sm transition-all duration-500 ${categoryCardClass(currentBgTheme)}`}>
                <span className="text-sm sm:text-base font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  {room.currentCategory}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. لوحة البطاقات 5x5 الأصلية من كود نيم لضمان مطابقة التصميم تماماً */}
      <div className={`mt-1 flex min-h-0 items-start overflow-hidden px-1.5 sm:px-2 ${boardSectionHeightClass}`}>
        <div className="mx-auto flex h-full w-full flex-col max-w-md md:max-w-[48rem] lg:max-w-[60rem] xl:max-w-[70rem] items-center justify-start overflow-visible">
          <div className="flex min-h-0 w-full items-start justify-center overflow-visible pt-2 pb-1">
            <GameBoard
              board={mappedBoard}
              columns={5}
              maxHeightVh={gameBoardMaxHeight}
              showTruth={false}
              canReveal={room.status === "playing" && !room.isPaused && playerTeam !== "unassigned"}
              onReveal={(cardId: number) => tapBlitzCard(cardId)}
              revealAll={room.status === "ended"}
              compact
              fontScale={boardFontScale}
              difficulty="Normal"
              playerTeam={
                playerTeam !== "unassigned"
                  ? playerTeam === "red"
                    ? "Red"
                    : playerTeam === "blue"
                      ? "Blue"
                      : "Green"
                  : undefined
              }
            />
          </div>

          {/* أزرار التحكم باللعبة متطابقة مع كود نيم، مع إضافة زر الإيقاف والتشغيل */}
          <div className="mt-2 flex w-full shrink-0 items-center justify-center gap-2">
            {isHost && room.status === "lobby" && (
              <button
                type="button"
                onClick={() => {
                  const finalSettings = {
                    roundTimerSeconds: draftTimer,
                    scoreLimit: draftScoreLimit,
                    categoryPools: [draftPool],
                    teamCount: draftTeamCount,
                  };
                  void startBlitzGame(finalSettings);
                }}
                disabled={
                  redPlayers.length === 0 &&
                  bluePlayers.length === 0 &&
                  (draftTeamCount === 2 ? false : greenPlayers.length === 0)
                }
                className="h-7 rounded-full border border-emerald-500/35 bg-emerald-600/18 px-4 text-xs font-bold text-emerald-400 transition active:scale-95 disabled:opacity-40 hover:bg-emerald-600/35"
              >
                بدء اللعب
              </button>
            )}

            {room.status === "playing" && (
              <button
                type="button"
                onClick={togglePauseBlitzGame}
                disabled={!isHost}
                aria-label={room.isPaused ? "تشغيل اللعب" : "إيقاف اللعب مؤقتاً"}
                className={`h-7 w-7 rounded-full border flex items-center justify-center transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${room.isPaused
                  ? "border-[#86EFAC]/45 bg-[#064E3B]/90 shadow-[0_0_10px_rgba(16,185,129,0.24)] animate-pulse"
                  : "border-white/25 bg-black/10 text-slate-200 hover:bg-black/20"
                  }`}
              >
                {room.isPaused ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#ECFDF5]" aria-hidden="true">
                    <path d="M8 5.5v13l10-6.5L8 5.5Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#F8FAFC]" aria-hidden="true">
                    <rect x="6" y="5" width="4" height="14" rx="1.2" />
                    <rect x="14" y="5" width="4" height="14" rx="1.2" />
                  </svg>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="h-7 rounded-full border border-white/25 bg-black/10 px-4 text-xs font-bold text-slate-200 transition active:scale-95"
            >
              إعدادات
            </button>
            <button
              type="button"
              onClick={() => setIsLargeFont((curr) => !curr)}
              aria-pressed={isLargeFont}
              className={`h-7 rounded-full border px-4 text-xs font-bold transition active:scale-95 ${isLargeFont
                ? "border-white/55 bg-white/20 text-[#F8FAFC]"
                : "border-white/25 bg-black/10 text-slate-200"
                }`}
            >
              خط
            </button>
          </div>
        </div>
      </div>

      {/* 5. مودال الإعدادات المخصص للبليتز */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#0F172A]/88 backdrop-blur-sm" dir="rtl">
          <div className="flex h-full w-full items-start justify-center px-4 py-8">
            <div className="max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-[2rem] border border-white/10 bg-[#1E293B] shadow-2xl">
              <div className="bg-[#0F172A] px-5 pb-5 pt-3 text-center relative">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  aria-label="إغلاق الإعدادات"
                  className="absolute right-5 top-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-[#152033] text-xl font-black text-[#F8FAFC] transition hover:bg-[#17233a]"
                >
                  ×
                </button>
                <p className="text-sm font-bold tracking-[0.24em] text-[#F8FAFC]/60">رمز الدعوة</p>
                <p className="mt-3 text-4xl font-black tracking-[0.35em] text-[#EF4444]">{roomId}</p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void copyValue(roomId, "code")}
                    className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#EF4444]/15"
                  >
                    {copiedValue === "code" ? "تم نسخ الرمز" : "نسخ الرمز"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyValue(inviteLink, "link")}
                    className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#EF4444]/15"
                  >
                    {copiedValue === "link" ? "تم نسخ الرابط" : "نسخ الرابط"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(player.name);
                      setNameError(null);
                      setIsRenameOpen((curr) => !curr);
                    }}
                    className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#EF4444]/15"
                  >
                    تغيير الاسم
                  </button>
                  <button
                    type="button"
                    onClick={() => void leaveBlitzRoom()}
                    className="rounded-2xl border border-[#DC2626]/50 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#DC2626]/15"
                  >
                    مغادرة الغرفة
                  </button>
                </div>

                {isRenameOpen && (
                  <div className="mx-auto mt-4 max-w-sm rounded-3xl border border-white/10 bg-[#152033] p-3">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value.slice(0, 24))}
                      placeholder="اسمك داخل اللعبة"
                      className="h-11 w-full rounded-2xl border border-white/15 bg-[#0F172A] px-4 text-base font-bold text-[#F8FAFC] outline-none transition focus:border-[#EF4444]"
                    />
                    {nameError && <p className="mt-2 text-xs font-bold text-[#FCA5A5]">{nameError}</p>}
                    <div className="mt-3 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleNameSave}
                        className="rounded-2xl bg-[#EF4444] px-4 py-2 text-sm font-black text-[#F8FAFC] transition hover:bg-red-600"
                      >
                        حفظ الاسم
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRenameOpen(false);
                          setNameError(null);
                        }}
                        className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC]/85 transition hover:bg-white/5"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* عناصر التحكم للمضيف فقط (إعدادات الغرفة وتطبيقها عند بدء اللعب) */}
              {isHost && (
                <div className="p-6 flex flex-col gap-5 border-t border-white/5 text-right">
                  <h3 className="text-base font-black text-[#F8FAFC]">إعدادات الغرفة (للمضيف)</h3>

                  {/* إعداد عدد الفرق كمسودة */}
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-300">عدد الفرق</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[2, 3].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setDraftTeamCount(count)}
                          className={`rounded-2xl py-2 text-xs font-bold transition ${draftTeamCount === count
                            ? "bg-[#EF4444] text-[#F8FAFC]"
                            : "border border-white/10 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-white/5"
                            }`}
                        >
                          {count} فرق
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* إعداد مؤقت الجولة كمسودة */}
                  <div className="text-right">
                    <label className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>وقت الجولة</span>
                      <span className="text-[#EF4444] font-black">{draftTimer} ثانية</span>
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="60"
                      step="5"
                      value={draftTimer}
                      onChange={(e) => setDraftTimer(Number(e.target.value))}
                      className="mt-2 w-full accent-[#EF4444] bg-[#0F172A] h-2 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* إعداد حد النقاط للفوز كمسودة */}
                  <div className="text-right">
                    <label className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>نقاط الفوز (الهدف)</span>
                      <span className="text-[#EF4444] font-black">{draftScoreLimit} نقطة</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="5"
                      value={draftScoreLimit}
                      onChange={(e) => setDraftScoreLimit(Number(e.target.value))}
                      className="mt-2 w-full accent-[#EF4444] bg-[#0F172A] h-2 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* مجمع الفئات كمسودة */}
                  <div className="text-right">
                    <label className="text-xs font-bold text-slate-300">مجمع الفئات المستهدفة</label>
                    <select
                      value={draftPool}
                      onChange={(e) => setDraftPool(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0F172A] px-4 py-2.5 text-xs text-[#F8FAFC] outline-none transition focus:border-[#EF4444]"
                    >
                      {Object.entries(BLITZ_POOL_LABELS).map(([key, label]) => (
                        <option key={key} value={key} className="bg-[#1E293B]">
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="mt-4 flex flex-col gap-2">
                    {room.status === "lobby" ? (
                      <button
                        type="button"
                        onClick={() => {
                          const finalSettings = {
                            roundTimerSeconds: draftTimer,
                            scoreLimit: draftScoreLimit,
                            categoryPools: [draftPool],
                            teamCount: draftTeamCount,
                          };
                          void startBlitzGame(finalSettings);
                          setIsSettingsOpen(false);
                        }}
                        disabled={
                          redPlayers.length === 0 &&
                          bluePlayers.length === 0 &&
                          (draftTeamCount === 2 ? false : greenPlayers.length === 0)
                        }
                        className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-40"
                      >
                        حفظ وبدء اللعب السريع ⚡
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const finalSettings = {
                              roundTimerSeconds: draftTimer,
                              scoreLimit: draftScoreLimit,
                              categoryPools: [draftPool],
                              teamCount: draftTeamCount,
                            };
                            void startBlitzGame(finalSettings);
                            setIsSettingsOpen(false);
                          }}
                          className="w-full rounded-2xl bg-[#EF4444] py-3 text-sm font-black text-white transition hover:bg-red-600 animate-pulse"
                        >
                          بدء لعبة جديدة
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void nextBlitzRound();
                            setIsSettingsOpen(false);
                          }}
                          className="w-full rounded-2xl border border-white/10 py-2.5 text-xs font-black text-[#F8FAFC] transition hover:bg-white/5"
                        >
                          تخطي الفئة الحالية
                        </button>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-[#94A3B8] text-center mt-1">
                    التغييرات على الإعدادات لن تُطبق إلا بعد الضغط على زر بدء اللعب أو بدء لعبة جديدة.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* شاشة النهاية */}
      {room.status === "ended" && (
        <BlitzWinnerModal
          winner={room.winner}
          scores={room.scores}
          onReset={() => {
            const finalSettings = {
              roundTimerSeconds: draftTimer,
              scoreLimit: draftScoreLimit,
              categoryPools: [draftPool],
              teamCount: draftTeamCount,
            };
            void resetBlitzGame(finalSettings);
          }}
          isHost={isHost}
        />
      )}
    </section>
  );
}
