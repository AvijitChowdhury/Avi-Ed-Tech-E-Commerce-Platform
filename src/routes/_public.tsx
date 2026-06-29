import { createFileRoute, Outlet } from "@tanstack/react-router";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AnnouncementTicker from "@/components/layout/AnnouncementTicker";
import ChatWidget from "@/components/chat/ChatWidget";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementTicker />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
