import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LandingView } from "@/components/landing/landing-view";

export const metadata = {
  title: "AllTripX | Global Travel Map & Explorer Network",
  description:
    "Build your personal world travel map, track visited countries and cities, chart journeys, and connect with fellow explorers worldwide on AllTripX.",
};

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <LandingView />;
}
