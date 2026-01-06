import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Loader2, Globe, ExternalLink } from 'lucide-react';
import { Button } from './Button';

export const NewsGenerator: React.FC = () => {
  const [news, setNews] = useState<string>('');
  const [source, setSource] = useState<{ title: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateNews = async () => {
    setLoading(true);
    setError('');
    setSource(null);
    
    try {
      // Standardized initialization with process.env.API_KEY as per Google GenAI SDK best practices
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Using gemini-3-flash-preview for basic text and search tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Find one recent (from the last month) funny, quirky, or weird positive news story. Summarize it in one short, punchy, humorous sentence (under 25 words).",
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "A cat became mayor of a small town in Italy. Probably.";
      setNews(text);

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        const webChunk = groundingChunks.find((c: any) => c.web);
        if (webChunk && webChunk.web) {
            setSource({
                title: webChunk.web.title,
                url: webChunk.web.uri
            });
        }
      }

    } catch (err) {
      console.error("News generation failed", err);
      setNews("A duck ran a marathon in New York. We wish it was real. 🦆");
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
            <h3 className="text-3xl font-heading font-black text-hype-black uppercase">Weird World</h3>
            <p className="text-gray-500 font-mono text-sm mt-2">// Real news, just the weird bits.</p>
        </div>
        
        <div className="flex-grow flex flex-col items-center justify-center mb-8 min-h-[160px] border-2 border-dashed border-gray-300 p-6 bg-gray-50 rounded-lg">
                {loading ? (
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-black animate-spin" />
                    <span className="text-xs font-bold uppercase text-gray-500">Scanning the Globe...</span>
                </div>
            ) : news ? (
                <>
                    <p className="text-2xl font-bold text-black text-center font-heading leading-tight mb-4">
                        "{news}"
                    </p>
                    {source && (
                        <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center text-xs font-bold text-black hover:underline border border-black px-2 py-1"
                        >
                            Source <ExternalLink size={10} className="ml-1" />
                        </a>
                    )}
                </>
            ) : (
                <div className="text-center">
                    <Globe className="w-12 h-12 mx-auto mb-2 text-gray-300" strokeWidth={1} />
                    <p className="text-gray-400 font-bold">Ready for chaos?</p>
                </div>
            )}
        </div>

        <Button onClick={generateNews} disabled={loading} variant="primary" className="w-full text-lg py-4 rounded-lg shadow-none border-2 border-black">
            {loading ? 'Searching...' : news ? 'Another One' : 'Get Weird News'}
        </Button>
        
        {error && <p className="text-red-500 text-xs mt-2 font-mono text-center">{error}</p>}
    </div>
  );
};
