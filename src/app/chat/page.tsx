// Chat Page
// Main chat interface page - redirects to /chat if no chat-id

'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ChatInterface } from '@/domains/chat/components/ChatInterface';

export default function ChatPage() {
  return (
    <MainLayout
      title="Chatbot"
      subtitle="AI-powered conversations with agent orchestration"
      icon="BotMessageSquare"
      hidePadding={true}
      showEndLine={false}
    >
      <div className="h-full w-full">
        <ChatInterface showChatList={true} />
      </div>
    </MainLayout>
  );
}

