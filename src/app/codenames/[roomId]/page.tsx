import type { Metadata } from "next";
import { GameRoomProvider } from "../../../context/game-room-context";
import { GameShell } from "../../../components/game-shell";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const roomId = resolvedParams?.roomId;

  return {
    title: `كود نيمز - غرفة ${roomId || ""}`,
    description: "العب لعبة كود نيمز التكتيكية والذكية مع أصدقائك وكشف الكلمات السرية!",
    openGraph: {
      title: `كود نيمز - غرفة ${roomId || ""}`,
      description: "العب لعبة كود نيمز التكتيكية والذكية مع أصدقائك وكشف الكلمات السرية!",
      images: [
        {
          url: "/organs.jpeg",
          alt: "Bismar كود نيمز",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `كود نيمز - غرفة ${roomId || ""}`,
      description: "العب لعبة كود نيمز التكتيكية والذكية مع أصدقائك وكشف الكلمات السرية!",
      images: ["/organs.jpeg"],
    },
  };
}

export default async function CodenamesRoomPage({ params }: PageProps) {
  const resolvedParams = await params;
  const roomId = resolvedParams?.roomId;

  if (!roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-[#F8FAFC]">
        <div className="text-center font-bold">معرف الغرفة غير صالح.</div>
      </div>
    );
  }

  return (
    <GameRoomProvider initialRoomId={roomId}>
      <GameShell />
    </GameRoomProvider>
  );
}
