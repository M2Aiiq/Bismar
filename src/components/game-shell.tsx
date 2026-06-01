"use client";

import { BoardScreen } from "@/components/board-screen";
import { GameOverScreen } from "@/components/game-over-screen";
import { HomeScreen } from "@/components/home-screen";
import { LobbyScreen } from "@/components/lobby-screen";
import { useGameRoom } from "@/context/game-room-context";

export function GameShell() {
  const { room, player, isReady, error, clearError } = useGameRoom();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_35%,_#e2e8f0_100%)] px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-lg backdrop-blur md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold text-amber-700">Iraqi Party Game</p>
              <h1 className="text-2xl font-black text-slate-950 md:text-3xl">بنية أساسية للعبة كلمات عراقية</h1>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              مزامنة لحظية من المتصفح مباشرة باستخدام Firebase Realtime Database وواجهة Next.js متجاوبة
              مع الهواتف.
            </p>
          </div>
        </header>

        {error ? (
          <div className="flex items-start justify-between gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p>{error}</p>
            <button type="button" onClick={clearError} className="font-bold text-rose-700">
              إغلاق
            </button>
          </div>
        ) : null}

        {!isReady ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-lg">
            جارٍ تهيئة الجلسة المحلية والاتصال اللحظي...
          </div>
        ) : null}

        {isReady && (!room || !player) ? <HomeScreen /> : null}
        {room?.gameState === "Lobby" && player ? <LobbyScreen /> : null}
        {room?.gameState === "Playing" && player ? <BoardScreen /> : null}
        {room?.gameState === "GameOver" && player ? <GameOverScreen /> : null}
      </div>
    </main>
  );
}
