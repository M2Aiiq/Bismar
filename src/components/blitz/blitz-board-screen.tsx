"use client";

import React, { useEffect, useState } from "react";
import { useBlitzRoom } from "../../hooks/use-blitz-room";
import { GameBoard } from "../game-board";
import { BLITZ_POOL_LABELS } from "../../lib/blitz-categories";
import type { BlitzRoomPlayer, BlitzTeam, Card, CardType } from "../../types/game";

interface BlitzBoardScreenProps {
  roomId: string;
}

// دالة لتحديد الخلفية التفاعلية للغرفة بناءً على فريق اللاعب الحالي
function blitzBackgroundClass(team: string) {
  switch (team) {
    case "red":
      return "bg-[linear-gradient(180deg,_#DC2626_0%,_#B91C1C_38%,_#7F1D1D_100%)]";
    case "blue":
      return "bg-[linear-gradient(180deg,_#2563EB_0%,_#1D4ED8_38%,_#1E3A8A_100%)]";
    case "green":
      return "bg-[linear-gradient(180deg,_#059669_0%,_#047857_38%,_#064E3B_100%)]";
    default:
      return "bg-[linear-gradient(180deg,_#1E293B_0%,_#0F172A_100%)]"; // تدرج داكن هادئ للمشاهدين
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
        className={`relative flex min-h-0 flex-col justify-start overflow-hidden border px-2 pb-2 pt-1 text-[#F8FAFC] ${teamPanelClass(
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

  // مزامنة المسودات مع إعدادات الغرفة الفعلية من Firebase
  useEffect(() => {
    if (room?.settings) {
      setDraftTimer(room.settings.roundTimerSeconds);
      setDraftScoreLimit(room.settings.scoreLimit);
      setDraftPool(room.settings.categoryPools?.[0] || "all");
    }
  }, [room?.settings]);

  // إغلاق مودال الإعدادات تلقائياً عند بدء اللعب
  useEffect(() => {
    if (room?.status === "playing") {
      setIsSettingsOpen(false);
    }
  }, [room?.status]);

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

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleSaveName}
              className="flex-1 rounded-2xl bg-[#EF4444] px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-red-600"
            >
              دخول اللوبي 🚀
            </button>
            <button
              type="button"
              onClick={() => window.location.replace("/")}
              className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#0F172A]"
            >
              إلغاء
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
  const unassignedPlayers = Object.values(room.players).filter((p) => p.team === "unassigned" || !p.team);

  const maxTimer = room.settings?.roundTimerSeconds || 30;
  const timerProgress = maxTimer <= 0 ? 0 : Math.min(1, Math.max(0, room.timer / maxTimer));

  // تحويل شبكة كروت البليتز لمطابقة بنية كروت كود نيم لكي يقرأها مكون GameBoard الأصلي
  const mappedBoard: Card[] = room.grid.map((card) => {
    const isClicked = card.clickedBy !== null;
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
      isRevealed: isClicked || room.status === "ended",
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

  return (
    <section
      className={`flex h-full w-full max-h-screen flex-col overflow-hidden text-[#F8FAFC] ${blitzBackgroundClass(
        playerTeam
      )}`}
      dir="rtl"
    >
      {/* 1. شبكة الفرق في الأعلى (2x2 تماماً كشاشة كود نيم المعتادة، الخلية الرابعة فارغة) */}
      <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-0 h-[25vh] shrink-0">
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
      </div>

      {/* شريط المشاهدين في حال وجود لاعبين غير محددين */}
      {unassignedPlayers.length > 0 && (
        <div className="bg-black/20 border-b border-white/10 px-4 py-1.5 text-xs flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold">المشاهدون:</span>
            <span className="text-white font-semibold">
              {unassignedPlayers.map((p) => p.name).join("، ")}
            </span>
          </div>
          {playerTeam === "unassigned" && (
            <span className="text-[10px] bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded-full font-bold">
              أنت تشاهد اللعبة الآن
            </span>
          )}
        </div>
      )}

      {/* 2. مؤقت اللعب كخط فاصل متحرك */}
      <div className="h-1.5 w-full overflow-hidden bg-black/25 shrink-0">
        <div className="flex h-full w-full justify-end">
          <div
            className={`h-full transition-[width,background-color] duration-1000 ${
              room.timer <= 6 ? "bg-[#EF4444] animate-pulse" : "bg-[#F8FAFC]"
            }`}
            style={{ width: `${timerProgress * 100}%` }}
          />
        </div>
      </div>

      {/* 3. شريط السؤال النشط (الفئة المستهدفة في مكان التلميحات تماماً) */}
      <div className="mx-2 mt-2 shrink-0">
        <div className="mx-auto w-full max-w-[44rem] flex flex-col justify-center">
          {room.status === "lobby" ? (
            <div className="flex flex-wrap justify-center gap-2 py-1">
              <span className="rounded-full border border-[#EF4444]/30 bg-[#7F1D1D]/35 px-4 py-1 text-xs font-black text-[#FCA5A5]">
                بانتظار بدء اللعبة من المضيف... رمز الغرفة: {roomId}
              </span>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <div className="flex items-center gap-3 rounded-full border border-[#EF4444]/35 bg-[#7F1D1D]/55 px-6 py-2 text-[#F8FAFC] shadow-lg backdrop-blur-md animate-pulse">
                <span className="text-xs font-bold text-slate-400">الفئة المستهدفة:</span>
                <span className="text-base font-black text-white drop-shadow-[0_2px_8px_rgba(239,68,68,0.4)]">
                  {room.currentCategory}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. لوحة البطاقات 5x5 الأصلية من كود نيم لضمان مطابقة التصميم تماماً */}
      <div className="mt-1 flex min-h-0 items-start overflow-hidden px-1.5 sm:px-2 h-[62vh]">
        <div className="mx-auto flex h-full w-full flex-col max-w-md md:max-w-[48rem] lg:max-w-[60rem] xl:max-w-[70rem] items-center justify-start overflow-visible">
          <div className="flex min-h-0 w-full items-start justify-center overflow-visible pt-2 pb-1">
            <GameBoard
              board={mappedBoard}
              columns={5}
              maxHeightVh={62}
              showTruth={false}
              canReveal={room.status === "playing" && playerTeam !== "unassigned"}
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

          {/* أزرار التحكم باللعبة متطابقة مع كود نيم */}
          <div className="mt-2 flex w-full shrink-0 items-center justify-center gap-2">
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
              className={`h-7 rounded-full border px-4 text-xs font-bold transition active:scale-95 ${
                isLargeFont
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
                          };
                          void startBlitzGame(finalSettings);
                        }}
                        disabled={redPlayers.length === 0 && bluePlayers.length === 0 && greenPlayers.length === 0}
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
                            };
                            void startBlitzGame(finalSettings);
                          }}
                          className="w-full rounded-2xl bg-[#EF4444] py-3 text-sm font-black text-white transition hover:bg-red-600 animate-pulse"
                        >
                          بدء لعبة جديدة وتطبيق الإعدادات 🔄
                        </button>
                        
                        <button
                          type="button"
                          onClick={nextBlitzRound}
                          className="w-full rounded-2xl border border-white/10 py-2.5 text-xs font-black text-[#F8FAFC] transition hover:bg-white/5"
                        >
                          تخطي الفئة الحالية ⏭️
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
            };
            void resetBlitzGame(finalSettings);
          }}
          isHost={isHost}
        />
      )}
    </section>
  );
}
