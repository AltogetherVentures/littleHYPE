import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { 
  EyeOff, ShieldCheck, Lock, Cookie, 
  Database, Bell, Share2, HelpCircle, 
  Cpu, Fingerprint, Trash2
} from 'lucide-react';

export const Privacy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white min-h-screen font-sans text-black">
      <Navbar />
      
      <main className="pt-32 px-4 max-w-5xl mx-auto pb-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 bg-hype-lime/20 border-2 border-black px-4 py-1 rounded-full">
            <EyeOff size={18} className="text-black" />
            <span className="font-bold uppercase text-xs tracking-widest text-black">Privacy Protocol #101</span>
          </div>
          <h1 className="font-heading text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4">
            Our Data <br/> <span className="text-hype-purple">Diet.</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm max-w-xl mx-auto">
            We value your privacy almost as much as we value a good iced coffee. Here is how we handle your digital footprints.
          </p>
          <div className="mt-6 flex justify-center gap-4 text-[10px] font-mono uppercase text-gray-400">
            <span>v1.0.1</span>
            <span>•</span>
            <span>Revised: Oct 2025</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* 01. WHAT WE COLLECT */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Database size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">01.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-hype-lime">The Menu</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-hype-lime underline-offset-4">What We Collect</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      We only collect what we need to make the magic happen. This includes your email address (for the Giggle-Letter), your name (so we can be polite), and the contents of your "Moments" or "Space_log" dispatches so we can process them with our AI engines.
                    </p>
                    <p className="text-sm text-gray-500 italic">
                      Note: We don't care about your secrets, only your story.
                    </p>
                </div>
            </div>
          </section>

          {/* 02. AI BRAIN & PRIVACY */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Cpu size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">02.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-hype-purple">AI Brain</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-hype-purple underline-offset-4">The HypeBot Protocol</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      When you chat with HypeBot or use our generators, we use Google Gemini API. While your inputs help generate responses, we do not use your personal "Moments" to train our public models. Your data stays in your timeline.
                    </p>
                </div>
            </div>
          </section>

          {/* 03. THE COOKIE JAR */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Cookie size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">03.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-hype-orange">Cookies</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-hype-orange underline-offset-4">The Cookie Jar</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      We use small bits of data called cookies to remember who you are and keep the vibe consistent. You can disable them in your browser, but the site might act a bit grumpy if you do.
                    </p>
                </div>
            </div>
          </section>

          {/* 04. DATA DELETION */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Trash2 size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">04.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-hype-pink">Control</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-hype-pink underline-offset-4">Your Right to Vanish</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      If you want us to forget you ever existed, just send a carrier pigeon (or an email) to privacy@littlehype.com. We'll wipe your data faster than you can say "Aggressively Positive."
                    </p>
                </div>
            </div>
          </section>
        </div>

        <div className="mt-24 p-12 border-3 border-black text-center bg-hype-gray rounded-xl">
            <ShieldCheck size={48} className="mx-auto mb-6 text-hype-lime" />
            <h2 className="font-heading text-3xl font-black uppercase mb-4">You're Safe Here.</h2>
            <p className="text-xl font-medium max-w-2xl mx-auto text-gray-600">
                We don't sell your data to third-party brokers. We sell products that spark joy. Your data is just the fuel for that joy, not the product itself.
            </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};