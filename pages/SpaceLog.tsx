
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Radio, AlertTriangle, Database, Activity, Terminal, Star, ChevronDown, ChevronUp, Clock, CreditCard, Mic, Download, Play, Eye } from 'lucide-react';
import { Button } from '../components/Button';

export const SpaceLog: React.FC = () => {
  const [openSector, setOpenSector] = useState<string | null>(null);
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleSector = (sector: string) => {
      setOpenSector(openSector === sector ? null : sector);
  };

  const sectors = [
      {
          id: 'tribe',
          title: 'LOG: THE TRIBE (Relationships)',
          prompt: "Describe a friend as if they were a faulty piece of alien machinery.",
          focus: "Examining interpersonal boundaries and communication failure points."
      },
      {
          id: 'resources',
          title: 'LOG: RESOURCE ACQUISITION (Career)',
          prompt: "Report on your daily resource gathering tasks as if they were futile repetitive cycles in a simulation.",
          focus: "Analyzing career satisfaction and burnout indicators."
      },
      {
          id: 'diagnostics',
          title: 'LOG: INTERNAL DIAGNOSTICS (Self)',
          prompt: "Run a system check on your 'Sleep Module' and report critical errors to the mainframe.",
          focus: "Health habits, mental state, and physical maintenance."
      }
  ];

  return (
    <div className="bg-chrono-black min-h-screen font-mono text-chrono-green overflow-hidden relative selection:bg-chrono-green selection:text-black pb-24">
      {/* CRT Overlay Effect */}
      <div className="fixed inset-0 crt-overlay z-50 pointer-events-none opacity-40"></div>
      <div className="fixed inset-0 z-40 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      
      {/* Scanline Animation */}
      <div className="fixed inset-0 z-30 pointer-events-none h-2 bg-chrono-green opacity-10 animate-scanline"></div>

      {/* Navigation - Minimalist Terminal Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-chrono-green/30 bg-black/90 px-6 py-4 flex justify-between items-center backdrop-blur-sm">
        <div className="flex items-center gap-4">
            <Link to="/products" className="text-chrono-green hover:bg-chrono-green hover:text-black px-2 py-1 transition-colors uppercase text-xs tracking-widest flex items-center">
                <ArrowLeft size={14} className="mr-2" /> ABORT
            </Link>
            <span className="text-xs text-chrono-cyan animate-pulse">
                /// CONNECTION SECURE
            </span>
        </div>
        <div className="font-bold text-sm tracking-[0.2em] text-white">
            SPACE_LOG <span className="text-chrono-red text-[10px] align-top">v1.0.4</span>
        </div>
      </nav>

      <main className="relative pt-24 px-6 md:px-12 max-w-7xl mx-auto z-10">
        
        {/* 1. Hero Section: The Transmission */}
        <section className="min-h-[80vh] flex flex-col justify-center relative border-l border-chrono-green/20 pl-6 md:pl-12 ml-2 md:ml-0 mb-24">
            {/* Background Decor */}
            <div className="absolute right-0 top-20 opacity-20 hidden lg:block">
                 <div className="w-64 h-64 border border-chrono-cyan rounded-full animate-spin-slow border-dashed"></div>
                 <div className="w-48 h-48 border border-chrono-green rounded-full animate-spin-slow absolute top-8 left-8 border-dotted" style={{animationDirection: 'reverse'}}></div>
            </div>

            <div className="mb-4 inline-flex items-center gap-2 border border-chrono-red/50 text-chrono-red px-3 py-1 text-xs uppercase tracking-widest bg-chrono-red/10 animate-pulse-fast">
                <AlertTriangle size={12} /> Incoming Transmission
            </div>

            <h1 className="font-bold text-5xl md:text-8xl mb-8 leading-[0.9] text-white tracking-tighter uppercase mix-blend-screen">
                Space Explorer's <br/>
                <span className="text-chrono-green animate-glitch inline-block">Log:</span> <br/>
                Submit Your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-chrono-cyan to-white">Dispatch.</span>
            </h1>

            <p className="max-w-xl text-lg md:text-xl text-chrono-cyan/80 mb-12 leading-relaxed border-l-2 border-chrono-cyan pl-6">
                HQ requires immediate data on Earth's most complex anomaly: <span className="text-white font-bold bg-chrono-cyan/20 px-1">YOU.</span> 
                <br/><br/>
                Stop passively reflecting. Start reporting from your sector of the cosmos.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
                <button className="bg-chrono-red text-black font-bold text-xl px-8 py-4 uppercase tracking-widest hover:bg-white hover:shadow-neon-green transition-all clip-path-polygon">
                    ACCESS SPATIAL MATRIX
                </button>
                <div className="text-xs font-mono text-gray-500 max-w-xs mt-2">
                    * WARNING: Usage may result in unintended self-awareness and sudden clarity during deep space travel.
                </div>
            </div>
        </section>

        {/* 2. How It Works: The Protocol */}
        <section className="py-24 border-t border-chrono-green/30">
            <div className="flex items-center gap-4 mb-16">
                 <Terminal size={24} className="text-chrono-green" />
                 <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Protocol: Space Agent Cycle</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="border border-chrono-green/30 bg-black/50 p-8 hover:border-chrono-green transition-colors group">
                    <div className="text-4xl font-bold text-chrono-green/20 mb-6 group-hover:text-chrono-green transition-colors">01</div>
                    <h3 className="text-xl font-bold text-white mb-4 uppercase flex items-center gap-2">
                        <Radio size={16} className="text-chrono-cyan" /> Mission Brief
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Receive your daily mission prompt disguised as a logistical query. Bypass creative blocks with galactic urgency.
                    </p>
                </div>

                {/* Step 2 */}
                <div className="border border-chrono-green/30 bg-black/50 p-8 hover:border-chrono-green transition-colors group">
                    <div className="text-4xl font-bold text-chrono-green/20 mb-6 group-hover:text-chrono-green transition-colors">02</div>
                    <h3 className="text-xl font-bold text-white mb-4 uppercase flex items-center gap-2">
                        <Database size={16} className="text-chrono-cyan" /> Log Entry
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        File a classified secure report. Use abstract themes to mask sensitive emotional data from local surveillance (your ego).
                    </p>
                </div>

                {/* Step 3 */}
                <div className="border border-chrono-green/30 bg-black/50 p-8 hover:border-chrono-green transition-colors group">
                    <div className="text-4xl font-bold text-chrono-green/20 mb-6 group-hover:text-chrono-green transition-colors">03</div>
                    <h3 className="text-xl font-bold text-white mb-4 uppercase flex items-center gap-2">
                        <Activity size={16} className="text-chrono-cyan" /> Anomaly Report
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        HQ delivers a diagnostic on your recurring spatial anomalies (psychological patterns) and assigns corrective action.
                    </p>
                </div>
            </div>
        </section>

        {/* 3. Value Prop: The Defense */}
        <section className="py-24 border-t border-chrono-green/30 relative overflow-hidden">
             {/* Glitch Text Background */}
             <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5 flex flex-col justify-between select-none overflow-hidden">
                {Array.from({length: 10}).map((_, i) => (
                    <div key={i} className="text-9xl font-bold uppercase whitespace-nowrap text-chrono-green animate-glitch" style={{animationDelay: `${i * 0.2}s`}}>
                        DATA CORRUPTION
                    </div>
                ))}
             </div>

             <div className="relative z-10 max-w-4xl mx-auto text-center">
                 <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 uppercase tracking-tighter">
                    Data Corruption is <span className="text-chrono-red line-through decoration-2">Mandatory</span> <span className="text-chrono-green">Optional.</span>
                 </h2>
                 <p className="text-lg text-gray-400 mb-12 leading-relaxed">
                    Traditional logs are repetitive. Space_log uses narrative distance and creative prompts to bypass self-criticism, giving Headquarters—and you—objective insight into your own behavioral patterns across the timeline.
                 </p>
                 
                 <div className="bg-chrono-green/10 border border-chrono-green p-8 text-left max-w-2xl mx-auto transform rotate-1 hover:rotate-0 transition-transform">
                     <div className="flex items-center gap-2 mb-4 border-b border-chrono-green/20 pb-2">
                         <div className="w-2 h-2 bg-chrono-green rounded-full animate-pulse"></div>
                         <span className="text-xs uppercase tracking-widest text-chrono-green">Intercepted Transmission</span>
                     </div>
                     <p className="font-mono text-white text-lg italic mb-4">
                        "MISSION SUCCESS. I finally connected my 'spontaneous spending bicep' to my recurring 'emotional hailstorm.' Requesting backup from sector 7."
                     </p>
                     <div className="text-right text-xs text-chrono-cyan font-bold uppercase">
                        — Space Agent 404
                     </div>
                 </div>
             </div>
        </section>

        {/* 4. Social Proof: Field Agent Reviews */}
        <section className="py-24 border-t border-chrono-green/30">
            <div className="text-center mb-16">
                 <div className="inline-flex items-center gap-2 mb-4">
                     {[1,2,3,4,5].map(i => <Star key={i} size={16} className="text-chrono-green fill-current animate-pulse" />)}
                 </div>
                 <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-widest text-white mb-2">Space Explorer Endorsements</h2>
                 <p className="text-chrono-cyan text-sm tracking-[0.2em] font-bold">/// SUCCESSFUL DISPATCHES ///</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Review 1 */}
                <div className="border border-chrono-green p-8 bg-black/80 shadow-neon-green relative">
                    <div className="absolute -top-3 left-8 bg-black border border-chrono-green px-2 text-xs text-chrono-green uppercase tracking-widest">
                        Log Entry #144
                    </div>
                    <p className="text-gray-300 font-mono mb-6 leading-relaxed">
                        "My recurring Spatial Anomaly: Self-Doubt has been reduced by 60%. My best report yet. The system works if you trust the protocol."
                    </p>
                    <div className="flex justify-between items-end border-t border-gray-800 pt-4">
                        <span className="text-white font-bold uppercase text-sm">Agent 'Observer'</span>
                        <span className="text-chrono-green text-xs font-mono">STATUS: OPTIMIZED</span>
                    </div>
                </div>

                {/* Review 2 */}
                <div className="border border-chrono-cyan p-8 bg-black/80 hover:shadow-[0_0_15px_#00FFFF] transition-shadow relative">
                     <div className="absolute -top-3 left-8 bg-black border border-chrono-cyan px-2 text-xs text-chrono-cyan uppercase tracking-widest">
                        Log Entry #892
                    </div>
                    <p className="text-gray-300 font-mono mb-6 leading-relaxed">
                        "I didn't think talking about my job as a 'Resource Scarcity Mission' would help, but the bizarre prompts actually worked. I see the planetary pattern now."
                    </p>
                    <div className="flex justify-between items-end border-t border-gray-800 pt-4">
                        <span className="text-white font-bold uppercase text-sm">Cadet 'Wanderer'</span>
                        <span className="text-chrono-cyan text-xs font-mono">STATUS: AWAKENED</span>
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-12">
                 <div className="inline-block border border-gray-700 bg-gray-900 px-6 py-2 rounded-full">
                     <span className="text-gray-400 text-sm font-bold tracking-widest">RATED: <span className="text-white">HIGHLY EFFICIENT</span> (4.8/5)</span>
                 </div>
            </div>
        </section>

        {/* 5. Feature Deep Dive: Categorized Anomaly System */}
        <section className="py-24 border-t border-chrono-green/30 bg-chrono-dark/50">
             <div className="max-w-4xl mx-auto">
                <div className="mb-12 flex items-center gap-4">
                    <Activity className="text-chrono-red animate-pulse" />
                    <h2 className="text-2xl font-bold uppercase tracking-widest text-white">The Explorer's Focus: Sector Reporting</h2>
                </div>

                <div className="space-y-4">
                    {sectors.map((sector) => (
                        <div key={sector.id} className="border border-gray-800 bg-black hover:border-chrono-green transition-colors">
                            <button 
                                onClick={() => toggleSector(sector.id)}
                                className="w-full flex justify-between items-center p-6 text-left focus:outline-none"
                            >
                                <span className={`font-bold uppercase tracking-wider ${openSector === sector.id ? 'text-chrono-green' : 'text-white'}`}>
                                    {sector.title}
                                </span>
                                {openSector === sector.id ? <ChevronUp className="text-chrono-green" /> : <ChevronDown className="text-gray-500" />}
                            </button>
                            
                            {openSector === sector.id && (
                                <div className="p-6 border-t border-gray-800 bg-gray-900/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h4 className="text-xs text-chrono-cyan uppercase tracking-widest mb-2">The Prompt</h4>
                                            <p className="text-white font-mono text-lg mb-6">"{sector.prompt}"</p>
                                            
                                            <h4 className="text-xs text-chrono-red uppercase tracking-widest mb-2">The Focus</h4>
                                            <p className="text-gray-400 text-sm leading-relaxed">{sector.focus}</p>
                                        </div>
                                        <div className="flex items-center justify-center border border-dashed border-gray-700 p-4">
                                            {/* Abstract Visual Placeholder */}
                                            <div className="relative w-full h-32 flex items-center justify-center overflow-hidden bg-black">
                                                <div className="absolute inset-0 border border-chrono-green/20 grid grid-cols-4 grid-rows-4">
                                                    {Array.from({length:16}).map((_,i) => <div key={i} className="border border-chrono-green/10"></div>)}
                                                </div>
                                                <div className="w-full h-1 bg-chrono-green animate-scanline"></div>
                                                <span className="text-xs text-chrono-green font-mono blink">PROCESSING SECTOR DATA...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
             </div>
        </section>

        {/* 6. Review Logs Section (Video & Demo) */}
        <section className="py-24 border-t border-chrono-green/30 relative">
             <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-12">
                     <div className="w-3 h-3 bg-chrono-green rounded-full animate-pulse"></div>
                     <h2 className="text-2xl font-bold uppercase tracking-widest text-white">
                        🛰️ Access Spatial Data: Review The Logs
                     </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* FILE 7.A: VIDEO */}
                    <div className="border border-chrono-green/50 bg-black/80 p-1 relative overflow-hidden group hover:border-chrono-green transition-colors">
                        <div className="absolute top-0 left-0 bg-chrono-green text-black text-xs font-bold px-2 py-1 z-10 font-mono tracking-tighter">
                            FILE 7.A: ARCHIVED VIDEO LOG
                        </div>
                        {/* CRT Scanline for video container */}
                        <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px]"></div>
                        
                        <div className="aspect-video bg-gray-900 relative">
                            <video 
                                src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-holographic-interface-94-large.mp4"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                controls
                                poster="https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2670&auto=format&fit=crop"
                            />
                        </div>
                        <div className="p-4 border-t border-chrono-green/30 bg-chrono-dark">
                            <p className="text-gray-400 text-sm font-mono">
                                <span className="text-chrono-cyan">{'>'}</span> Visual confirmation of mission interface.<br/>
                                <span className="text-chrono-cyan">{'>'}</span> Demonstrating Creative Hook & ACT Pivot.
                            </p>
                        </div>
                    </div>

                    {/* FILE 7.B: LIVE ACCESS */}
                    <div className="border border-gray-800 bg-black p-8 relative flex flex-col justify-center">
                         <div className="absolute top-0 left-0 bg-chrono-red text-black text-xs font-bold px-2 py-1 z-10 font-mono tracking-tighter">
                            FILE 7.B: SPATIAL MATRIX SIMULATION
                        </div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-chrono-green via-chrono-cyan to-chrono-green"></div>
                        
                        <div className="font-mono text-center mt-6">
                            <div className="mb-6">
                                 <div className="w-16 h-16 mx-auto border border-chrono-cyan rounded-full flex items-center justify-center mb-4 relative">
                                    <div className="absolute inset-0 border border-chrono-cyan rounded-full animate-ping opacity-20"></div>
                                    <Eye size={24} className="text-chrono-cyan" />
                                 </div>
                                 <h3 className="text-white text-lg font-bold uppercase tracking-widest">Guest_Explorer_01</h3>
                                 <p className="text-xs text-chrono-green">ACCESS: UNRESTRICTED</p>
                            </div>
                            
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed border-t border-b border-gray-800 py-4">
                                Bypass the briefing. Directly navigate the Space Explorer Registry and view sample Log Dispatches.
                            </p>

                            <button className="w-full bg-chrono-green text-black hover:bg-white hover:shadow-neon-green font-bold uppercase py-4 transition-all tracking-widest mb-4 flex items-center justify-center gap-2">
                                Initiate Live Demo Access
                            </button>
                            
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                                * No credentials required. Session limited to 15:00.
                            </p>
                        </div>
                    </div>
                </div>
             </div>
        </section>

        {/* 7. FAQ: Log Efficiency */}
        <section className="py-24 border-t border-chrono-green/30">
            <div className="max-w-4xl mx-auto">
                 <div className="flex items-center gap-4 mb-12">
                     <Clock className="text-chrono-cyan" />
                     <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Logistical Alignment: Time & Resources</h2>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="flex gap-6">
                         <div className="w-12 h-12 border border-chrono-cyan flex items-center justify-center flex-shrink-0 bg-black">
                             <Terminal size={24} className="text-chrono-cyan" />
                         </div>
                         <div>
                             <h3 className="text-white font-bold uppercase mb-2">How long is a submission?</h3>
                             <p className="text-gray-400 text-sm leading-relaxed">
                                 Efficiency Protocol dictates a <span className="text-chrono-green font-bold">90-second minimum</span>. No time-wasting. Complete your report, upload, and resume mission.
                             </p>
                         </div>
                     </div>

                     <div className="flex gap-6">
                         <div className="w-12 h-12 border border-chrono-red flex items-center justify-center flex-shrink-0 bg-black">
                             <CreditCard size={24} className="text-chrono-red" />
                         </div>
                         <div>
                             <h3 className="text-white font-bold uppercase mb-2">Is there a subscription?</h3>
                             <p className="text-gray-400 text-sm leading-relaxed">
                                 Full Mission Access requires a subscription for continuous data integrity and processing. <Link to="/terms" className="text-chrono-red underline decoration-1 underline-offset-4">View Clearance Levels</Link>.
                             </p>
                         </div>
                     </div>
                 </div>
                 
                 {/* Visual: Efficiency Graph */}
                 <div className="mt-12 border border-gray-800 bg-black p-4 flex items-center justify-between font-mono text-xs text-gray-500">
                     <span>INITIATE</span>
                     <div className="flex-1 mx-4 h-1 bg-gray-800 overflow-hidden relative">
                         <div className="absolute top-0 left-0 h-full w-1/3 bg-chrono-green animate-draw"></div>
                     </div>
                     <span className="text-chrono-green">COMPLETE (90s)</span>
                 </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-chrono-green/30 text-center relative z-10 mb-20">
            <h2 className="text-2xl font-bold text-chrono-red mb-8 uppercase tracking-[0.5em] animate-pulse">
                End Transmission
            </h2>
            <div className="text-xs text-gray-600 uppercase tracking-widest">
                <Link to="/terms" className="hover:text-chrono-cyan mx-2">Security Protocols</Link> | 
                <Link to="/privacy" className="hover:text-chrono-cyan mx-2">Privacy Protocol</Link> | 
                <a href="#" className="hover:text-chrono-cyan mx-2">Mission Terms</a>
            </div>
        </footer>

      </main>

      {/* 8. Sticky CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t-2 border-chrono-red p-4 shadow-[0_-5px_20px_rgba(255,51,51,0.2)]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-chrono-red rounded-full animate-pulse"></div>
                  <span className="text-white font-mono font-bold uppercase tracking-widest text-sm sm:text-base">
                      Service Start: Mission Initiation
                  </span>
              </div>
              <button className="w-full sm:w-auto bg-chrono-red text-black font-bold uppercase px-8 py-3 hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2">
                  <Download size={18} /> Download Space_log
              </button>
          </div>
      </div>

    </div>
  );
};
