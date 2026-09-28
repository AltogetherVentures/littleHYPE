
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { 
  Star, Sparkles, Scissors, Mic, PenTool, 
  Palette, Camera, Hash, ChevronRight, 
  Quote, Info, Heart, ArrowRight, Play,
  ArrowLeft
} from 'lucide-react';

export const Moments: React.FC = () => {
    const [activeInk, setActiveInk] = useState(0);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const inks = [
        { name: "Neon Riso", color: "bg-[#FF4C4C]", text: "text-[#FF4C4C]", shadow: "shadow-[#FF4C4C]" },
        { name: "Cyan Cyanotype", color: "bg-[#4C4CFF]", text: "text-[#4C4CFF]", shadow: "shadow-[#4C4CFF]" },
        { name: "Gold Leaf 3D", color: "bg-[#FFD24C]", text: "text-[#FFD24C]", shadow: "shadow-[#FFD24C]" }
    ];

    return (
        <div className="bg-[#F8F9FA] min-h-screen font-sans selection:bg-hype-purple selection:text-white text-black relative overflow-x-hidden">
            {/* Global Dotted Background */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, black 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            
            <Navbar />
            
            <main className="pt-24 pb-24 relative z-10">
                
                {/* 2. HERO: THE COVER STORY */}
                <section className="px-4 mb-24 mt-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white border-4 border-black rounded-[4rem] p-12 md:p-20 shadow-[24px_24px_0px_0px_#000000] relative">
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                                <div className="text-center lg:text-left">
                                    <h1 className="font-serif text-6xl md:text-8xl font-black mb-8 leading-[0.85] tracking-tighter uppercase">
                                        Turn Your <br/>
                                        <span className="text-hype-purple underline decoration-hype-yellow decoration-8 underline-offset-8">Friends</span> <br/>
                                        Into Art.
                                    </h1>
                                    <p className="text-xl md:text-2xl text-gray-500 font-bold mb-12 max-w-lg">
                                        Stop sending boring birthday texts. Build a hand-pressed cinematic legacy instead.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        <button className="bg-hype-black text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-lg shadow-[0_10px_0_0_#4C4CFF] hover:translate-y-1 hover:shadow-none transition-all active:scale-95">
                                            Start The Press
                                        </button>
                                    </div>
                                </div>

                                {/* Preview Card */}
                                <div className="relative">
                                    <div className="w-full aspect-[4/5] bg-white border-4 border-black rounded-[3rem] p-4 shadow-hard transform rotate-2">
                                        <div className="w-full h-full bg-[#f3f3f3] rounded-[2.5rem] overflow-hidden relative flex flex-col">
                                            <div className="flex-1 overflow-hidden relative">
                                                <img src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?q=80&w=1856&auto=format&fit=crop" className="w-full h-full object-cover grayscale opacity-80" alt="Friend" />
                                                <div className="absolute inset-0 bg-hype-purple/20 mix-blend-multiply"></div>
                                            </div>
                                            <div className="p-8 bg-white border-t-3 border-black text-center">
                                                <p className="font-serif text-2xl font-black italic">"The day they finally conquered the 3-foot burrito."</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. THE FABRICATION PROCESS (LIVE STUDIO STYLE) */}
                <section className="px-4 mb-24">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white border-4 border-black rounded-[4rem] p-12 md:p-20 shadow-[24px_24px_0px_0px_#000000] relative overflow-hidden">
                            <div className="bg-hype-black text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-12 inline-flex items-center gap-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> Status: Production
                            </div>

                            <h2 className="font-serif text-5xl md:text-7xl font-black mb-16 uppercase tracking-tight">The Technique.</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {[
                                    { step: "01", icon: <Scissors size={32} />, title: "The Cut", desc: "Select the Era. We trim the boring bits and focus on the myth." },
                                    { step: "02", icon: <Mic size={32} />, title: "Narration Engine", desc: "Pick a narrator that sounds like a basement on a rainy day." },
                                    { step: "03", icon: <PenTool size={32} />, title: "The Script", desc: "Feed us your inside jokes. We securely ink them into poetic dialogue." },
                                    { step: "04", icon: <Palette size={32} />, title: "The Ink", desc: "Choose your engine. Neon, Monochrome, or Tri-Tone Explosion." },
                                    { step: "05", icon: <Camera size={32} />, title: "The Asset", desc: "A single selfie is all we need to manufacture a main character." },
                                    { step: "06", icon: <Hash size={32} />, title: "The Stamp", desc: "Finalize the production with a custom digital signature." },
                                ].map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 border-3 border-black p-8 rounded-[2.5rem] relative group hover:bg-white hover:shadow-hard-sm transition-all">
                                        <div className="absolute top-6 right-8 font-black text-2xl opacity-10 group-hover:opacity-100 transition-opacity">
                                            {item.step}
                                        </div>
                                        <div className="text-hype-purple mb-6 group-hover:scale-110 transition-transform origin-left">
                                            {item.icon}
                                        </div>
                                        <h3 className="font-serif text-2xl font-black mb-3 uppercase">{item.title}</h3>
                                        <p className="text-gray-500 font-bold text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. THE INK SELECTOR (OCCASION STYLE) */}
                <section className="px-4 mb-24">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white border-4 border-black rounded-[4rem] p-12 md:p-20 shadow-[24px_24px_0px_0px_#000000] relative">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-hype-lime border-3 border-black rounded-2xl flex items-center justify-center shadow-hard-sm mb-8">
                                    <Palette size={32} />
                                </div>
                                <h2 className="font-serif text-5xl font-black mb-4 uppercase">Pick Your Ink.</h2>
                                <p className="text-gray-400 font-bold mb-12">Visual saturation is mandatory.</p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
                                    {inks.map((ink, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveInk(idx)}
                                            className={`border-3 border-black p-8 rounded-3xl text-lg font-black uppercase tracking-tight transition-all shadow-hard-sm active:scale-95 ${activeInk === idx ? 'bg-hype-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                                        >
                                            {ink.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="w-full aspect-video bg-gray-100 border-4 border-black rounded-[3rem] overflow-hidden relative shadow-hard">
                                     <img 
                                        src={[
                                            "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=1887&auto=format&fit=crop",
                                            "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=2545&auto=format&fit=crop",
                                            "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
                                        ][activeInk]} 
                                        className="w-full h-full object-cover grayscale contrast-125"
                                        alt="Ink sample"
                                     />
                                     <div className={`absolute inset-0 ${inks[activeInk].color} mix-blend-multiply opacity-60`}></div>
                                     <div className="absolute top-8 left-8 bg-white border-3 border-black px-4 py-2 font-black uppercase text-[10px] tracking-widest shadow-hard-sm">
                                         Active Engine: {inks[activeInk].name}
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. THE ZINE FACTOR */}
                <section className="px-4 mb-24">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-16 relative">
                            <Quote size={80} className="absolute -top-12 left-1/2 -translate-x-1/2 text-hype-purple opacity-10" />
                            <h2 className="font-serif text-5xl md:text-7xl font-black mb-6 uppercase tracking-tighter">The Zine Factor.</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[
                                { metric: "Sentiment", value: "Overwhelming", note: "Actually brings a tear." },
                                { metric: "Replayability", value: "High (Infinite)", note: "They'll watch it 40 times." },
                                { metric: "Cool Factor", value: "Off The Charts", note: "Way better than a card." },
                                { metric: "Effort Appearance", value: "High Production", note: "We do the work, you win." }
                            ].map((row, idx) => (
                                <div key={idx} className="bg-white border-4 border-black p-12 rounded-[3rem] shadow-hard-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                                    <h4 className="text-[10px] font-black text-hype-purple uppercase tracking-[0.3em] mb-4">Metric_{idx}</h4>
                                    <div className="space-y-2">
                                        <p className="font-serif text-3xl font-black leading-none uppercase">{row.value}</p>
                                        <p className="font-bold text-gray-400">{row.note}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 6. THE STAR (CTA STYLE) */}
                <section className="px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white border-4 border-black rounded-[4rem] p-12 md:p-20 shadow-[24px_24px_0px_0px_#000000] relative text-center">
                            <div className="flex justify-center mb-12">
                                <div className="bg-hype-black text-white px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                    <Sparkles size={12} className="text-hype-yellow" /> Final Step
                                </div>
                            </div>

                            <h2 className="font-serif text-6xl md:text-9xl font-black mb-12 leading-[0.85] tracking-tighter uppercase">
                                Legend <br/> <span className="text-hype-purple italic underline decoration-hype-yellow">Pending.</span>
                            </h2>
                            
                            <p className="text-xl md:text-2xl text-gray-500 font-bold mb-16 max-w-sm mx-auto">
                                The printing press is warm. Their story is waiting to be made.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                                <button className="bg-hype-black text-white px-16 py-8 rounded-full font-black uppercase tracking-widest text-2xl shadow-[0_12px_0_0_#4C4CFF] flex items-center gap-3 hover:translate-y-1 hover:shadow-none transition-all active:scale-95">
                                    Print Their Story 🚀
                                </button>
                                <Link to="/products" className="font-black text-gray-400 hover:text-black uppercase tracking-widest text-sm flex items-center gap-2 transition-colors">
                                    <ArrowLeft size={16} /> Other Products
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
};
