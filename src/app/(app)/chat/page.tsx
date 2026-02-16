// Chat Page
// Main chat interface page - redirects to /chat if no chat-id

'use client';

import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { ChatInterface } from '@/domains/chat/components/ChatInterface';

export default function ChatPage() {
  useSetLayoutProps({
    title: 'Chatbot',
    subtitle: 'AI-powered conversations with agent orchestration',
    icon: 'BotMessageSquare',
    hidePadding: true,
    showEndLine: false,
  });

  return (
    <div className="h-full w-full">
      <ChatInterface showChatList={true} />
    </div>
  );
}

