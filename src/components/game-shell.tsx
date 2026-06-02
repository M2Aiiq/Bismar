"use client";

import { Suspense } from "react";

import { BoardScreen } from "./board-screen";
import { GameOverScreen } from "./game-over-screen";
import { HomeScreen } from "./home-screen";
import { LobbyScreen } from "./lobby-screen";
import { useGameRoom } from "../context/game-room-context";

export function GameShell() {
  const { room, player, isReady, error, clearError } = useGameRoom();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_#0f172a_32%,_#0f172a_100%)] px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        {error ? (
          <div className="flex items-start justify-between gap-3 rounded-3xl border border-[#DC2626]/40 bg-[#DC2626]/15 p-4 text-sm text-[#F8FAFC]">
            <p>{error}</p>
            <button type="button" onClick={clearError} className="font-bold text-[#F8FAFC]">
              إغلاق
            </button>
          </div>
        ) : null}

        {!isReady ? (
          <div className="rounded-3xl border border-white/10 bg-[#1E293B] p-8 text-center text-sm text-[#F8FAFC]/80 shadow-lg">
            جارٍ تهيئة الجلسة المحلية والاتصال اللحظي...
          </div>
        ) : null}

        {isReady && (!room || !player) ? (
          <Suspense fallback={null}>
            <HomeScreen />
          </Suspense>
        ) : null}
        {room?.gameState === "Lobby" && player ? <LobbyScreen /> : null}
        {room?.gameState === "Playing" && player ? <BoardScreen /> : null}
        {room?.gameState === "GameOver" && player ? <GameOverScreen /> : null}
      </div>
    </main>
  );
}
