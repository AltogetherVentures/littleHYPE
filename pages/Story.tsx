import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Brain, Zap, Sparkles } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { TIKTOK_VIDEOS } from '../constants';

export const Story: React.FC = () => {
  return (
    <div className="bg-white min-h-screen font-sans overflow-x-hidden text-black">
      <Navbar />

      <main className="pt-32 px-4 max-w-7xl mx-auto">
        
        {/* 1. Hero / Intro */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-32 border-b-3 border-black pb-16">
            <div className="lg:w-1/2">
                <div className="aspect-[4/5] border-3 border-black shadow-hard bg-gray-100 relative">
                    <img 
                        src="https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                        alt="Al - Founder" 
                        className="w-full h-full object-cover grayscale contrast-125"
                    />
                    <div className="absolute -bottom-6 -right-6 bg-white border-3 border-black px-8 py-4 font-heading font-black text-2xl shadow-hard rotate-3">
                        Hello. 👋
                    </div>
                </div>
            </div>

            <div className="lg:w-1/2 space-y-8">
                <h1 className="font-heading text-6xl md:text-8xl font-black uppercase leading-[0.9]">
                    No Idea <br/> What I'm Doing.
                </h1>
                <h2 className="text-2xl font-bold font-mono text-gray-500">
                    // But doing it with style.
                </h2>
                <p className="text-xl font-medium leading-relaxed">
                    littleHYPE is a coping mechanism that got out of hand. I wanted to make things that felt like a digital hug, but without the awkwardness. 
                </p>
                <p className="text-xl font-medium leading-relaxed">
                    It's messy, it's black and white, and it's built on too much caffeine.
                </p>
            </div>
        </div>

        {/* 2. The Brain - Wireframe Style */}
        <section className="mb-32">
            <div className="border-3 border-black p-8 md:p-16 relative overflow-hidden bg-white shadow-hard">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    
                    {/* Text Content */}
                    <div>
                        <div className="inline-flex items-center gap-2 mb-6 border-2 border-black px-4 py-1 rounded-full">
                            <Brain size={20} />
                            <span className="font-bold uppercase text-sm">Brain.exe</span>
                        </div>
                        <h3 className="font-heading text-5xl font-black mb-6 uppercase">
                            Powered by <br/> Chaos.
                        </h3>
                        
                        <div className="space-y-6 mt-8">
                            <div className="flex gap-6 items-start">
                                <Zap className="flex-shrink-0 mt-1" size={32} />
                                <div>
                                    <h4 className="font-bold text-xl uppercase mb-1">Hyper-Focus</h4>
                                    <p className="text-gray-600">Spending 6 hours on a font choice.</p>
                                </div>
                            </div>
                            <div className="flex gap-6 items-start">
                                <Sparkles className="flex-shrink-0 mt-1" size={32} />
                                <div>
                                    <h4 className="font-bold text-xl uppercase mb-1">Dopamine Mining</h4>
                                    <p className="text-gray-600">Designing things that make brain go brrr.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visual: The "Browser" Wireframe */}
                    <div className="relative h-[400px] border-3 border-black bg-gray-50 flex flex-col shadow-hard">
                        <div className="h-10 border-b-3 border-black flex items-center px-4 gap-2 bg-white">
                            <div className="w-4 h-4 rounded-full border-2 border-black"></div>
                            <div className="w-4 h-4 rounded-full border-2 border-black"></div>
                            <div className="flex-1 bg-gray-100 h-6 border-2 border-black ml-4"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="text-center">
                                <div className="text-6xl mb-4 animate-wiggle">🤯</div>
                                <div className="font-mono text-sm bg-black text-white px-2 py-1">Processing...</div>
                            </div>
                            {/* Floating Windows */}
                            <div className="absolute top-20 right-10 w-32 h-20 bg-white border-2 border-black shadow-hard flex items-center justify-center font-bold text-xs uppercase rotate-12">
                                New Idea
                            </div>
                            <div className="absolute bottom-10 left-10 w-40 h-24 bg-white border-2 border-black shadow-hard flex items-center justify-center font-bold text-xs uppercase -rotate-6">
                                Forgot Lunch
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* 3. Building in Public - TikTok Grid */}
        <section className="mb-24">
            <div className="text-center mb-16">
                <h2 className="font-heading text-5xl font-black uppercase mb-4">Behind The Scenes</h2>
                <div className="h-1 w-24 bg-black mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {TIKTOK_VIDEOS.map((video) => (
                    <div key={video.id} className="border-3 border-black bg-black group cursor-pointer shadow-hard hover:shadow-hard-hover transition-all">
                        <div className="aspect-[9/16] relative overflow-hidden">
                             <video 
                                src={video.videoUrl}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all duration-500"
                                muted
                                loop
                                playsInline
                                onMouseEnter={(e) => e.currentTarget.play()}
                                onMouseLeave={(e) => {
                                    e.currentTarget.pause();
                                    e.currentTarget.currentTime = 0;
                                }}
                            />
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent text-white">
                                <p className="font-bold text-sm">{video.title}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-center mt-12">
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" className="uppercase tracking-widest">
                        Follow on TikTok <ArrowRight className="ml-2" size={20} />
                    </Button>
                </a>
            </div>
        </section>

      </main>
      <Footer />
    </div>
  );
};