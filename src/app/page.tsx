import ChatInterface from "@/components/chats/Chat";
import Image from "next/image";

export default function Home() {
  return (
    <main className="w-full h-screen bg-stone-50">
      <ChatInterface />
    </main>
  );
}
