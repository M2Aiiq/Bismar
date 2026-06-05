"use client";

import { useEffect, useMemo, useState } from "react";

import { useGameRoom } from "../context/game-room-context";
import { WORD_CATEGORY_LABELS } from "../lib/words";
import { getActiveTeams, isActiveTeam, teamBadgeClass, teamCardClass, teamLabel } from "../lib/teams";
import type { Role, TeamCount, WordCategory } from "../types/game";

const ROLE_OPTIONS: Role[] = ["Spymaster", "Operative"];
const TEAM_COUNT_OPTIONS: TeamCount[] = [2, 3, 4];
const LOSS_CARD_OPTIONS = [1, 2, 3, 4] as const;
const WORD_CATEGORY_OPTIONS: WordCategory[] = ["General", "Cities"];

interface RoomManagementPanelProps {
  mode?: "lobby" | "modal";
  onClose?: () => void;
}

function roleLabel(role: Role) {
  return role === "Spymaster" ? "قائد" : "محقق";
}

export function RoomManagementPanel({ mode = "lobby", onClose }: RoomManagementPanelProps) {
  const { room, player, roomId, isBusy, chooseTeam, chooseRole, leaveRoom, savePlayerName, launchGameWithSettings } =
    useGameRoom();
  const [copiedValue, setCopiedValue] = useState<"code" | "link" | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [draftSettings, setDraftSettings] = useState<{
    teamCount: TeamCount;
    wordCategory: WordCategory;
    roundTimerSeconds: string;
    lossCardCount: (typeof LOSS_CARD_OPTIONS)[number];
    extraRows: 0 | 1 | 2 | 3;
  } | null>(null);
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

  useEffect(() => {
    setNameDraft(player.name);
  }, [player.name]);

  useEffect(() => {
    setDraftSettings({
      teamCount: room.settings.teamCount,
      wordCategory: room.settings.wordCategory,
      roundTimerSeconds: String(room.settings.roundTimerSeconds),
      lossCardCount: room.settings.lossCardCount,
      extraRows: room.settings.extraRows ?? 0,
    });
  }, [
    room.settings.lossCardCount,
    room.settings.roundTimerSeconds,
    room.settings.teamCount,
    room.settings.wordCategory,
    room.settings.extraRows,
  ]);

  const activeTeams = getActiveTeams(room.settings.teamCount);
  const canStartGame = player.isHost && !isBusy;
  const roundTimerValue = draftSettings?.roundTimerSeconds ?? String(room.settings.roundTimerSeconds);
  const isModal = mode === "modal";
  const isLobbyModal = isModal && room.gameState === "Lobby";
  const setupControlsDisabled = isBusy || room.gameState !== "Lobby";
  const teamCountControlsDisabled = isBusy || !player.isHost;
  const canApplyDraft = player.isHost && !isBusy && draftSettings !== null;
  const shouldShowHostControls = player.isHost;

  const handleApplyAndStart = () => {
    if (!draftSettings) {
      return;
    }

    void launchGameWithSettings({
      teamCount: draftSettings.teamCount,
      wordCategory: draftSettings.wordCategory,
      roundTimerSeconds: Number(draftSettings.roundTimerSeconds),
      lossCardCount: draftSettings.lossCardCount,
      extraRows: draftSettings.extraRows,
    }).then(() => {
      if (mode === "modal") {
        onClose?.();
      }
    });
  };

  const handleNameSave = async () => {
    try {
      await savePlayerName(nameDraft);
      setNameError(null);
      setIsRenameOpen(false);
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "تعذر تحديث الاسم.");
    }
  };

  if (isModal) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#1E293B] shadow-2xl">
          <div className="bg-[#0F172A] px-5 pb-5 pt-3 text-center md:px-7">
            <div className="relative flex items-center justify-center gap-3">
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="إغلاق الإعدادات"
                  className="absolute right-5 top-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-[#152033] text-xl font-black text-[#F8FAFC] transition hover:bg-[#17233a] md:right-7"
                >
                  ×
                </button>
              ) : null}
              <p className="text-sm font-bold tracking-[0.24em] text-[#F8FAFC]/60 md:text-base">رمز الدعوة</p>
            </div>
            <p className="mt-3 text-4xl font-black tracking-[0.35em] text-[#2563EB] md:text-5xl">{roomId}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
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
              <button
                type="button"
                onClick={() => {
                  setNameDraft(player.name);
                  setNameError(null);
                  setIsRenameOpen((currentValue) => !currentValue);
                }}
                className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#2563EB]/15"
              >
                تغيير الاسم
              </button>
              <button
                type="button"
                onClick={() => void leaveRoom()}
                disabled={isBusy}
                className="rounded-2xl border border-[#DC2626]/50 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#DC2626]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                مغادرة الغرفة
              </button>
            </div>
            {isRenameOpen ? (
              <div className="mx-auto mt-4 max-w-md rounded-3xl border border-white/10 bg-[#152033] p-3">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value.slice(0, 24))}
                  placeholder="اسمك داخل اللعبة"
                  className="h-11 w-full rounded-2xl border border-white/15 bg-[#0F172A] px-4 text-base font-bold text-[#F8FAFC] outline-none transition focus:border-[#2563EB]"
                />
                {nameError ? <p className="mt-2 text-xs font-bold text-[#FCA5A5]">{nameError}</p> : null}
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleNameSave}
                    className="rounded-2xl bg-[#2563EB] px-4 py-2 text-sm font-black text-[#F8FAFC] transition hover:bg-[#1D4ED8]"
                  >
                    حفظ الاسم
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRenameOpen(false);
                      setNameError(null);
                      setNameDraft(player.name);
                    }}
                    className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC]/85 transition hover:bg-white/5"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {shouldShowHostControls ? (
            <div className="grid gap-5 p-5 md:p-7">
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-[#F8FAFC]">عدد الفرق</p>
                <span className="rounded-full bg-[#0F172A] px-3 py-1 text-xs font-bold text-[#F8FAFC]/80">
                  {player.isHost ? "أنت المضيف" : "للقراءة فقط"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {TEAM_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setDraftSettings((currentValue) => (currentValue ? { ...currentValue, teamCount: count } : currentValue))}
                    disabled={teamCountControlsDisabled}
                    className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      draftSettings?.teamCount === count
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
                <p className="text-sm font-bold text-[#F8FAFC]">نوع الكلمات</p>
                <span className="text-xs font-bold text-[#F8FAFC]/60">القائمة المستخدمة</span>
              </div>
              <div className="mt-3">
                <select
                  value={draftSettings?.wordCategory ?? room.settings.wordCategory}
                  onChange={(event) =>
                    setDraftSettings((currentValue) =>
                      currentValue ? { ...currentValue, wordCategory: event.target.value as WordCategory } : currentValue,
                    )
                  }
                  disabled={isBusy || !player.isHost}
                  className="h-12 w-full rounded-2xl border border-white/15 bg-[#0F172A] px-4 text-base font-bold text-[#F8FAFC] outline-none transition focus:border-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {WORD_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category} className="bg-[#0F172A] text-[#F8FAFC]">
                      {WORD_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
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
                onChange={(event) =>
                  setDraftSettings((currentValue) =>
                    currentValue
                      ? { ...currentValue, roundTimerSeconds: event.target.value.replace(/\D/g, "").slice(0, 3) }
                      : currentValue,
                  )
                }
                onBlur={() => {
                  setDraftSettings((currentValue) =>
                    currentValue
                      ? {
                          ...currentValue,
                          roundTimerSeconds: currentValue.roundTimerSeconds.trim()
                            ? currentValue.roundTimerSeconds
                            : String(room.settings.roundTimerSeconds),
                        }
                      : currentValue,
                  );
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
                    onClick={() =>
                      setDraftSettings((currentValue) => (currentValue ? { ...currentValue, lossCardCount: count } : currentValue))
                    }
                    disabled={isBusy || !player.isHost}
                    className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      draftSettings?.lossCardCount === count
                        ? "bg-[#DC2626] text-[#F8FAFC]"
                        : "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-[#221523]"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-[#F8FAFC]">اضافات خاصة</p>
              <div className="mt-3 rounded-[2rem] border border-white/10 bg-[#0F172A] p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-xs font-bold text-[#F8FAFC]/70">اسطر اضافية</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {([0, 1, 2, 3] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() =>
                        setDraftSettings((currentValue) =>
                          currentValue
                            ? { ...currentValue, extraRows: count }
                            : currentValue,
                        )
                      }
                      disabled={isBusy || !player.isHost}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        (draftSettings?.extraRows ?? 0) === count
                          ? "bg-[#2563EB] text-[#F8FAFC]"
                          : "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-[#111d34]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLobbyModal ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleApplyAndStart}
                  disabled={!canApplyDraft}
                  className="w-full rounded-2xl bg-[#2563EB] px-5 py-4 text-lg font-black text-[#F8FAFC] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
                >
                  {player.isHost ? "بدء لعبة جديدة" : "بانتظار المضيف"}
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleApplyAndStart}
                  disabled={!canApplyDraft}
                  className="w-full rounded-2xl bg-[#2563EB] px-5 py-4 text-lg font-black text-[#F8FAFC] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
                >
                  {player.isHost ? "بدء لعبة جديدة" : "بانتظار المضيف"}
                </button>
              </div>
            )}
            </div>
          ) : null}
        </div>
      </section>
    );
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
            <button
              type="button"
              onClick={() => {
                setNameDraft(player.name);
                setNameError(null);
                setIsRenameOpen((currentValue) => !currentValue);
              }}
              className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#2563EB]/15"
            >
              تغيير الاسم
            </button>
          </div>
          {isRenameOpen ? (
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#152033] p-3">
              <input
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value.slice(0, 24))}
                placeholder="اسمك داخل اللعبة"
                className="h-11 w-full rounded-2xl border border-white/15 bg-[#0F172A] px-4 text-base font-bold text-[#F8FAFC] outline-none transition focus:border-[#2563EB]"
              />
              {nameError ? <p className="mt-2 text-xs font-bold text-[#FCA5A5]">{nameError}</p> : null}
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleNameSave}
                  className="rounded-2xl bg-[#2563EB] px-4 py-2 text-sm font-black text-[#F8FAFC] transition hover:bg-[#1D4ED8]"
                >
                  حفظ الاسم
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenameOpen(false);
                    setNameError(null);
                    setNameDraft(player.name);
                  }}
                  className="rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-[#F8FAFC]/85 transition hover:bg-white/5"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void leaveRoom()}
            disabled={isBusy}
            className="h-12 rounded-2xl border border-[#DC2626]/50 px-5 text-sm font-bold text-[#F8FAFC] transition hover:bg-[#DC2626]/15"
          >
            مغادرة الغرفة
          </button>
        </div>
      </div>

      {shouldShowHostControls ? (
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
                      onClick={() =>
                        setDraftSettings((currentValue) => (currentValue ? { ...currentValue, teamCount: count } : currentValue))
                      }
                      disabled={teamCountControlsDisabled}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        draftSettings?.teamCount === count
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
                  <p className="text-sm font-bold text-[#F8FAFC]">نوع الكلمات</p>
                  <span className="text-xs font-bold text-[#F8FAFC]/60">القائمة المستخدمة</span>
                </div>
                <div className="mt-3">
                  <select
                    value={draftSettings?.wordCategory ?? room.settings.wordCategory}
                    onChange={(event) =>
                      setDraftSettings((currentValue) =>
                        currentValue ? { ...currentValue, wordCategory: event.target.value as WordCategory } : currentValue,
                      )
                    }
                    disabled={isBusy || !player.isHost}
                    className="h-12 w-full rounded-2xl border border-white/15 bg-[#0F172A] px-4 text-base font-bold text-[#F8FAFC] outline-none transition focus:border-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {WORD_CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category} className="bg-[#0F172A] text-[#F8FAFC]">
                        {WORD_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
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
                  onChange={(event) =>
                    setDraftSettings((currentValue) =>
                      currentValue
                        ? { ...currentValue, roundTimerSeconds: event.target.value.replace(/\D/g, "").slice(0, 3) }
                        : currentValue,
                    )
                  }
                  onBlur={() => {
                    setDraftSettings((currentValue) =>
                      currentValue
                        ? {
                            ...currentValue,
                            roundTimerSeconds: currentValue.roundTimerSeconds.trim()
                              ? currentValue.roundTimerSeconds
                              : String(room.settings.roundTimerSeconds),
                          }
                        : currentValue,
                    );
                  }}
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
                      onClick={() =>
                        setDraftSettings((currentValue) => (currentValue ? { ...currentValue, lossCardCount: count } : currentValue))
                      }
                      disabled={isBusy || !player.isHost}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        draftSettings?.lossCardCount === count
                          ? "bg-[#DC2626] text-[#F8FAFC]"
                          : "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-[#221523]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-[#F8FAFC]">اضافات خاصة</p>
                <div className="mt-3 rounded-[2rem] border border-white/10 bg-[#0F172A] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-xs font-bold text-[#F8FAFC]/70">اسطر اضافية</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {([0, 1, 2, 3] as const).map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() =>
                          setDraftSettings((currentValue) =>
                            currentValue
                              ? { ...currentValue, extraRows: count }
                              : currentValue,
                          )
                        }
                        disabled={isBusy || !player.isHost}
                        className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                          (draftSettings?.extraRows ?? 0) === count
                            ? "bg-[#2563EB] text-[#F8FAFC]"
                            : "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-[#111d34]"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
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
                    disabled={setupControlsDisabled}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${teamBadgeClass(
                      team,
                      player.team === team,
                    )} disabled:cursor-not-allowed disabled:opacity-60`}
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
                    disabled={setupControlsDisabled}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
                      player.role === role
                        ? "bg-[#2563EB] text-[#F8FAFC]"
                        : "border border-white/15 bg-[#0F172A] text-[#F8FAFC]/85 hover:bg-[#1E293B]"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {roleLabel(role)}
                  </button>
                ))}
              </div>
            </div>

            {room.gameState !== "Lobby" ? (
              <div className="mt-4 rounded-3xl bg-[#0F172A] p-4 text-sm leading-7 text-[#F8FAFC]/74">
                تغيير الفريق أو الدور متاح من اللوبي فقط. إذا أردت تعديل هذه الخيارات أثناء اللعب فارجع أولًا إلى
                اللوبي.
              </div>
            ) : null}
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
      ) : null}

      {isModal ? null : (
        <div className="w-full">
          <button
            type="button"
            onClick={handleApplyAndStart}
            disabled={!canApplyDraft}
            className="w-full rounded-2xl bg-[#2563EB] px-5 py-4 text-lg font-black text-[#F8FAFC] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-[#2563EB]/40"
          >
            {player.isHost ? "بدء لعبة جديدة" : "بانتظار المضيف"}
          </button>
        </div>
      )}
    </section>
  );
}
