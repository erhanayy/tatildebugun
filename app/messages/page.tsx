import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getConversationList } from "@/lib/actions/chat";
import { AppHeader } from "@/components/navigation/app-header";
import { ChatView } from "@/components/chat/chat-view";

export const metadata = {
  title: "Gezgin Sohbeti & Özel Mesajlar | TatildeBugün",
  description: "Eşleştiğiniz seyahat arkadaşlarınızla rotalarınızı birleştirin ve anlık mesajlaşın.",
};

interface MessagesPageProps {
  searchParams: Promise<{
    user?: string;
  }>;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const conversations = await getConversationList();
  const resolvedParams = await searchParams;
  const defaultPartnerId = resolvedParams.user || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Üst Bar */}
      <AppHeader user={user} />

      {/* Ana Gövde */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 w-full flex flex-col justify-center">
        <ChatView
          initialConversations={conversations}
          currentUserId={user.id!}
          defaultPartnerId={defaultPartnerId}
        />
      </main>
    </div>
  );
}
