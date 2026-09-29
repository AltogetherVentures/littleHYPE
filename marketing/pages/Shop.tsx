
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PRODUCTS } from '../constants';
import { Button } from '../components/Button';
import { NewsletterForm } from '../components/NewsletterForm';

export const Shop: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'physical' | 'digital'>('all');

  const filteredProducts = PRODUCTS.filter(p => filter === 'all' ? true : p.type === filter);

  // Cycling hover effects
  const cardHoverStyles = [
    'hover:border-hype-pink hover:shadow-[6px_6px_0px_0px_#FF0090]',
    'hover:border-hype-cyan hover:shadow-[6px_6px_0px_0px_#00E5FF]',
    'hover:border-hype-lime hover:shadow-[6px_6px_0px_0px_#AAFF00]',
    'hover:border-hype-orange hover:shadow-[6px_6px_0px_0px_#FF5500]',
    'hover:border-hype-purple hover:shadow-[6px_6px_0px_0px_#9D00FF]'
  ];

  return (
    <div className="bg-white min-h-screen font-sans text-black">
      <Navbar />
      
      <main className="pt-32 px-4 max-w-7xl mx-auto min-h-screen">
        {/* Header */}
        <div className="text-center mb-16 border-b-3 border-black pb-12">
           <h1 className="font-heading text-6xl md:text-8xl font-black text-black mb-4 uppercase tracking-tighter">
              Products
           </h1>
           <p className="text-xl text-gray-500 font-bold max-w-2xl mx-auto">
              Weirdly specific joy. Minimalist aesthetics.
           </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-16">
            <div className="flex gap-4">
                {[
                    { id: 'all', label: 'ALL', colorClass: 'hover:bg-hype-pink hover:border-hype-pink' },
                    { id: 'digital', label: 'DIGITAL', colorClass: 'hover:bg-hype-lime hover:border-hype-lime' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id as any)}
                        className={`
                            px-8 py-2 font-black text-sm uppercase tracking-widest border-3 border-black transition-all
                            ${filter === tab.id 
                                ? 'bg-black text-white shadow-hard' 
                                : `bg-white text-black ${tab.colorClass} hover:text-white`
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pb-24">
            {filteredProducts.map((product, idx) => (
                <Link to={`/product/${product.id}`} key={product.id} className="group block">
                    <div className={`border-3 border-black bg-white shadow-hard transition-all duration-300 transform hover:-translate-y-1 ${cardHoverStyles[idx % cardHoverStyles.length]}`}>
                        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden border-b-3 border-black group-hover:border-inherit transition-colors">
                            <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                            />
                            {/* Stickman Badge */}
                            <div className="absolute top-4 left-4 bg-black text-white text-xs font-bold px-3 py-1 border-2 border-white group-hover:bg-white group-hover:text-black group-hover:border-black transition-colors">
                                {product.type === 'digital' ? 'DIGITAL' : 'PHYSICAL'}
                            </div>
                        </div>
                        
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-3xl font-heading font-black text-black leading-none uppercase group-hover:underline decoration-4">
                                    {product.name}
                                </h3>
                                <span className="font-mono font-bold text-xl">{product.price}</span>
                            </div>
                            <p className="text-gray-600 font-medium mb-8 text-lg">{product.tagline}</p>
                            
                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" className="rounded-none border-2 group-hover:bg-black group-hover:text-white group-hover:border-black">
                                    View Item <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
        
        {/* Empty State */}
        {filteredProducts.length === 0 && (
            <div className="text-center py-20 border-3 border-dashed border-gray-300 hover:border-hype-pink transition-colors">
                <p className="text-xl font-bold text-gray-400 uppercase">Void.</p>
                <Button variant="outline" className="mt-4" onClick={() => setFilter('all')}>Reset</Button>
            </div>
        )}

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
