import { GameShell } from "../components/game-shell";
import { GameRoomProvider } from "../context/game-room-context";

export default function Home() {
  return (
    <GameRoomProvider>
      <GameShell />
    </GameRoomProvider>
  );
}
