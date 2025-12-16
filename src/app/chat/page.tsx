// Chat Page
// Main chat interface page - redirects to /chat if no chat-id

'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { ChatInterface } from '@/domains/chat/components/ChatInterface';

export default function ChatPage() {
  return (
    <MainLayout
      title="Chat"
      subtitle="AI-powered conversations with agent orchestration"
      icon="MessageCircle"
      showEndLine={false}
    >
      <div className="h-[calc(100vh-9rem)]">
        <ChatInterface showChatList={true} />
      </div>
    </MainLayout>
  );
}

