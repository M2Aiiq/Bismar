"use client";

import React, { useEffect, useState } from "react";
import { useBlitzRoom } from "../../hooks/use-blitz-room";
import type { BlitzCard, BlitzRoomPlayer, BlitzTeam } from "../../types/game";

interface BlitzBoardScreenProps {
  roomId: string;
}

// دالة لتحديد الخلفية التفاعلية للغرفة بناءً على الفريق المتصدر
function blitzBackgroundClass(scores: { red: number; blue: number; green: number }) {
  const red = scores?.red ?? 0;
  const blue = scores?.blue ?? 0;
  const green = scores?.green ?? 0;

  if (red === 0 && blue === 0 && green === 0) {
    return "bg-[linear-gradient(180deg,_#1E293B_0%,_#0F172A_100%)]";
  }

  const maxScore = Math.max(red, blue, green);
  const leadingTeams: string[] = [];
  if (red === maxScore) leadingTeams.push("red");
  if (blue === maxScore) leadingTeams.push("blue");
  if (green === maxScore) leadingTeams.push("green");

  // في حال تعادل أكثر من فريق، نستخدم خلفية محايدة داكنة
  if (leadingTeams.length > 1) {
    return "bg-[linear-gradient(180deg,_#1E293B_0%,_#0F172A_100%)]";
  }

  const leader = leadingTeams[0];
  if (leader === "red") {
    return "bg-[linear-gradient(180deg,_#7F1D1D_0%,_#450A0A_40%,_#0F172A_100%)] transition-all duration-1000";
  }
  if (leader === "blue") {
    return "bg-[linear-gradient(180deg,_#1E3A8A_0%,_#172554_40%,_#0F172A_100%)] transition-all duration-1000";
  }
  return "bg-[linear-gradient(180deg,_#064E3B_0%,_#022C22_40%,_#0F172A_100%)] transition-all duration-1000";
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
      return "border-white/10 bg-white/5";
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
  label: string;
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
    label,
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
          {team !== "unassigned" && (
            <span className="select-none text-[5rem] font-black leading-none text-white/16">
              {score}
            </span>
          )}
        </div>

        <div className="relative z-10 flex w-full flex-col items-end text-right">
          <div className="-mx-2 -mt-1 w-[calc(100%+1rem)] bg-black/20 px-2 pb-2 pt-1 text-right flex items-center justify-between">
            {canJoin ? (
              <button
                type="button"
                onClick={() => onJoin(team as BlitzTeam)}
                disabled={isBusy}
                className="shrink-0 rounded-full border border-white/20 bg-white/15 px-1.5 py-px text-[9px] font-bold text-[#F8FAFC] transition active:scale-95 disabled:opacity-60"
              >
                انضم للفريق
              </button>
            ) : (
              <div />
            )}
            <span className="text-[11px] font-black tracking-wide text-white">{label}</span>
          </div>
          <div className="h-px w-full bg-white/40" />
          
          {/* قائمة اللاعبين كأعضاء فقط */}
          <div className="mt-1 flex w-full flex-col items-start gap-1 overflow-y-auto max-h-[14vh] w-full [scrollbar-width:none] text-right text-xs font-bold text-[#F8FAFC]/95">
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
                    <span className="text-[8px] bg-red-600 px-1 rounded text-white shrink-0 font-bold">
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

// 2. مكون البطاقات المتطابق مع كود نيم (BlitzGameBoard)
interface BlitzGameBoardProps {
  grid: BlitzCard[];
  onReveal: (cardId: number) => void;
  playerTeam: string;
}

const BlitzGameBoard = React.memo(({ grid, onReveal, playerTeam }: BlitzGameBoardProps) => {
  return (
    <div className="grid h-full w-full grid-cols-5 gap-1.5 sm:gap-2">
      {grid.map((card) => {
        const isFlipped = card.clickedBy !== null;

        let backBgClass = "bg-slate-700 border-slate-600";
        if (card.clickedBy === "red") {
          backBgClass =
            "bg-gradient-to-b from-[#EF4444] to-[#B91C1C] border-[#EF4444] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_10px_20px_rgba(15,23,42,0.2)]";
        } else if (card.clickedBy === "blue") {
          backBgClass =
            "bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] border-[#3B82F6] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_10px_20px_rgba(15,23,42,0.2)]";
        } else if (card.clickedBy === "green") {
          backBgClass =
            "bg-gradient-to-b from-[#10B981] to-[#047857] border-[#10B981] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_10px_20px_rgba(15,23,42,0.2)]";
        }

        const handleClick = () => {
          if (!isFlipped && playerTeam !== "unassigned") {
            onReveal(card.id);
          }
        };

        return (
          <button
            key={card.id}
            type="button"
            disabled={isFlipped || playerTeam === "unassigned"}
            onClick={handleClick}
            className="card-perspective relative h-full w-full select-none bg-transparent border-0 p-0 text-center outline-none rounded-xl active:scale-95 aspect-square"
          >
            <div className={`card-inner h-full w-full ${isFlipped ? "card-flipped" : ""}`}>
              {/* الوجه الأمامي: الكلمة غير مكشوفة (تطابق كود نيم) */}
              <div className="card-front absolute inset-0 z-0 flex items-center justify-center border border-[#D6D0C5] bg-gradient-to-b from-[#F9F8F6] to-[#E2DDD3] text-[#0F172A] shadow-[inset_0_2.5px_0px_rgba(255,255,255,0.8),_0_4px_6px_-1px_rgba(0,0,0,0.15)] hover:border-[#C7BFB1] rounded-xl p-1">
                <span className="text-[10px] sm:text-xs md:text-sm font-black leading-tight break-all text-center">
                  {card.word}
                </span>
              </div>

              {/* الوجه الخلفي: كرت بلون وتأثير كود نيم تماماً (لا يعرض الكلمة، بل أشكال كود نيم الهندسية) */}
              <div
                aria-hidden="true"
                className={`card-back absolute inset-0 z-10 border overflow-hidden rounded-xl border-slate-900/15 ${backBgClass}`}
              >
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/30" />
                  <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/15" />
                  <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/10" />
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
});

BlitzGameBoard.displayName = "BlitzGameBoard";

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
  const [copied, setCopied] = useState(false);

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

  const handleCopyLink = () => {
    const inviteLink = window.location.href;
    void navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section
      className={`flex h-full w-full max-h-screen flex-col overflow-hidden text-[#F8FAFC] ${blitzBackgroundClass(
        room.scores
      )}`}
      dir="rtl"
    >
      {/* 1. شبكة الفرق في الأعلى (مطابقة تماماً لتصميم كود نيم) */}
      <div className="grid min-h-0 grid-cols-4 gap-0 h-[22vh] shrink-0">
        <BlitzTeamPanel
          team="red"
          label="الفريق الأحمر"
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
          label="الفريق الأزرق"
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
          label="الفريق الأخضر"
          players={greenPlayers}
          presence={room.presence}
          currentPlayer={player}
          score={room.scores?.green ?? 0}
          isBusy={false}
          onJoin={selectBlitzTeam}
          onKickPlayer={kickBlitzPlayer}
        />
        <BlitzTeamPanel
          team="unassigned"
          label="المشاهدين"
          players={unassignedPlayers}
          presence={room.presence}
          currentPlayer={player}
          score={0}
          isBusy={false}
          onJoin={selectBlitzTeam}
          onKickPlayer={kickBlitzPlayer}
        />
      </div>

      {/* 2. مؤقت اللعب كخط فاصل متحرك */}
      <div className="h-1.5 w-full overflow-hidden bg-black/25 shrink-0">
        <div className="flex h-full w-full justify-end">
          <div
            className={`h-full transition-[width,background-color] duration-1000 ${
              room.timer <= 6 ? "bg-[#EF4444] animate-pulse" : "bg-[#2563EB]"
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
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-bold text-white hover:bg-white/25 transition active:scale-95"
              >
                {copied ? "تم نسخ الرابط! ✓" : "نسخ رابط الدعوة 🔗"}
              </button>
              <span className="rounded-full border border-[#EF4444]/30 bg-[#7F1D1D]/35 px-4 py-1 text-xs font-black text-[#FCA5A5]">
                رمز الغرفة: {roomId}
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

      {/* 4. لوحة البطاقات 5x5 */}
      <div className="mt-2 flex min-h-0 items-start overflow-hidden px-1.5 sm:px-2 flex-1 pb-4">
        <div className="mx-auto flex h-full w-full flex-col max-w-md md:max-w-[48rem] lg:max-w-[60rem] xl:max-w-[70rem] items-center justify-start overflow-visible">
          <div className="flex min-h-0 w-full items-start justify-center overflow-visible pt-1 pb-1 flex-1">
            <BlitzGameBoard
              grid={room.grid}
              onReveal={tapBlitzCard}
              playerTeam={playerTeam}
            />
          </div>

          {/* أزرار التحكم باللعبة */}
          <div className="mt-3 flex w-full shrink-0 items-center justify-center gap-2">
            <button
              type="button"
              onClick={leaveBlitzRoom}
              className="h-8 rounded-full border border-white/25 bg-black/20 px-5 text-xs font-black text-[#F8FAFC] transition active:scale-95 hover:bg-black/45"
            >
              انسحاب ومغادرة الغرفة
            </button>

            {isHost && room.status === "playing" && (
              <button
                type="button"
                onClick={nextBlitzRound}
                className="h-8 rounded-full border border-[#EF4444]/35 bg-[#7F1D1D]/18 px-5 text-xs font-black text-[#FCA5A5] transition active:scale-95 hover:bg-[#7F1D1D]/35"
              >
                تخطي الفئة ⏭️
              </button>
            )}

            {isHost && room.status === "lobby" && (
              <button
                type="button"
                onClick={startBlitzGame}
                disabled={redPlayers.length === 0 && bluePlayers.length === 0 && greenPlayers.length === 0}
                className="h-8 rounded-full border border-emerald-500/35 bg-emerald-600/18 px-5 text-xs font-black text-emerald-400 transition active:scale-95 disabled:opacity-50 hover:bg-emerald-600/35"
              >
                ابدأ اللعب السريع ⚡
              </button>
            )}
          </div>
        </div>
      </div>

      {/* شاشة النهاية */}
      {room.status === "ended" && (
        <BlitzWinnerModal
          winner={room.winner}
          scores={room.scores}
          onReset={resetBlitzGame}
          isHost={isHost}
        />
      )}
    </section>
  );
}
