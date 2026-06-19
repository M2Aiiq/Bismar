"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDatabase, ref, set } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { useGameRoom } from "../../context/game-room-context";
import { getRealtimeDatabase } from "../../lib/firebase";
import { createRoomId } from "../../lib/game";
import type { ClashRoomState } from "../../types/organClash";

export function CreateClashRoomButton() {
  const router = useRouter();
  const { playerId, playerName, firebaseReady, isBusy } = useGameRoom();
  const [isOpen, setIsOpen] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [initialHandSize, setInitialHandSize] = useState(5);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState(30);
  const [creating, setCreating] = useState(false);

  const disabled = isBusy || !firebaseReady || !playerName || creating;

  async function handleInitializeLobby() {
    if (disabled) return;
    setCreating(true);

    try {
      const database = getRealtimeDatabase() || getDatabase();
      const roomId = createRoomId();

      const initialRoom: ClashRoomState = {
        roomId,
        status: "lobby",
        players: {
          [playerId]: {
            id: playerId,
            name: playerName,
            organs: [],
            hand: [],
            isZombie: false,
            isHost: true,
          },
        },
        presence: {
          [playerId]: true,
        },
        drawPile: [],
        discardPile: [],
        currentTurnPlayerId: "",
        turnPhase: "draw",
        winnerId: null,
        settings: {
          maxPlayers,
          initialHandSize,
          turnTimerSeconds,
        },
      };

      // حفظ الغرفة في Firebase والتوجيه للمسار الديناميكي
      await set(ref(database, `clashRooms/${roomId}`), initialRoom);
      setIsOpen(false);
      router.push(`/clash/${roomId}`);
    } catch (error) {
      console.error("Failed to launch Organ Clash room:", error);
      alert(
        "تعذر إنشاء غرفة صراع الأعضاء: " +
          (error instanceof Error ? error.message : "خطأ غير معروف")
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full rounded-2xl border border-rose-500/30 bg-rose-950/20 px-5 py-4 text-base font-black text-rose-300 transition hover:bg-rose-950/40 hover:border-rose-500 disabled:cursor-not-allowed disabled:bg-rose-950/10 disabled:text-rose-300/40"
      >
        العب صراع الأعضاء (Organ Clash)
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            {/* الخلفية القابلة للنقر للإغلاق */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 cursor-pointer"
            />

            {/* محتوى النافذة المنبثقة */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl md:p-8 text-[#F8FAFC]"
            >
              <h2 className="text-2xl font-black text-rose-400 mb-6 text-center">
                إعداد لعبة صراع الأعضاء
              </h2>

              {/* تحديد عدد اللاعبين */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  الحد الأقصى للاعبين: {maxPlayers} لاعبين
                </label>
                <div className="flex gap-2 justify-center">
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxPlayers(num)}
                      className={`flex-1 py-2 text-sm font-bold rounded-xl transition ${
                        maxPlayers === num
                          ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* حجم اليد الابتدائي */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  عدد الكروت البدائية في اليد: {initialHandSize} كروت
                </label>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={initialHandSize}
                  onChange={(e) => setInitialHandSize(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>3 كروت</span>
                  <span>5 كروت (افتراضي)</span>
                  <span>8 كروت</span>
                </div>
              </div>

              {/* مؤقت دور اللاعب بالثواني */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  مؤقت دور اللاعب (بالثواني):
                </label>
                <div className="flex gap-2 items-center bg-slate-800 rounded-xl p-1 border border-white/5">
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={turnTimerSeconds}
                    onChange={(e) => setTurnTimerSeconds(Math.max(5, Math.min(300, Number(e.target.value) || 30)))}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-[#F8FAFC] outline-none text-center font-bold font-mono"
                  />
                  <div className="flex gap-1 pr-1.5">
                    {[15, 30, 45, 60].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setTurnTimerSeconds(sec)}
                        className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                          turnTimerSeconds === sec
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-650"
                        }`}
                      >
                        {sec}ث
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 text-right">
                  الحد الأدنى 5 ثوانٍ، الأقصى 300 ثانية.
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={handleInitializeLobby}
                  disabled={creating}
                  className="flex-1 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-500 shadow-lg shadow-rose-600/20 disabled:bg-rose-800 disabled:cursor-not-allowed"
                >
                  {creating ? "جاري إنشاء الغرفة..." : "إنشاء الغرفة والبدء"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={creating}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
