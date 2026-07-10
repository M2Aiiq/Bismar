import type { Metadata } from "next";
import { ClashBoardScreen } from "../../../components/clash/clash-board-screen";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const roomId = resolvedParams?.roomId;

  return {
    title: `صراع الأعضاء - غرفة ${roomId || ""}`,
    description: "العب لعبة صراع الأعضاء التكتيكية مع أصدقائك وحافظ على سلامة أعضائك الحيوية!",
    openGraph: {
      title: `صراع الأعضاء - غرفة ${roomId || ""}`,
      description: "العب لعبة صراع الأعضاء التكتيكية مع أصدقائك وحافظ على سلامة أعضائك الحيوية!",
      images: [
        {
          url: "/organs.jpeg",
          alt: "صراع الأعضاء",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `صراع الأعضاء - غرفة ${roomId || ""}`,
      description: "العب لعبة صراع الأعضاء التكتيكية مع أصدقائك وحافظ على سلامة أعضائك الحيوية!",
      images: ["/organs.jpeg"],
    },
  };
}

export default async function ClashRoomPage({ params }: PageProps) {
  const resolvedParams = await params;
  const roomId = resolvedParams?.roomId;

  if (!roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-[#F8FAFC]">
        <div className="text-center font-bold">معرف الغرفة غير صالح.</div>
      </div>
    );
  }

  return <ClashBoardScreen roomId={roomId} />;
}
