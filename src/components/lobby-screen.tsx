"use client";

import { useMemo, useState } from "react";

import { useGameRoom } from "../context/game-room-context";
import { getActiveTeams, isActiveTeam, teamBadgeClass, teamCardClass, teamLabel } from "../lib/teams";
import type { Role, TeamCount } from "../types/game";

const ROLE_OPTIONS: Role[] = ["Spymaster", "Operative"];
const TEAM_COUNT_OPTIONS: TeamCount[] = [2, 3, 4];
const LOSS_CARD_OPTIONS = [1, 2, 3, 4] as const;

function roleLabel(role: Role) {
  return role === "Spymaster" ? "قائد" : "محقق";
}

export function LobbyScreen() {
  const { room, player, roomId, isBusy, chooseTeam, chooseRole, leaveRoom, startGame, updateRoomSettings } =
    useGameRoom();
  const [copiedValue, setCopiedValue] = useState<"code" | "link" | null>(null);
  const [roundTimerDraft, setRoundTimerDraft] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const inviteLink = useMemo(() => {
    if (!origin) {
      return "";
    }

    const params = new URLSearchParams({ room: roomId });
    return `${origin}/?${params.toString()}`;
  }, [origin, roomId]);

  async function copyValue(value: string, type: "code" | "link") {
    await navigator.clipboard.writeText(value);
    setCopiedValue(type);
    window.setTimeout(() => setCopiedValue((current) => (current === type ? null : current)), 2000);
  }

  if (!room || !player) {
    return null;
  }

  const activeTeams = getActiveTeams(room.settings.teamCount);
  const canStartGame = player.isHost && !isBusy;
  const roundTimerValue = roundTimerDraft ?? String(room.settings.roundTimerSeconds);

  async function commitRoundTimer() {
    if (roundTimerDraft === null) {
      return;
    }

    if (!roundTimerDraft.trim()) {
      setRoundTimerDraft(null);
      return;
    }

    await updateRoomSettings({ roundTimerSeconds: Number(roundTimerDraft) });
    setRoundTimerDraft(null);
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="rounded-[2rem] border border-white/10 bg-[#1E293B] p-5 shadow-2xl md:p-7">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xs font-bold tracking-[0.28em] text-[#F8FAFC]/55">رمز الدعوة</p>
          <p className="text-4xl font-black tracking-[0.35em] text-[#2563EB] md:text-5xl">{roomId}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void copyValue(roomId, "code")}
              className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#2563EB]/15"
            >
              {copiedValue === "code" ? "تم نسخ الرمز" : "نسخ الرمز"}
            </button>
            <button
              type="button"
              onClick={() => void copyValue(inviteLink, "link")}
              disabled={!inviteLink}
              className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#2563EB]/15 disabled:cursor-not-allowed disabled:text-[#F8FAFC]/40"
            >
              {copiedValue === "link" ? "تم نسخ الرابط" : "نسخ الرابط"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => leaveRoom()}
            disabled={isBusy}
            className="h-12 rounded-2xl border border-[#DC2626]/50 px-5 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#DC2626]/15"
          >
            مغادرة الغرفة
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-[#1E293B] p-6 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-[#F8FAFC]">إعدادات الغرفة</h2>
              <span className="rounded-full bg-[#0F172A] px-3 py-1 text-xs font-bold text-[#F8FAFC]/80">
                {player.isHost ? "أنت المضيف" : "للقراءة فقط"}
              </span>
            </div>

            <div className="mt-6 grid gap-5">
              <div>
                <p className="text-sm font-bold text-[#F8FAFC]">عدد الفرق</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {TEAM_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => void updateRoomSettings({ teamCount: count })}
                      disabled={isBusy || !player.isHost}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        room.settings.teamCount === count
                          ? "bg-[#2563EB] text-[#F8FAFC]"
                          : "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-[#111d34]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {count} فرق
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[#F8FAFC]">مؤقت الجولة</p>
                  <span className="text-xs font-bold text-[#F8FAFC]/60">بالثواني</span>
                </div>
                <input
                  type="number"
                  min={15}
                  max={600}
                  step={5}
                  value={roundTimerValue}
                  onChange={(event) => setRoundTimerDraft(event.target.value.replace(/\D/g, "").slice(0, 3))}
                  onBlur={() => void commitRoundTimer()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  disabled={isBusy || !player.isHost}
                  className="mt-3 h-12 w-full rounded-2xl border border-white/15 bg-[#0F172A] px-4 text-base font-bold text-[#F8FAFC] outline-none transition focus:border-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <p className="text-sm font-bold text-[#F8FAFC]">عدد كلمات الخسارة</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {LOSS_CARD_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => void updateRoomSettings({ lossCardCount: count })}
                      disabled={isBusy || !player.isHost}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        room.settings.lossCardCount === count
                          ? "bg-[#DC2626] text-[#F8FAFC]"
                          : "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-[#221523]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-[#0F172A] p-4 text-sm leading-7 text-[#F8FAFC]/74">
                تحتاج كل فرقة نشطة إلى قائد ومحقق على الأقل. عند تقليل عدد الفرق سيتم إعادة أي لاعب على فريق غير نشط
                إلى حالة غير محدد.
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#1E293B] p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-[#F8FAFC]">إعدادك</h2>
              <span className="rounded-full bg-[#0F172A] px-3 py-1 text-xs font-bold text-[#F8FAFC]/80">
                {roleLabel(player.role)}
              </span>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold text-[#F8FAFC]">اختر فريقك</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeTeams.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => void chooseTeam(team)}
                    disabled={isBusy}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${teamBadgeClass(
                      team,
                      player.team === team,
                    )}`}
                  >
                    {teamLabel(team)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold text-[#F8FAFC]">اختر دورك</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => void chooseRole(role)}
                    disabled={isBusy}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                      player.role === role
                        ? "bg-[#2563EB] text-[#F8FAFC]"
                        : "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-[#1E293B]"
                    }`}
                  >
                    {roleLabel(role)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-[#1E293B] p-6 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-[#F8FAFC]">اللاعبون</h2>
            <span className="rounded-full bg-[#0F172A] px-3 py-1 text-xs font-bold text-[#F8FAFC]/80">
              {room.players.length} لاعب
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            {room.players.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-2xl border p-3 ${
                  isActiveTeam(entry.team)
                    ? teamCardClass(entry.team)
                    : "border-white/10 bg-[#0F172A] text-[#F8FAFC]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black">
                      {entry.name} {entry.id === player.id ? "(أنت)" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {entry.isHost ? (
                      <span className="rounded-full border border-white/30 bg-[#F8FAFC]/15 px-3 py-1 text-xs font-bold text-inherit">
                        المضيف
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/30 bg-[#F8FAFC]/15 px-3 py-1 text-xs font-bold text-inherit">
                      {roleLabel(entry.role)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full">
        <button
          type="button"
          onClick={() => void startGame()}
          disabled={!canStartGame}
          className="w-full rounded-2xl bg-[#2563EB] px-5 py-4 text-lg font-black text-[#F8FAFC] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
        >
          {player.isHost ? "بدء اللعبة" : "بانتظار المضيف"}
        </button>
      </div>
    </section>
  );
}
