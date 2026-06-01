"use client";

import { useGameRoom } from "@/context/game-room-context";
import type { Role, Team } from "@/types/game";

const TEAM_OPTIONS: Team[] = ["Red", "Blue", "Unassigned"];
const ROLE_OPTIONS: Role[] = ["Spymaster", "Operative"];

function teamLabel(team: Team) {
  if (team === "Red") return "أحمر";
  if (team === "Blue") return "أزرق";
  return "غير محدد";
}

function roleLabel(role: Role) {
  return role === "Spymaster" ? "قائد" : "محقق";
}

export function LobbyScreen() {
  const { room, player, roomId, isBusy, chooseTeam, chooseRole, leaveRoom, startGame } = useGameRoom();

  if (!room || !player) {
    return null;
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white shadow-2xl md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <p className="text-sm text-amber-300">Lobby</p>
          <h1 className="mt-2 text-3xl font-black">كود الغرفة: {roomId}</h1>
          <p className="mt-2 text-sm text-slate-200">شارك الكود مع بقية اللاعبين ثم جهز الأدوار قبل بدء الجولة.</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => leaveRoom()}
            disabled={isBusy}
            className="rounded-2xl border border-white/20 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            مغادرة
          </button>
          <button
            type="button"
            onClick={() => startGame()}
            disabled={isBusy || !player.isHost}
            className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-200"
          >
            {player.isHost ? "بدء الجولة" : "بانتظار المضيف"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-950">اللاعبون</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {room.players.length} لاعب
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {room.players.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">
                      {entry.name} {entry.id === player.id ? "(أنت)" : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {teamLabel(entry.team)} / {roleLabel(entry.role)}
                    </p>
                  </div>
                  {entry.isHost ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                      المضيف
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-black text-slate-950">إعدادك</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            اختر فريقك ودورك. عند اختيار قائد، يتم تثبيت قائد واحد فقط لكل فريق.
          </p>

          <div className="mt-5">
            <p className="text-sm font-bold text-slate-900">الفريق</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TEAM_OPTIONS.map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => chooseTeam(team)}
                  disabled={isBusy}
                  className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                    player.team === team
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {teamLabel(team)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-bold text-slate-900">الدور</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => chooseRole(role)}
                  disabled={isBusy}
                  className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                    player.role === role
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  {roleLabel(role)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            تحتاج الجولة إلى فريق أحمر وفريق أزرق، وفي كل فريق قائد ومحقق على الأقل.
          </div>
        </div>
      </div>
    </section>
  );
}
