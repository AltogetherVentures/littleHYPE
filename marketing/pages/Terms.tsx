import React, { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { 
  Scale, ShieldCheck, ScrollText, AlertCircle, 
  Gavel, Receipt, Ban, MessageSquare, 
  Terminal, Globe, Coffee, Zap
} from 'lucide-react';

export const Terms: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-white min-h-screen font-sans text-black">
      <Navbar />
      
      <main className="pt-32 px-4 max-w-5xl mx-auto pb-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 bg-hype-gray border-2 border-black px-4 py-1 rounded-full">
            <Gavel size={18} className="text-hype-pink" />
            <span className="font-bold uppercase text-xs tracking-widest">Legal Transmission #001</span>
          </div>
          <h1 className="font-heading text-6xl md:text-8xl font-black uppercase tracking-tighter mb-4">
            Terms of <br/> <span className="text-hype-cyan">Engagement.</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm max-w-xl mx-auto">
            These terms are a legally binding contract. By clicking around, you're agreeing to the hype. If you don't agree, please exit the simulation immediately.
          </p>
          <div className="mt-6 flex justify-center gap-4 text-[10px] font-mono uppercase text-gray-400">
            <span>v1.0.4</span>
            <span>•</span>
            <span>Revised: Oct 2025</span>
            <span>•</span>
            <span>Est. Reading Time: 4 Coffees</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* 01. THE BASICS */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <ScrollText size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">01.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-hype-pink">The Basics</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-hype-pink underline-offset-4">Agreement to Terms</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      Welcome to littleHYPE. These Terms of Use constitute a legally binding agreement made between you, whether personally or on behalf of an entity, and littleHYPE, concerning your access to and use of our website and products. 
                    </p>
                    <p className="text-sm text-gray-500 italic">
                      TL;DR: Don't be a jerk, and don't blame us if you start liking your life too much.
                    </p>
                </div>
            </div>
          </section>

          {/* 02. INTELLECTUAL PROPERTY */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Zap size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">02.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-hype-cyan">IP Rights</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-hype-cyan underline-offset-4">The "Don't Clone Our Vibe" Clause</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein are owned or controlled by us.
                    </p>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      You are granted a limited license to access and use the Site for personal, non-commercial purposes. You may not republish, distribute, prepare derivative works of, or otherwise use the Content other than as explicitly permitted.
                    </p>
                </div>
            </div>
          </section>

          {/* 03. DIGITAL ALCHEMY (PRODUCTS) */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Terminal size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">03.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-hype-lime">Products</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-hype-lime underline-offset-4">Digital Bytes & Physics</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      <strong>Digital Products (e.g., Moments, Space_log):</strong> These are non-tangible, irrevocable digital goods. We do not issue refunds for digital products once the order is confirmed and the product is sent. 
                    </p>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      <strong>Physical Products:</strong> We make every effort to display as accurately as possible the colors, features, specifications, and details of the products available on the Site. However, we do not guarantee that the products will be exactly as shown on your screen (blame your pixels, not ours).
                    </p>
                </div>
            </div>
          </section>

          {/* 04. USER CONDUCT */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Ban size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">04.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-hype-orange">Conduct</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-hype-orange underline-offset-4">The "No-Bot Protocol"</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-600 font-medium">
                        <li>No systematic retrieval of data to create a competing HYPE.</li>
                        <li>No trickery, defrauding, or misleading us and other users.</li>
                        <li>No attempting to impersonate another user (there is only one of them).</li>
                        <li>No using the site to promote MLM or "Get Rich Quick" schemes. We only offer "Get Happy Slow" schemes.</li>
                    </ul>
                </div>
            </div>
          </section>

          {/* 05. LIABILITY */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <AlertCircle size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">05.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-hype-purple">Liability</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-hype-purple underline-offset-4">Limitation of Liability</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700 italic font-mono uppercase text-xs">
                      IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SITE.
                    </p>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      Specifically, if you use the "Void Screaming" app and your voice gets hoarse, we are not providing honey and tea. Please scream responsibly.
                    </p>
                </div>
            </div>
          </section>

          {/* 06. GOVERNING LAW */}
          <section className="border-3 border-black p-8 shadow-hard bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Globe size={120} />
            </div>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/4">
                    <h2 className="font-heading text-3xl font-black uppercase leading-none mb-2">06.</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Jurisdiction</span>
                </div>
                <div className="md:w-3/4 space-y-4">
                    <h3 className="text-xl font-bold uppercase underline decoration-2 decoration-gray-400 underline-offset-4">Jurisdiction of Joy</h3>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      These Terms of Use and your use of the Site are governed by and construed in accordance with the laws of the State of Emotion (or, technically, the jurisdiction where our servers reside). 
                    </p>
                    <p className="text-lg font-medium leading-relaxed text-gray-700">
                      Any dispute arising out of or related to these Terms of Use shall be resolved through friendly conversation first, followed by mutual coffee, and only as a last resort, formal arbitration.
                    </p>
                </div>
            </div>
          </section>
        </div>

        {/* FINAL CLOSING SIGNATURE */}
        <div className="mt-24 p-12 border-3 border-hype-black bg-hype-gray text-center relative">
             <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white border-3 border-black px-6 py-2 font-heading font-black uppercase shadow-hard-sm">
                Acknowledgement
             </div>
             <p className="text-2xl font-hand mb-8 max-w-2xl mx-auto">
                "By using this site, you acknowledge that you have read, understood, and agreed to be bound by these terms, and that you probably need a break and a nice glass of water."
             </p>
             <div className="flex flex-col md:flex-row justify-center items-center gap-12">
                 <div className="text-left">
                    <p className="text-[10px] font-mono uppercase text-gray-400">Authorized Signature</p>
                    <p className="font-hand text-3xl text-hype-pink">The Hype Master</p>
                 </div>
                 <div className="w-px h-12 bg-gray-300 hidden md:block"></div>
                 <div className="text-left">
                    <p className="text-[10px] font-mono uppercase text-gray-400">User Status</p>
                    <p className="font-heading font-black text-xl uppercase text-hype-cyan">OFFICIALLY_HYPED</p>
                 </div>
             </div>
        </div>

        <div className="mt-20 text-center">
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                Questions? <Coffee size={14} /> Send us a virtual donut.
            </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};