"use client";

import { useState, type FormEvent } from "react";

import { GameBoard } from "./game-board";
import { useGameRoom } from "../context/game-room-context";
import { getActiveTeams, teamCardClass, teamLabel } from "../lib/teams";
import { countHiddenCards } from "../lib/game";
import type { Team } from "../types/game";

function roleLabel(role: "Spymaster" | "Operative") {
  return role === "Spymaster" ? "القائد" : "المحقق";
}

function teamTone(team: Exclude<Team, "Unassigned">) {
  switch (team) {
    case "Red":
      return {
        border: "border-[#DC2626]/40",
        soft: "bg-[#DC2626]/12",
        button: "bg-[#DC2626] hover:bg-[#B91C1C] text-[#F8FAFC]",
        focus: "focus:border-[#DC2626] focus:ring-[#DC2626]/25",
      };
    case "Blue":
      return {
        border: "border-[#2563EB]/40",
        soft: "bg-[#2563EB]/12",
        button: "bg-[#2563EB] hover:bg-[#1D4ED8] text-[#F8FAFC]",
        focus: "focus:border-[#2563EB] focus:ring-[#2563EB]/25",
      };
    case "Green":
      return {
        border: "border-[#059669]/40",
        soft: "bg-[#059669]/12",
        button: "bg-[#059669] hover:bg-[#047857] text-[#F8FAFC]",
        focus: "focus:border-[#059669] focus:ring-[#059669]/25",
      };
    case "Gold":
      return {
        border: "border-[#EAB308]/50",
        soft: "bg-[#EAB308]/14",
        button: "bg-[#EAB308] hover:bg-[#CA8A04] text-[#0F172A]",
        focus: "focus:border-[#EAB308] focus:ring-[#EAB308]/25",
      };
  }
}

export function BoardScreen() {
  const { room, player, isBusy, revealCard, submitClue } = useGameRoom();
  const [clueWord, setClueWord] = useState("");
  const [clueCount, setClueCount] = useState(1);

  if (!room || !player) {
    return null;
  }

  const showTruth = player.role === "Spymaster";
  const canReveal = player.role === "Operative" && player.team === room.currentTurn;
  const activeTeams = getActiveTeams(room.settings.teamCount);
  const isLeader = player.role === "Spymaster";
  const isYourTurn = player.team === room.currentTurn;
  const activeTurnTone = teamTone(room.currentTurn);
  const topScoreTeams = activeTeams.map((team) => ({
    team,
    hiddenCards: countHiddenCards(room.board, team),
    players: room.players.filter((entry) => entry.team === team),
  }));

  async function handleClueSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitClue(clueWord, clueCount);
    setClueWord("");
  }

  return (
    <section className="mx-auto flex h-full w-full max-w-7xl min-h-0 flex-col gap-3">
      <div className="grid shrink-0 gap-2 lg:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.2fr)]">
        {topScoreTeams.map(({ team, hiddenCards, players }) => (
          <div
            key={team}
            className={`rounded-2xl border ${teamTone(team).border} ${teamTone(team).soft} p-3 text-[#F8FAFC]`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">{teamLabel(team)}</p>
                <p className="mt-1 text-2xl font-black">{hiddenCards}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${teamCardClass(team)}`}>متبقي</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {players.length ? (
                players.map((entry) => (
                  <span key={entry.id} className="rounded-full bg-[#0F172A]/60 px-2.5 py-1 text-xs font-bold">
                    {entry.name}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-[#0F172A]/60 px-2.5 py-1 text-xs font-bold text-[#F8FAFC]/60">
                  لا يوجد لاعبون
                </span>
              )}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-white/10 bg-[#1E293B] p-3 text-[#F8FAFC]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#F8FAFC]/65">الدور الحالي</p>
              <p className="mt-1 text-xl font-black">فريق {teamLabel(room.currentTurn)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${teamCardClass(room.currentTurn)}`}>
              جاري اللعب
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-2xl bg-[#0F172A] px-3 py-2">
              <p className="text-xs text-[#F8FAFC]/60">دورك</p>
              <p className="mt-1 font-black">{roleLabel(player.role)}</p>
            </div>
            <div className="rounded-2xl bg-[#0F172A] px-3 py-2">
              <p className="text-xs text-[#F8FAFC]/60">فريقك</p>
              <p className="mt-1 font-black">{teamLabel(player.team)}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`shrink-0 rounded-2xl border bg-[#1E293B] p-3 text-[#F8FAFC] ${
          isLeader && isYourTurn ? "border-slate-800" : `${activeTurnTone.border} ${activeTurnTone.soft}`
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#F8FAFC]/60">لوحة التلميحات</p>
            <h2 className="text-lg font-black">Clue Console</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${teamCardClass(room.currentTurn)}`}>
            فريق {teamLabel(room.currentTurn)}
          </span>
        </div>

        {isLeader && isYourTurn ? (
          <form onSubmit={handleClueSubmit} className="flex w-full flex-col gap-2 lg:flex-row">
            <input
              type="text"
              dir="rtl"
              value={clueWord}
              onChange={(event) => setClueWord(event.target.value)}
              placeholder="اكتب كلمة التلميح (كلمة واحدة)..."
              disabled={isBusy}
              className={`min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0F172A] px-4 py-3 text-right text-sm text-[#F8FAFC] outline-none transition placeholder:text-[#F8FAFC]/35 focus:ring-4 ${activeTurnTone.focus}`}
            />

            <label className="flex min-w-[110px] flex-col justify-center rounded-xl border border-white/10 bg-[#0F172A] px-3 py-2 text-xs font-bold text-[#F8FAFC]/75">
              العدد
              <select
                value={clueCount}
                onChange={(event) => setClueCount(Number(event.target.value))}
                disabled={isBusy}
                className={`mt-1 rounded-lg border border-transparent bg-transparent text-sm font-black text-[#F8FAFC] outline-none focus:ring-0 ${activeTurnTone.focus}`}
              >
                {Array.from({ length: 9 }, (_, index) => index + 1).map((count) => (
                  <option key={count} value={count} className="bg-[#0F172A] text-[#F8FAFC]">
                    {count}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={isBusy}
              className={`rounded-xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${activeTurnTone.button}`}
            >
              بث
            </button>
          </form>
        ) : (
          <div className={`w-full rounded-xl border px-4 py-4 text-center ${activeTurnTone.border} ${activeTurnTone.soft}`}>
            <p className="text-base font-black md:text-lg">
              {room.currentClue
                ? `التلميح الحالي: ${room.currentClue.word} | عدد المحاولات: ${room.currentClue.count}`
                : `بانتظار بث التلميح من فريق ${teamLabel(room.currentTurn)}`}
            </p>
          </div>
        )}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-h-0 items-center justify-center rounded-3xl border border-white/10 bg-[#1E293B] p-3 shadow-lg md:p-4">
          <GameBoard
            board={room.board}
            showTruth={showTruth}
            canReveal={canReveal && !isBusy}
            onReveal={(cardId: number) => revealCard(cardId)}
          />
        </div>

        <aside className="hidden min-h-0 xl:flex xl:flex-col xl:gap-3">
          <div className="rounded-3xl border border-white/10 bg-[#1E293B] p-4 shadow-lg">
            <h2 className="text-sm font-black text-[#F8FAFC]">أفراد الفرق</h2>
            <div className="mt-3 space-y-3">
              {topScoreTeams.map(({ team, players }) => (
                <div key={team} className="rounded-2xl border border-white/10 bg-[#0F172A] p-3 text-[#F8FAFC]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{teamLabel(team)}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${teamCardClass(team)}`}>
                      {players.length}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {players.length ? (
                      players.map((entry) => (
                        <div key={entry.id} className="rounded-xl bg-[#1E293B] px-3 py-2 text-xs font-bold">
                          {entry.name} - {roleLabel(entry.role)}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl bg-[#1E293B] px-3 py-2 text-xs font-bold text-[#F8FAFC]/60">
                        لا يوجد لاعبون
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#1E293B] p-5 shadow-lg">
            <h2 className="text-lg font-black text-[#F8FAFC]">الدليل اللوني</h2>
            <div className="mt-3 grid gap-2 text-sm text-[#F8FAFC]">
              {activeTeams.map((team) => (
                <div key={team} className={`rounded-2xl px-3 py-2 ${teamCardClass(team)}`}>
                  {teamLabel(team)}
                </div>
              ))}
              <div className="rounded-2xl bg-[#334155] px-3 py-2">محايد</div>
              <div className="rounded-2xl bg-[#0F172A] px-3 py-2">خسارة</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
