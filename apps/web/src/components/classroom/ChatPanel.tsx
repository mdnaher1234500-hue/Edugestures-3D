'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessagePayload, UserRole } from '@edugesture/shared-types';
import { Send, MessageSquare } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface ChatPanelProps {
  sessionCode: string;
  currentUserRole?: UserRole;
}

export default function ChatPanel({ sessionCode, currentUserRole }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();

    const handleMessage = (msg: ChatMessagePayload) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleHistory = (history: ChatMessagePayload[]) => {
      setMessages(history);
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:history', handleHistory);

    // Request chat history
    socket.emit('chat:history', { sessionCode });

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:history', handleHistory);
    };
  }, [sessionCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const socket = getSocket();
    socket.emit('chat:send', { sessionCode, message: inputMessage.trim() });
    setInputMessage('');
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-sm text-slate-200">Classroom Chat</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">{messages.length} msgs</span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-10">
            No messages yet. Say hello to the class!
          </div>
        ) : (
          messages.map((m) => {
            const isTeacher = m.senderRole === UserRole.TEACHER;
            return (
              <div key={m.id} className="flex flex-col text-xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`font-semibold ${
                      isTeacher ? 'text-amber-400' : 'text-indigo-300'
                    }`}
                  >
                    {m.senderName}
                  </span>
                  {isTeacher && (
                    <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded text-[10px] font-medium border border-amber-500/30">
                      TEACHER
                    </span>
                  )}
                  <span className="text-slate-500 text-[10px] ml-auto">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-slate-800/80 rounded-xl px-3 py-2 text-slate-200 break-words border border-slate-700/50 leading-relaxed">
                  {m.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-900/40 flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a question or comment..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-all shadow-md shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
