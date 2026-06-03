"use client";

import { useEffect, useMemo, useState } from "react";

import { teamLabel, type ActiveTeam } from "../lib/teams";

interface GameplayHudProps {
  currentTurn: ActiveTeam;
  roundTimerSeconds: number;
  remainingWords: Partial<Record<ActiveTeam, number>>;
  activeTeams: ActiveTeam[];
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function scorePillClass(team: "Red" | "Blue") {
  return team === "Red"
    ? "bg-[#DC2626] text-white"
    : "bg-[#2563EB] text-white";
}

function accentPillClass(team: ActiveTeam) {
  switch (team) {
    case "Red":
      return "border-[#DC2626]/40 bg-[#DC2626]/12 text-[#FCA5A5]";
    case "Blue":
      return "border-[#2563EB]/40 bg-[#2563EB]/12 text-[#93C5FD]";
    case "Green":
      return "border-[#059669]/40 bg-[#059669]/12 text-[#6EE7B7]";
    case "Gold":
      return "border-[#EAB308]/40 bg-[#EAB308]/12 text-[#FDE68A]";
  }
}

function ScorePill({ team, value }: { team: "Red" | "Blue"; value: number }) {
  return (
    <div className={`rounded-xl px-4 py-2 font-mono text-xl font-black shadow-md ${scorePillClass(team)}`}>
      <span className="block text-[10px] font-bold uppercase tracking-[0.28em] opacity-75">{team}</span>
      <span>{value}</span>
    </div>
  );
}

export function GameplayHud({
  currentTurn,
  roundTimerSeconds,
  remainingWords,
  activeTeams,
}: GameplayHudProps) {
  const [remainingTime, setRemainingTime] = useState(roundTimerSeconds);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRemainingTime((currentValue) => (currentValue > 0 ? currentValue - 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const extraTeams = useMemo(
    () => activeTeams.filter((team) => team !== "Red" && team !== "Blue"),
    [activeTeams],
  );

  return (
    <div
      dir="ltr"
      className="w-full flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-[#1E293B]/40 p-3"
    >
      <ScorePill team="Blue" value={remainingWords.Blue ?? 0} />

      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 px-2">
        <div
          dir="rtl"
          className="rounded-full border border-slate-700 bg-[#0F172A] px-4 py-1.5 text-center text-xs text-slate-300"
        >
          <span className="font-bold text-[#F8FAFC]">دور فريق {teamLabel(currentTurn)}</span>
          <span className="mx-2 text-slate-600">•</span>
          <span className="font-mono tracking-[0.24em]">{formatTimer(remainingTime)}</span>
        </div>

        {extraTeams.length ? (
          <div dir="rtl" className="flex flex-wrap items-center justify-center gap-2">
            {extraTeams.map((team) => (
              <div
                key={team}
                className={`rounded-full border px-3 py-1 text-[11px] font-bold ${accentPillClass(team)}`}
              >
                {teamLabel(team)}: {remainingWords[team] ?? 0}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <ScorePill team="Red" value={remainingWords.Red ?? 0} />
    </div>
  );
}
