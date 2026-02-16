// Chat Page with Dynamic Chat ID
// Handles individual chat routes: /chat/[chat-id]

'use client';

import { useSetLayoutProps } from '@/gradian-ui/layout/contexts/LayoutPropsContext';
import { ChatInterface } from '@/domains/chat/components/ChatInterface';

export default function ChatDetailPage() {
  useSetLayoutProps({
    title: 'Chat',
    subtitle: 'AI-powered conversations with agent orchestration',
    icon: 'BotMessageSquare',
    showEndLine: false,
    hidePadding: true,
  });

  return (
    <div className="h-full">
      <ChatInterface showChatList={true} />
    </div>
  );
}

