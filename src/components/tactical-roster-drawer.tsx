"use client";

import { useMemo, useState } from "react";

import { teamLabel, type ActiveTeam } from "../lib/teams";
import type { Player } from "../types/game";

interface TacticalRosterDrawerProps {
  players: Player[];
  activeTeams: ActiveTeam[];
}

function roleLabel(role: Player["role"]) {
  return role === "Spymaster" ? "قائد" : "محقق";
}

function teamSectionClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "border-[#DC2626]/30 bg-[#DC2626]/8";
    case "Blue":
      return "border-[#2563EB]/30 bg-[#2563EB]/8";
    case "Green":
      return "border-[#059669]/30 bg-[#059669]/8";
    case "Gold":
      return "border-[#EAB308]/30 bg-[#EAB308]/8";
  }
}

function teamTitleClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "text-[#FCA5A5]";
    case "Blue":
      return "text-[#93C5FD]";
    case "Green":
      return "text-[#6EE7B7]";
    case "Gold":
      return "text-[#FDE68A]";
  }
}

function UserGroupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function TacticalRosterDrawer({ players, activeTeams }: TacticalRosterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const playersByTeam = useMemo(
    () =>
      activeTeams.map((team) => ({
        team,
        players: players.filter((player) => player.team === team),
      })),
    [activeTeams, players],
  );

  return (
    <>
      <button
        type="button"
        aria-label="فتح قائمة اللاعبين"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-1/2 z-40 -translate-y-1/2 rounded-full border border-slate-700 bg-[#0F172A]/90 p-3 text-slate-200 shadow-lg shadow-black/35 transition hover:bg-slate-900"
      >
        <UserGroupIcon />
      </button>

      {isOpen ? (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px]"
        />
      ) : null}

      <aside
        dir="rtl"
        className={`fixed inset-y-0 right-0 z-50 w-64 border-l border-slate-800 bg-[#1E293B] p-4 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Roster</p>
              <h2 className="mt-1 text-lg font-black text-[#F8FAFC]">توزيع اللاعبين</h2>
            </div>
            <button
              type="button"
              aria-label="إغلاق"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-slate-700 px-2.5 py-1 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {playersByTeam.map(({ team, players: teamPlayers }) => (
              <section key={team} className={`rounded-2xl border p-3 ${teamSectionClass(team)}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-black ${teamTitleClass(team)}`}>{teamLabel(team)}</h3>
                  <span className="text-[11px] text-slate-400">{teamPlayers.length} لاعب</span>
                </div>

                <div className="mt-3 space-y-2">
                  {teamPlayers.length ? (
                    teamPlayers.map((player) => (
                      <div key={player.id} className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-[#F8FAFC]">{player.name}</p>
                          {player.isHost ? (
                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                              مضيف
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{roleLabel(player.role)}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-slate-500">
                      لا يوجد لاعبون
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
