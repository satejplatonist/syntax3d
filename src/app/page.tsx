import ChatInterface from "@/components/chats/Chat";
import Image from "next/image";

export default function Home() {
  return (
    <main className="w-full h-screen bg-neutral-900">
      <ChatInterface />
    </main>
  );
}
