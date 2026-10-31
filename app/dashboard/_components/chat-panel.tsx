'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X, Send, Loader2, MessageCircle, AlertTriangle, Bot, User,
  History, Plus, Trash2, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: string;
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  const loadConversationList = useCallback(async (): Promise<Conversation[]> => {
    try {
      const res = await fetch('/api/chat/conversations');
      if (!res.ok) return [];
      const data = await res.json();
      const list: Conversation[] = data?.conversations ?? [];
      setConversations(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/chat/conversations/${id}`);
      if (!res.ok) {
        toast.error('Erro ao carregar a conversa.');
        return;
      }
      const data = await res.json();
      const msgs: Message[] = (data?.messages ?? []).map((m: any) => ({
        role: m?.role === 'assistant' ? 'assistant' : 'user',
        content: m?.content ?? '',
      }));
      setMessages(msgs);
      setActiveConvId(id);
      setShowHistory(false);
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Ao abrir: carrega a lista e abre a conversa mais recente (se existir).
  useEffect(() => {
    (async () => {
      setInitializing(true);
      const list = await loadConversationList();
      if (list.length > 0) {
        await loadConversation(list[0].id);
      }
      setInitializing(false);
    })();
  }, [loadConversationList, loadConversation]);

  const startNewConversation = () => {
    setMessages([]);
    setActiveConvId(null);
    setShowHistory(false);
    setInput('');
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Eliminar esta conversa?')) return;
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erro ao eliminar.'); return; }
      const list = await loadConversationList();
      if (id === activeConvId) {
        if (list.length > 0) await loadConversation(list[0].id);
        else startNewConversation();
      }
    } catch {
      toast.error('Erro de rede.');
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...(prev ?? []), userMsg]);
    setLoading(true);

    try {
      // Garante uma conversa persistida antes de enviar.
      let convId = activeConvId;
      if (!convId) {
        const createRes = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (createRes.ok) {
          const d = await createRes.json();
          convId = d?.conversation?.id ?? null;
          if (convId) setActiveConvId(convId);
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          convId ? { message: text, conversationId: convId } : { message: text, history: messages }
        ),
      });

      if (!res.ok) {
        toast.error('Erro ao contactar o assistente.');
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let partialRead = '';

      setMessages((prev) => [...(prev ?? []), { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed?.content) {
                assistantContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...(prev ?? [])];
                  if (updated.length > 0) {
                    updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  }
                  return updated;
                });
              }
            } catch { /* skip */ }
          }
        }
      }
      // Atualiza a lista (título/ordem) depois de responder.
      loadConversationList();
    } catch {
      toast.error('Erro de rede.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="font-display font-semibold truncate">Assistente InvestAssist</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon-sm" title="Nova conversa" onClick={startNewConversation}>
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant={showHistory ? 'secondary' : 'ghost'}
            size="icon-sm"
            title="Histórico de conversas"
            onClick={() => { setShowHistory((v) => !v); if (!showHistory) loadConversationList(); }}
          >
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="px-3 py-2 bg-muted/50 border-b border-border">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Isto não constitui aconselhamento financeiro.
        </p>
      </div>

      {/* Painel de histórico (overlay) */}
      {showHistory && (
        <div className="absolute inset-x-0 top-[97px] bottom-0 bg-background z-20 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-semibold">Conversas</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowHistory(false)}><X className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="flex-1 p-2">
            <Button variant="outline" size="sm" className="w-full mb-2 justify-start" onClick={startNewConversation}>
              <Plus className="w-4 h-4 mr-2" /> Nova conversa
            </Button>
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ainda não tem conversas guardadas.</p>
            ) : (
              <div className="space-y-1">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadConversation(c.id)}
                    className={`group flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors ${
                      c.id === activeConvId ? 'bg-muted' : 'hover:bg-muted/60'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{c.title || 'Nova conversa'}</p>
                      <p className="text-xs text-muted-foreground">{c.messageCount} mensagens</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Eliminar"
                      onClick={(e: React.MouseEvent) => deleteConversation(c.id, e)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {(initializing || historyLoading) && (
            <div className="flex items-center gap-2 text-muted-foreground justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">A carregar…</span>
            </div>
          )}
          {!initializing && !historyLoading && messages.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Pergunte sobre a sua carteira, desempenho ou sugestões.</p>
            </div>
          )}
          {(messages ?? []).map((msg: Message, i: number) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                <p className="whitespace-pre-wrap">{msg?.content ?? ''}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">A pensar...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Escreva a sua pergunta..."
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
