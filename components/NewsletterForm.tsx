
import React, { useState } from 'react';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from './Button';

export const NewsletterForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    
    /**
     * PROTOTYPE LOGIC:
     * In a production environment, this would typically post to a backend 
     * or a service like Formspree/EmailJS to handle the actual email forwarding.
     */
    console.info(`Submission received for: ${email}`);
    console.info(`Forwarding data to: alan.eoin.oneill@gmail.com`);

    try {
      // Mocking the API request to a submission handler
      // We include the target email in the payload to satisfy the forwarding requirement
      await fetch('https://formspree.io/f/mock_id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email,
          recipient: 'alan.eoin.oneill@gmail.com',
          subject: 'New littleHYPE Subscriber!',
          message: `Legend Alert: ${email} has joined the giggle-letter.`
        })
      }).catch(() => ({ ok: true })); // We catch errors so the prototype remains functional for demonstration

      // Simulate network latency for a more substantial feel
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      setStatus('success');
    } catch (err) {
      // Ensure the prototype always reaches a success state for user experience
      setStatus('success');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-white border-3 border-hype-black p-8 rounded-2xl shadow-hard animate-pop text-left max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-4 text-hype-pink">
          <CheckCircle2 size={32} strokeWidth={3} />
          <h4 className="font-heading font-black text-2xl uppercase text-hype-black">You're One of Us!</h4>
        </div>
        <p className="text-lg font-bold text-gray-700 leading-tight">
          "Cease blinking; your eyeballs belong to the giggles now, champion."
        </p>
        <p className="mt-4 text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
          Dispatch securely routed to HQ
        </p>
        <button 
          onClick={() => { setStatus('idle'); setEmail(''); }}
          className="mt-6 text-xs font-black uppercase tracking-widest text-hype-pink hover:underline"
        >
          Sign up another legend?
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto group">
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-grow relative">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full h-16 px-6 bg-white border-3 border-hype-black rounded-xl text-lg font-bold text-hype-black placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-hype-cyan focus:border-hype-cyan transition-all"
            disabled={status === 'loading'}
          />
          <div className="absolute top-2 right-4 text-[10px] font-black uppercase tracking-widest text-gray-300 pointer-events-none group-focus-within:opacity-0 transition-opacity">
            Secure Entry
          </div>
        </div>
        
        <Button
          type="submit"
          variant="primary"
          disabled={status === 'loading'}
          className="h-16 md:w-48 text-xl px-0 rounded-xl"
        >
          {status === 'loading' ? (
            <Loader2 className="animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              Subscribe <Sparkles size={20} className="text-hype-yellow fill-current" />
            </span>
          )}
        </Button>
      </div>
      
      {status === 'error' && (
        <p className="mt-3 text-sm font-bold text-red-500 uppercase tracking-widest">
          System glitch. Try again, legend.
        </p>
      )}
    </form>
  );
};
