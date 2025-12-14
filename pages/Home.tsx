import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Smile, Video, Mail, Heart } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { HypeGenerator } from '../components/HypeGenerator';
import { NewsGenerator } from '../components/NewsGenerator';
import { PRODUCTS, FAQS } from '../constants';

export const Home: React.FC = () => {
  const [isFighting, setIsFighting] = useState(true);

  const cardHoverStyles = [
    'hover:border-hype-pink hover:shadow-[6px_6px_0px_0px_#FF0090]',
    'hover:border-hype-cyan hover:shadow-[6px_6px_0px_0px_#00E5FF]',
    'hover:border-hype-lime hover:shadow-[6px_6px_0px_0px_#AAFF00]',
    'hover:border-hype-orange hover:shadow-[6px_6px_0px_0px_#FF5500]'
  ];

  const handleBreakUpFight = () => {
    if (isFighting) {
        setIsFighting(false);
        // Resume fighting after 3 seconds
        setTimeout(() => {
            setIsFighting(true);
        }, 3000);
    }
  };

  return (
    <div className="bg-white min-h-screen overflow-x-hidden font-sans text-hype-black">
      <Navbar />

      {/* 1. Hero Section - Full Screen Video Focus */}
      <header className="relative h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden border-b-3 border-hype-black bg-hype-black">
        {/* Video Background */}
        <div className="absolute inset-0 z-0 bg-hype-black">
            <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover opacity-60 grayscale contrast-125"
                src="https://assets.mixkit.co/videos/preview/mixkit-ink-swirling-in-water-196-large.mp4"
            />
            {/* Grain Overlay */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        </div>

        {/* Dancing Stickman Fight Scene - Interactive */}
        <div 
            className="absolute inset-0 z-20 overflow-hidden cursor-pointer group"
            onClick={handleBreakUpFight}
        >
             {/* Interaction Hint */}
             <div className="absolute bottom-48 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border-3 border-black px-4 py-2 text-xs font-black uppercase tracking-widest shadow-hard transform rotate-2 pointer-events-none z-30">
                Click to break it up!
             </div>

            {/* Fighter 1 (Left) */}
            <div className={`absolute bottom-0 w-24 h-24 origin-bottom transition-all duration-300 ${isFighting ? 'animate-fight-1' : 'left-[calc(50%-5rem)] transform scale-x-100'}`}>
                <svg viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    {/* Head */}
                    <circle cx="50" cy="20" r="14" />
                    {!isFighting && (
                        /* X Eyes for Stunned State */
                        <g stroke="white" strokeWidth="3">
                             <path d="M44 16 L48 20 M48 16 L44 20" />
                             <path d="M52 16 L56 20 M56 16 L52 20" />
                        </g>
                    )}
                    
                    {/* Body */}
                    <path d="M50 34 L50 65" />
                    
                    {/* Arms */}
                    {isFighting ? (
                        <>
                            <path d="M50 45 L20 35" className="animate-flail origin-center" />
                            <path d="M50 45 L80 35" className="animate-flail origin-center" style={{animationDelay: '0.1s'}} />
                        </>
                    ) : (
                         /* Droopy Arms */
                        <>
                            <path d="M50 45 L30 60" />
                            <path d="M50 45 L70 60" />
                        </>
                    )}
                    
                    {/* Legs */}
                    {isFighting ? (
                        <>
                            <path d="M50 65 L25 90" className="animate-flail origin-top" />
                            <path d="M50 65 L75 90" />
                        </>
                    ) : (
                        /* Standing Still */
                        <>
                            <path d="M50 65 L35 90" />
                            <path d="M50 65 L65 90" />
                        </>
                    )}
                </svg>
                {/* Dizzy Stars */}
                {!isFighting && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-4 animate-spin-slow">
                        <span className="absolute left-0 top-0 text-yellow-400 text-lg">★</span>
                        <span className="absolute right-0 bottom-0 text-yellow-400 text-lg">★</span>
                    </div>
                )}
            </div>

            {/* Fighter 2 (Right) */}
            <div className={`absolute bottom-0 w-24 h-24 origin-bottom transition-all duration-300 ${isFighting ? 'animate-fight-2' : 'right-[calc(50%-5rem)] transform -scale-x-100'}`}>
                <svg viewBox="0 0 100 100" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                     {/* Head */}
                    <circle cx="50" cy="20" r="14" />
                    {!isFighting && (
                        /* X Eyes for Stunned State */
                        <g stroke="white" strokeWidth="3">
                             <path d="M44 16 L48 20 M48 16 L44 20" />
                             <path d="M52 16 L56 20 M56 16 L52 20" />
                        </g>
                    )}

                    {/* Bandana for Fighter 2 */}
                    <path d="M35 15 L65 15" strokeWidth="6" stroke="red" />
                    <path d="M65 15 L85 25" strokeWidth="3" stroke="red" />
                    
                    {/* Body */}
                    <path d="M50 34 L50 65" />
                    
                    {/* Arms */}
                    {isFighting ? (
                        <>
                            <path d="M50 45 L20 35" className="animate-flail origin-center" style={{animationDelay: '0.05s'}} />
                            <path d="M50 45 L80 35" className="animate-flail origin-center" style={{animationDelay: '0.15s'}} />
                        </>
                    ) : (
                         /* Hands on hips (kinda) */
                        <>
                            <path d="M50 45 L35 55 L40 60" />
                            <path d="M50 45 L65 55 L60 60" />
                        </>
                    )}

                    {/* Legs */}
                    {isFighting ? (
                         <>
                            <path d="M50 65 L25 90" />
                            <path d="M50 65 L75 90" className="animate-flail origin-top" />
                        </>
                    ) : (
                        /* Kneeling/Sitting in defeat */
                         <>
                            <path d="M50 65 L30 85 L50 85" />
                            <path d="M50 65 L60 90" />
                        </>
                    )}
                </svg>
                 {/* Dizzy Stars */}
                 {!isFighting && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-8 animate-spin-slow" style={{animationDirection: 'reverse'}}>
                        <span className="absolute top-0 left-0 text-hype-cyan text-xl">★</span>
                        <span className="absolute bottom-0 right-0 text-hype-pink text-xl">★</span>
                    </div>
                )}
            </div>
            
            {/* Comic FX - Only show when fighting */}
            {isFighting && (
                <>
                    <div className="absolute left-1/2 bottom-32 -translate-x-1/2 text-5xl font-black text-hype-cyan italic animate-pow-effect drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                        POW!
                    </div>
                    <div className="absolute left-1/2 bottom-48 -translate-x-1/2 text-5xl font-black text-hype-pink italic animate-pow-effect drop-shadow-[4px_4px_0_rgba(0,0,0,1)]" style={{animationDelay: '3.8s'}}>
                        SMACK!
                    </div>
                </>
            )}
        </div>

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pointer-events-none">
             {/* Add pointer-events-auto to interactive elements inside the non-interactive container */}
             <div className="bg-white/10 backdrop-blur-md border-2 border-white/30 inline-block px-6 py-2 rounded-full mb-8 hover:bg-hype-pink hover:border-hype-pink transition-colors duration-300 pointer-events-auto">
                 <span className="text-white font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    Est. 2024
                 </span>
             </div>

            <h1 className="font-heading text-6xl md:text-9xl font-black text-white mb-8 leading-[0.85] tracking-tighter uppercase mix-blend-overlay hover:mix-blend-normal transition-all duration-500 cursor-default hover:text-hype-cyan pointer-events-auto">
                Make Life <br/>
                <span className="text-white relative inline-block group">
                    Weirdly
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-white group-hover:text-hype-lime transition-colors" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="6" fill="none" />
                    </svg>
                </span>
                <br/> Good.
            </h1>
            
            <p className="text-xl md:text-2xl text-white font-medium max-w-2xl mx-auto mb-10 leading-relaxed pointer-events-auto">
                Aggressively positive goods for people who refuse to be boring.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pointer-events-auto">
                <Link to="/products">
                    <Button variant="secondary" size="lg" className="border-3 border-white hover:border-hype-pink hover:shadow-[6px_6px_0px_0px_#FF0090] uppercase tracking-widest text-lg">
                        Shop Now
                    </Button>
                </Link>
                <Button variant="primary" size="lg" className="border-3 border-white hover:border-hype-cyan hover:shadow-[6px_6px_0px_0px_#00E5FF] uppercase tracking-widest text-lg">
                    <Play size={20} className="mr-2 fill-current" /> Watch Reel
                </Button>
            </div>
        </div>
      </header>

      {/* 2. Generators - Comic Strip Style */}
      <section className="py-24 px-4 bg-white border-b-3 border-hype-black">
         <div className="max-w-6xl mx-auto">
             <div className="text-center mb-16">
                <h2 className="text-5xl font-heading font-black text-hype-black mb-4 uppercase tracking-tighter">Instant Dopamine</h2>
                <div className="h-1 w-24 bg-hype-black mx-auto mb-4"></div>
                <p className="text-xl text-gray-600 font-bold max-w-xl mx-auto">Tools to fix your vibe. Free. Forever.</p>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-stretch">
                <div className="border-3 border-hype-black rounded-xl shadow-hard hover:shadow-[6px_6px_0px_0px_#AAFF00] hover:border-hype-lime transition-all bg-white p-2 group">
                    <HypeGenerator />
                </div>
                <div className="border-3 border-hype-black rounded-xl shadow-hard hover:shadow-[6px_6px_0px_0px_#FF5500] hover:border-hype-orange transition-all bg-white p-2 group">
                    <NewsGenerator />
                </div>
             </div>
         </div>
      </section>

      {/* 3. Spotlight - Image Focus */}
      <section className="bg-hype-black text-white py-0 border-b-3 border-hype-black">
          <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 relative min-h-[500px] group cursor-pointer overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2670&auto=format&fit=crop" 
                    alt="Audio Gift" 
                    className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-hype-purple/20 transition-colors"></div>
              </div>
              <div className="md:w-1/2 p-12 md:p-24 flex flex-col justify-center">
                  <span className="font-mono text-sm border border-white rounded-full px-3 py-1 inline-block w-fit mb-6 hover:bg-hype-pink hover:border-hype-pink transition-colors cursor-default">FEATURED DROP</span>
                  <h2 className="font-heading text-6xl font-black mb-6 leading-none">SONIC<br/>HUGS.</h2>
                  <p className="text-xl text-gray-400 mb-8 font-medium leading-relaxed">
                      Immersive soundscapes mixed with personal voice notes. It's like a mixtape, but for emotions. Send one to a friend who needs it.
                  </p>
                  <Button variant="secondary" className="w-fit hover:text-white hover:bg-hype-purple hover:border-hype-purple">Create Audio Gift</Button>
              </div>
          </div>
      </section>

      {/* 4. The Goods - Bold Product Grid */}
      <section id="shop" className="py-24 max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-end mb-12 border-b-3 border-hype-black pb-4">
                <h2 className="font-heading text-5xl font-black text-hype-black uppercase tracking-tighter hover:text-hype-cyan transition-colors cursor-default">The Goods</h2>
                <Link to="/products" className="hidden md:flex items-center font-bold text-hype-black hover:text-hype-pink hover:underline decoration-2 underline-offset-4 decoration-hype-pink transition-colors">
                    View All <ArrowRight className="ml-2" size={24} strokeWidth={3} />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {PRODUCTS.map((product, idx) => (
                    <Link to={`/product/${product.id}`} key={product.id} className="group block">
                        <div className={`border-3 border-hype-black rounded-xl overflow-hidden bg-white shadow-hard transition-all duration-200 ${cardHoverStyles[idx % cardHoverStyles.length]}`}>
                            <div className="aspect-[16/9] overflow-hidden relative border-b-3 border-hype-black group-hover:border-inherit">
                                <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                />
                                <div className="absolute top-4 right-4 bg-white border-2 border-hype-black px-3 py-1 font-bold text-sm shadow-hard-sm group-hover:bg-black group-hover:text-white transition-colors">
                                    {product.price}
                                </div>
                            </div>
                            
                            <div className="p-8">
                                <h3 className="text-3xl font-heading font-black text-hype-black mb-2 uppercase group-hover:text-inherit">
                                    {product.name}
                                </h3>
                                <p className="text-gray-600 font-medium text-lg mb-6">{product.tagline}</p>
                                <span className="inline-flex items-center font-bold border-b-2 border-hype-black pb-1 group-hover:border-inherit group-hover:text-inherit transition-colors">
                                    Shop Now <ArrowRight size={18} className="ml-2" />
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
            
            <div className="mt-12 text-center md:hidden">
                 <Link to="/products">
                    <Button variant="outline" className="w-full">View All Products</Button>
                 </Link>
            </div>
      </section>

      {/* 5. Founder Story - Stickman / Wireframe Vibe */}
      <section id="story" className="py-24 bg-hype-gray border-t-3 border-hype-black">
        <div className="max-w-5xl mx-auto px-4">
            <div className="bg-white border-3 border-hype-black p-8 md:p-16 shadow-hard relative overflow-hidden rounded-xl hover:shadow-[8px_8px_0px_0px_#9D00FF] hover:border-hype-purple transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
                    <div className="md:w-1/3">
                         <div className="aspect-square border-3 border-hype-black rounded-full overflow-hidden shadow-hard group-hover:border-hype-purple transition-colors">
                             <img src="https://picsum.photos/id/338/600/600" alt="Founder" className="w-full h-full object-cover grayscale contrast-125" />
                         </div>
                    </div>
                    <div className="md:w-2/3">
                        <h2 className="font-heading text-4xl md:text-5xl font-black text-hype-black mb-6 uppercase">Hi, I'm Alex.</h2>
                        <div className="space-y-6 text-xl font-medium text-hype-black leading-relaxed">
                            <p>
                                I started littleHYPE because everything else felt too polished. Too perfect.
                            </p>
                            <p>
                                This is a corner of the internet for the rest of us. It's messy, it's black and white, and it's full of good vibes.
                            </p>
                        </div>
                        <div className="mt-8">
                            <Link to="/story">
                                <Button variant="primary">Read The Full Story</Button>
                            </Link>
                        </div>
                    </div>
                </div>
                
                {/* SVG Doodle Background */}
                <svg className="absolute top-0 right-0 w-64 h-64 text-gray-100 -z-0 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M10 10 Q 50 90 90 10" />
                    <circle cx="50" cy="50" r="40" />
                    <rect x="20" y="20" width="60" height="60" />
                </svg>
            </div>
        </div>
      </section>

      {/* 6. FAQs */}
      <section className="py-24 bg-white border-t-3 border-hype-black">
        <div className="max-w-3xl mx-auto px-4">
             <div className="text-center mb-16">
                <h2 className="font-heading text-5xl font-black text-hype-black mb-4 uppercase hover:text-hype-orange transition-colors cursor-default">FAQs</h2>
             </div>
             <div className="space-y-4">
                {FAQS.map((faq, idx) => {
                    const colors = ['hover:border-hype-pink hover:text-hype-pink', 'hover:border-hype-cyan hover:text-hype-cyan', 'hover:border-hype-lime hover:text-hype-lime'];
                    return (
                    <details key={faq.id} className="group cursor-pointer">
                        <summary className={`flex justify-between items-center p-6 bg-white border-3 border-hype-black shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all list-none rounded-lg ${colors[idx % colors.length]}`}>
                            <span className="font-bold text-xl text-hype-black group-hover:text-inherit transition-colors">{faq.question}</span>
                            <span className="transform group-open:rotate-180 transition-transform">
                                <ArrowRight size={24} />
                            </span>
                        </summary>
                        <div className="p-6 text-lg font-medium border-l-3 border-r-3 border-b-3 border-hype-black mt-[-3px] mx-[3px] rounded-b-lg bg-gray-50 group-hover:border-inherit transition-colors">
                            {faq.answer}
                        </div>
                    </details>
                    );
                })}
             </div>
        </div>
      </section>

      {/* 7. Newsletter - Minimalist */}
      <section className="py-32 bg-hype-black text-white text-center px-4">
         <div className="max-w-2xl mx-auto">
            <Mail size={64} className="mx-auto mb-8 text-white hover:text-hype-pink transition-colors animate-float" strokeWidth={1.5} />
            <h2 className="font-heading text-5xl md:text-7xl font-black mb-8 uppercase tracking-tighter hover:text-hype-pink transition-colors cursor-default">
                The Giggle-Letter
            </h2>
            <p className="text-xl text-gray-400 mb-12 font-medium">
                No spam. Just stick figures and serotonin.
            </p>
            
            <a 
                href="https://docs.google.com/forms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
            >
                <Button variant="secondary" size="lg" className="px-12 py-6 text-xl uppercase tracking-widest hover:bg-hype-pink hover:text-white hover:border-hype-pink">
                    Join via Google Form
                </Button>
            </a>
         </div>
      </section>

      <Footer />
    </div>
  );
};