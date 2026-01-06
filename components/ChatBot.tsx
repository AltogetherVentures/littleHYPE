import * as React from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MessageCircle, X, Send, Sparkles, Loader2, Bot } from 'lucide-react';
import { PRODUCTS } from '../constants';

const { useState, useRef, useEffect } = React;

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const SYSTEM_INSTRUCTION = `
You are HypeBot, the official AI assistant for littleHYPE. 
Your Vibe: Minimalist, dry humor, helpful but concise.
Your Goal: Help users find products, answer questions.

Knowledge Base (Products):
${PRODUCTS.map(p => `- ${p.name} (${p.price}): ${p.tagline} ${p.description}`).join('\n')}

Key Info:
- Shipping: Domestic 3-5 days. International approx 2 weeks.
- Returns: 30-day guarantee.
`;

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'intro', role: 'model', text: 'HypeBot initialized. How can I help?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const initChat = async () => {
        try {
            // Always use process.env.API_KEY directly when initializing GoogleGenAI
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const session = ai.chats.create({
                model: 'gemini-3-pro-preview',
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION,
                },
            });
            setChatSession(session);
        } catch (e) {
            console.error("Failed to init chat", e);
        }
    };
    initChat();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result: GenerateContentResponse = await chatSession.sendMessage({ message: userMsg.text });
      const botText = result.text || "Error. Try again.";
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: botText };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: "System glitch." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Toggle Button - Square & Hard */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 border-3 border-black shadow-hard transition-transform hover:-translate-y-1 ${isOpen ? 'bg-black text-white' : 'bg-white text-black'}`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat Window - Terminal Style */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 md:right-6 w-[90vw] md:w-[350px] h-[500px] max-h-[70vh] bg-white border-3 border-black shadow-hard-lg z-50 flex flex-col font-mono">
          
          {/* Header */}
          <div className="bg-black text-white p-3 flex items-center justify-between border-b-3 border-black">
            <span className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500"></span> HypeBot_v1.0
            </span>
            <button onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 text-sm border-2 border-black shadow-hard-sm ${
                    msg.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  <span className="block text-[10px] opacity-50 mb-1 uppercase">{msg.role}</span>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                  <div className="bg-white p-3 border-2 border-black flex items-center gap-2 text-xs font-bold">
                     <Loader2 size={12} className="animate-spin" /> PROCESSING...
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t-3 border-black">
            <div className="flex items-center gap-2">
                <span className="text-black font-bold">{'>'}</span>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="w-full bg-transparent focus:outline-none font-bold text-sm"
                    autoFocus
                />
                <button onClick={handleSend} disabled={!input.trim() || isLoading}>
                    <Send size={16} className="text-black" />
                </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
};
