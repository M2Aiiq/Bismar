"use client";

import { useParams } from "next/navigation";
import { BlitzBoardScreen } from "../../../components/blitz/blitz-board-screen";

export default function BlitzRoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;

  if (!roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-[#F8FAFC]">
        <div className="text-center font-bold">معرف الغرفة غير صالح.</div>
      </div>
    );
  }

  return <BlitzBoardScreen roomId={roomId} />;
}
