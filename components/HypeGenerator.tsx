import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Loader2, RefreshCw, Zap } from 'lucide-react';
import { Button } from './Button';

export const HypeGenerator: React.FC = () => {
  const [compliment, setCompliment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateHype = async () => {
    setLoading(true);
    setError('');
    
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "Write a short, hilarious, and relatable one-liner joke aimed at millennials. Topics: expensive iced coffee, back pain, cancelling plans, 90s nostalgia, student loans, or keeping plants alive. Tone: self-deprecating, dry, and witty. Keep it under 25 words. Use 1-2 emojis.",
      });

      setCompliment(response.text || "My neck, my back, my anxiety attack. 📉☕️");
    } catch (err) {
      console.error("Hype generation failed", err);
      const fallbacks = [
        "Iced coffee is a substitute for a personality, right? 🧊☕️",
        "Canceling plans is my love language. ✌️😴",
        "I bought another plant. It will die in 3 days. 🌿💀",
        "Mentally, I'm at Blockbuster on a Friday night in 1999. 📼✨",
      ];
      setCompliment(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full p-8 flex flex-col relative">
        {/* Decorative corner doodle */}
        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-black"></div>
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-black"></div>

        <div className="mb-6 border-b-2 border-black pb-4">
            <h3 className="text-3xl font-heading font-black text-hype-black uppercase">Vibe Check</h3>
            <p className="text-gray-500 font-mono text-sm mt-2">// Cheaper than therapy.</p>
        </div>
        
        <div className="flex-grow flex items-center justify-center mb-8 min-h-[160px] border-2 border-dashed border-gray-300 p-6 bg-gray-50 rounded-lg">
                {loading ? (
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-black animate-spin" />
                    <span className="text-xs font-bold uppercase text-gray-500">Consulting the Oracles...</span>
                </div>
            ) : compliment ? (
                <p className="text-2xl font-bold text-black text-center font-heading leading-tight">
                    "{compliment}"
                </p>
            ) : (
                <div className="text-center">
                    <Zap className="w-12 h-12 mx-auto mb-2 text-gray-300" strokeWidth={1} />
                    <p className="text-gray-400 font-bold">Tap below.</p>
                </div>
            )}
        </div>

        <Button onClick={generateHype} disabled={loading} variant="primary" className="w-full text-lg py-4 rounded-lg shadow-none border-2 border-black">
            {loading ? 'Thinking...' : compliment ? 'Hit Me Again' : 'Generate Vibe'}
        </Button>
        
        {error && <p className="text-red-500 text-xs mt-2 font-mono text-center">{error}</p>}
    </div>
  );
};