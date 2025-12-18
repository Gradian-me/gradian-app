// Chat Page with Dynamic Chat ID
// Handles individual chat routes: /chat/[chat-id]

'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ChatInterface } from '@/domains/chat/components/ChatInterface';

export default function ChatDetailPage() {
  return (
    <MainLayout
      title="Chat"
      subtitle="AI-powered conversations with agent orchestration"
      icon="BotMessageSquare"
      showEndLine={false}
      hidePadding={true}
    >
      <div className="h-full">
        <ChatInterface showChatList={true} />
      </div>
    </MainLayout>
  );
}

