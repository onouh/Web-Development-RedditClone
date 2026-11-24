import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Maximize2, MessageCircle } from 'lucide-react';
import { ConversationHeader, ConversationList, MessagePane } from './ChatParts.jsx';
import { useChat } from '../context/ChatContext.jsx';

export default function ChatDrawer() {
  const { open, closeDrawer, activeConversation, openConversation, conversations } = useChat();
  const [view, setView] = useState('list');
  const location = useLocation();

  useEffect(() => {
    if (!open) setView('list');
  }, [open]);

  useEffect(() => {
    setView('list');
  }, [location.pathname]);

  if (!open || location.pathname === '/chat') return null;

  const showThread = view === 'thread' && activeConversation;

  return (
    <div className="fixed bottom-0 right-3 z-50 w-[360px] max-w-[calc(100vw-1.5rem)] animate-slide-up sm:right-6">
      <div className="flex h-[500px] flex-col overflow-hidden rounded-t-xl border border-b-0 border-line bg-surface shadow-pop">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <MessageCircle size={18} className="text-accent" />
          <p className="flex-1 text-sm font-bold">{showThread ? 'Chat' : 'Chats'}</p>
          <Link to="/chat" onClick={closeDrawer} className="icon-btn h-8 w-8" aria-label="Open full chat view">
            <Maximize2 size={15} />
          </Link>
          <button type="button" onClick={closeDrawer} className="icon-btn h-8 w-8" aria-label="Close chat drawer">
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
        </div>

        {showThread ? (
          <>
            <ConversationHeader showBack onBack={() => setView('list')} />
            <MessagePane />
          </>
        ) : (
          <>
            {conversations.length > 0 && (
              <p className="border-b border-line px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Recent conversations
              </p>
            )}
            <ConversationList
              className="flex-1"
              onSelect={async (id) => {
                setView('thread');
                await openConversation(id);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
