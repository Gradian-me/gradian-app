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
      icon="MessageSquare"
      showEndLine={false}
    >
      <div className="h-[calc(100vh-10rem)]">
        <ChatInterface showChatList={true} />
      </div>
    </MainLayout>
  );
}

