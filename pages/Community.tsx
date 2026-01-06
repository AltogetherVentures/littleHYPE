
import React from 'react';
import { Hammer, ArrowRight, Star, Shield, Zap, ExternalLink, Heart, Mail } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { NewsletterForm } from '../components/NewsletterForm';

export const Community: React.FC = () => {
  return (
    <div className="bg-hype-bg min-h-screen font-sans overflow-x-hidden">
      <Navbar />

      <main className="pt-32 px-4 max-w-7xl mx-auto">
        
        {/* 1. Hero / Value Prop */}
        <section className="text-center mb-24 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-hype-primary/20 rounded-full blur-[120px] -z-10 animate-blob"></div>
            
            <div className="inline-flex items-center gap-2 mb-6 bg-white border border-hype-charcoal/10 px-4 py-2 rounded-full shadow-sm animate-float">
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hype-coral opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-hype-coral"></span>
                </span>
                <span className="text-sm font-bold text-hype-charcoal uppercase tracking-wider">The LittleHYPE Club</span>
            </div>

            <h1 className="font-heading text-6xl md:text-8xl font-black text-hype-charcoal mb-8 leading-tight tracking-tight">
                The Internet is Scary. <br/>
                <span className="text-hype-teal relative inline-block">
                    Hide Here.
                    <svg className="absolute w-full h-4 -bottom-1 left-0 text-hype-primary -z-10 opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                    </svg>
                </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-3xl mx-auto mb-12 leading-relaxed">
                Join the <strong>Giggle-Letter</strong>. It’s the weekly antidote to doomscrolling. 
                Get good news, weird finds, and help us build the next big thing.
            </p>

            <div className="max-w-xl mx-auto">
                <NewsletterForm />
                
                 <p className="mt-6 text-sm text-gray-400 font-bold flex items-center justify-center gap-2">
                    <Shield size={14} className="text-hype-teal" /> No spam. Only ham.
                 </p>
            </div>
        </section>

        {/* 2. Three Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-soft hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:-translate-y-2">
                <h3 className="font-heading text-2xl font-black text-hype-charcoal mb-4">Anti-Doomscroll</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                    Tired of bad news? We curate the weirdest, most wholesome stories from around the globe. It’s like a warm bath for your brain.
                </p>
            </div>
            <div className="bg-hype-charcoal p-10 rounded-[2.5rem] shadow-soft hover:shadow-xl transition-all duration-300 group hover:-translate-y-2 relative overflow-hidden bg-black">
                <h3 className="font-heading text-2xl font-black text-white mb-4">You Build It</h3>
                <p className="text-gray-400 font-medium leading-relaxed">
                    We don't guess what you want. We ask. Vote on new product drops, choose colors, and help design the next viral hit.
                </p>
            </div>
            <div className="bg-white p-10 rounded-[2.5rem] shadow-soft hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:-translate-y-2">
                <h3 className="font-heading text-2xl font-black text-hype-charcoal mb-4">Get Paid</h3>
                <p className="text-gray-500 font-medium leading-relaxed">
                    If you help us co-create a product that launches, you get a cut of the profits. Seriously. We call it the Hype Dividend.
                </p>
            </div>
        </section>

        {/* 3. Community Stats */}
        <section className="bg-hype-primary/10 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden mb-24">
             <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px]"></div>
             <div className="relative z-10">
                 <div className="flex justify-center mb-8">
                     <div className="flex -space-x-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
                                <img src={`https://picsum.photos/100/100?random=${i + 20}`} alt="Member" />
                            </div>
                        ))}
                        <div className="w-12 h-12 rounded-full border-4 border-white bg-hype-teal text-white flex items-center justify-center font-bold text-xs">
                            +15k
                        </div>
                     </div>
                 </div>
                 <h2 className="font-heading text-3xl md:text-5xl font-black text-hype-charcoal mb-6">
                    "The only email I actually open."
                 </h2>
                 <p className="text-xl font-bold text-hype-teal mb-8">— Sarah, Professional Procrastinator</p>
                 <div className="flex flex-wrap justify-center gap-4">
                    <div className="bg-white px-6 py-3 rounded-full shadow-sm text-sm font-bold text-gray-500 flex items-center">
                        <Star size={16} className="text-hype-primary fill-current mr-2" />
                        Weekly Good News
                    </div>
                    <div className="bg-white px-6 py-3 rounded-full shadow-sm text-sm font-bold text-gray-500 flex items-center">
                        <Heart size={16} className="text-hype-coral fill-current mr-2" />
                        Exclusive Discounts
                    </div>
                    <div className="bg-white px-6 py-3 rounded-full shadow-sm text-sm font-bold text-gray-500 flex items-center">
                        <Hammer size={16} className="text-hype-purple fill-current mr-2" />
                        Product Voting
                    </div>
                 </div>
             </div>
        </section>

        {/* 4. Previous Issues Preview */}
        <section className="mb-24">
            <h2 className="font-heading text-3xl font-black text-hype-charcoal mb-12 text-center">What You Missed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border border-gray-200 rounded-[2rem] p-8 hover:shadow-lg transition-all cursor-pointer group">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Issue #42</span>
                    <h3 className="font-heading text-2xl font-bold text-hype-charcoal mb-4 group-hover:text-hype-primary transition-colors">
                        Why We Should All Be More Like Capybaras 🦦
                    </h3>
                    <p className="text-gray-500 mb-6 font-medium">
                        Plus: A playlist for cleaning your room, and we vote on the new hoodie color.
                    </p>
                    <div className="flex items-center text-hype-teal font-bold text-sm">
                        Read Issue <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-[2rem] p-8 hover:shadow-lg transition-all cursor-pointer group">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Issue #41</span>
                    <h3 className="font-heading text-2xl font-bold text-hype-charcoal mb-4 group-hover:text-hype-coral transition-colors">
                        The Science of "Treating Yourself" 🍩
                    </h3>
                    <p className="text-gray-500 mb-6 font-medium">
                        Plus: 3 weird websites to waste time on, and the results of the sticker contest.
                    </p>
                    <div className="flex items-center text-hype-teal font-bold text-sm">
                        Read Issue <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </section>

      </main>

      {/* Newsletter Section */}
      <section className="py-32 bg-hype-black text-white text-center px-4">
         <div className="max-w-3xl mx-auto">
            <Mail size={64} className="mx-auto mb-8 text-white hover:text-hype-pink transition-colors animate-float" strokeWidth={1.5} />
            <h2 className="font-heading text-5xl md:text-7xl font-black mb-8 uppercase tracking-tighter hover:text-hype-pink transition-colors">
                The Giggle-Letter
            </h2>
            <p className="text-xl text-gray-400 mb-12 font-medium">
                No spam. Just stick figures and serotonin.
            </p>
            
            <NewsletterForm />
            
            <p className="mt-8 text-sm text-gray-500 font-bold uppercase tracking-widest">
              Join 15,000+ legends getting weekly hype.
            </p>
         </div>
      </section>

      <Footer />
    </div>
  );
};
