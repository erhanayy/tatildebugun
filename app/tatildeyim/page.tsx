import { auth } from "@/auth";
import { AppHeader } from "@/components/navigation/app-header";
import { TatildeyimView } from "@/components/places/tatildeyim-view";
import { getUserTripsForGuide, getTripGuideDetails } from "@/lib/actions/places";
import { redirect } from "next/navigation";
import { Luggage } from "lucide-react";

export const metadata = {
  title: "Tatildeyim - Canlı Tur Rehberim | TatildeBugün",
  description: "Aktif seyahat rotanızdaki şehirlerde görülecek yerleri keşfedin, gördüklerinizi zaman damgasıyla tikleyin ve puanlayın.",
};

interface TatildeyimPageProps {
  searchParams: Promise<{ tripId?: string }>;
}

export default async function TatildeyimPage({ searchParams }: TatildeyimPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { tripId } = await searchParams;

  // Kullanıcının tüm turlarını çek
  const userTrips = await getUserTripsForGuide();

  // Hedef turu belirle (parametre varsa onu, yoksa ilk turu seç)
  const activeTrip = tripId
    ? userTrips.find((t) => t.id === tripId) || userTrips[0] || null
    : userTrips[0] || null;

  let stops: any[] = [];
  let timeline: any[] = [];

  if (activeTrip) {
    const details = await getTripGuideDetails(activeTrip.id);
    if (details) {
      stops = details.stops;
      timeline = details.timeline;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Üst Navigasyon Menüsü */}
      <AppHeader user={session.user} />

      {/* Ana Gövde */}
      <main className="flex-1 w-full pb-16">
        <TatildeyimView
          userTrips={userTrips}
          activeTrip={activeTrip}
          stops={stops}
          timeline={timeline}
        />
      </main>
    </div>
  );
}
