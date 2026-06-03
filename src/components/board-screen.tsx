"use client";

import { GameBoard } from "./game-board";
import { useGameRoom } from "../context/game-room-context";
import { countHiddenCards } from "../lib/game";
import { getActiveTeams, teamLabel, type ActiveTeam } from "../lib/teams";

const SCOREBOARD_ORDER: ActiveTeam[] = ["Blue", "Red", "Green", "Gold"];

function roleLabel(role: "Spymaster" | "Operative") {
  return role === "Spymaster" ? "قائد" : "محقق";
}

function teamPanelClass(team: ActiveTeam, active = false) {
  switch (team) {
    case "Blue":
      return active
        ? "border-[#3B82F6]/70 bg-[#3B82F6]/16 shadow-[0_0_0_1px_rgba(59,130,246,0.28),0_20px_60px_rgba(59,130,246,0.22)]"
        : "border-white/10 bg-white/[0.045] shadow-[0_18px_40px_rgba(2,8,23,0.35)]";
    case "Red":
      return active
        ? "border-[#EF4444]/70 bg-[#EF4444]/16 shadow-[0_0_0_1px_rgba(239,68,68,0.28),0_20px_60px_rgba(239,68,68,0.22)]"
        : "border-white/10 bg-white/[0.045] shadow-[0_18px_40px_rgba(2,8,23,0.35)]";
    case "Green":
      return active
        ? "border-[#10B981]/70 bg-[#10B981]/14 shadow-[0_0_0_1px_rgba(16,185,129,0.24),0_20px_60px_rgba(16,185,129,0.2)]"
        : "border-white/10 bg-white/[0.045] shadow-[0_18px_40px_rgba(2,8,23,0.35)]";
    case "Gold":
      return active
        ? "border-[#F59E0B]/70 bg-[#F59E0B]/16 shadow-[0_0_0_1px_rgba(245,158,11,0.24),0_20px_60px_rgba(245,158,11,0.2)]"
        : "border-white/10 bg-white/[0.045] shadow-[0_18px_40px_rgba(2,8,23,0.35)]";
  }
}

function teamDotClass(team: ActiveTeam) {
  switch (team) {
    case "Blue":
      return "bg-[#3B82F6]";
    case "Red":
      return "bg-[#EF4444]";
    case "Green":
      return "bg-[#10B981]";
    case "Gold":
      return "bg-[#F59E0B]";
  }
}

export function BoardScreen() {
  const { room, player, isBusy, revealCard } = useGameRoom();

  if (!room || !player) {
    return null;
  }

  const showTruth = player.role === "Spymaster";
  const canReveal = player.role === "Operative" && player.team === room.currentTurn;
  const activeTeams = getActiveTeams(room.settings.teamCount).sort(
    (left, right) => SCOREBOARD_ORDER.indexOf(left) - SCOREBOARD_ORDER.indexOf(right),
  );
  const teamSummaries = activeTeams.map((team) => {
    const players = room.players.filter((entry) => entry.team === team);
    const captain = players.find((entry) => entry.role === "Spymaster");

    return {
      team,
      remaining: countHiddenCards(room.board, team),
      playerCount: players.length,
      captainName: captain?.name ?? "لا يوجد قائد",
      isActive: room.currentTurn === team,
    };
  });
  const clueDisplay =
    player.team === room.currentTurn
      ? player.role === "Spymaster"
        ? "جهّز التلميح"
        : "ابدأ بالكشف"
      : "بانتظار التلميح";
  const turnMessage =
    player.team === room.currentTurn
      ? `أنت تلعب الآن كـ ${roleLabel(player.role)} ضمن فريق ${teamLabel(player.team)}`
      : `الدور الآن على فريق ${teamLabel(room.currentTurn)}`;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-[#FFFFFF]">
      <div dir="ltr" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {teamSummaries.map((summary) => (
          <div
            key={summary.team}
            dir="rtl"
            className={`rounded-[1.75rem] border px-4 py-4 backdrop-blur-xl transition ${teamPanelClass(summary.team, summary.isActive)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-white/72">
                  <span className={`h-2.5 w-2.5 rounded-full ${teamDotClass(summary.team)}`} />
                  <span>فريق {teamLabel(summary.team)}</span>
                </div>
                <p className="text-4xl font-black tracking-tight">{summary.remaining}</p>
              </div>
              <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-bold text-white/78">
                كلمات متبقية
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className={`relative overflow-hidden rounded-[2rem] border px-5 py-5 backdrop-blur-xl sm:px-6 ${teamPanelClass(
          room.currentTurn,
          true,
        )}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_38%)]" />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/70">
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">الدور الحالي</span>
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">
              فريق {teamLabel(room.currentTurn)}
            </span>
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">
              أنت: {roleLabel(player.role)}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.3fr] lg:items-end">
            <div className="rounded-[1.75rem] border border-white/12 bg-[#0B1220]/70 px-5 py-5 shadow-[0_24px_80px_rgba(2,8,23,0.42)]">
              <p className="text-sm font-bold text-white/60">التلميح الحالي</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">{clueDisplay}</h1>
              <p className="mt-3 text-sm leading-7 text-white/74">{turnMessage}</p>
            </div>

            <div className="grid gap-2 text-sm text-white/78">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                مؤقت الجولة: {room.settings.roundTimerSeconds} ثانية
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
                كلمات الخسارة: {room.settings.lossCardCount}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold text-white/72">
            <span className="rounded-full border border-[#3B82F6]/25 bg-[#3B82F6]/12 px-3 py-1">أزرق</span>
            <span className="rounded-full border border-[#EF4444]/25 bg-[#EF4444]/12 px-3 py-1">أحمر</span>
            <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">محايد</span>
            <span className="rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/12 px-3 py-1">خسارة</span>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-3 shadow-[0_30px_90px_rgba(2,8,23,0.48)] backdrop-blur-xl sm:p-4">
        <div className="rounded-[1.6rem] border border-white/8 bg-[#0B1220]/72 p-3 sm:p-4">
          <GameBoard
            board={room.board}
            showTruth={showTruth}
            canReveal={canReveal && !isBusy}
            onReveal={(cardId: number) => revealCard(cardId)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {teamSummaries.map((summary) => (
          <div
            key={`${summary.team}-players`}
            className={`rounded-[1.5rem] border px-4 py-4 backdrop-blur-xl ${teamPanelClass(summary.team, summary.isActive)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${teamDotClass(summary.team)}`} />
                <h2 className="text-sm font-black">فريق {teamLabel(summary.team)}</h2>
              </div>
              <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-bold text-white/75">
                {summary.playerCount} لاعب
              </span>
            </div>
            <div className="mt-3 text-sm text-white/72">
              <p className="text-xs font-bold tracking-[0.18em] text-white/45">القائد</p>
              <p className="mt-1 truncate text-base font-bold text-white">{summary.captainName}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
