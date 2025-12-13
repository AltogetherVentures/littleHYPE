import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Star, ShieldCheck, Zap, BatteryCharging, Smile, Play, Pause, Gift, RefreshCcw, ArrowDown, Crown, User, Sparkles, Heart, Cloud, Ghost, Box, Lock, Palette, Sun } from 'lucide-react';
import { PRODUCTS, TESTIMONIALS, FAQS, PRODUCT_CONTENTS } from '../constants';
import { Button } from '../components/Button';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';

const IconMap: Record<string, React.ElementType> = {
    zap: Zap,
    battery: BatteryCharging,
    smile: Smile,
    heart: Heart,
    cloud: Cloud,
    ghost: Ghost,
    box: Box,
    sparkles: Sparkles,
    lock: Lock,
    palette: Palette,
    crown: Crown,
    gift: Gift,
    user: User,
    sun: Sun,
};

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const product = PRODUCTS.find(p => p.id === id);
  // Fallback content logic
  const content = PRODUCT_CONTENTS[id || ''] || PRODUCT_CONTENTS['hype-calendar'];
  
  const relatedProducts = PRODUCTS.filter(p => p.id !== id).slice(0, 3);

  useEffect(() => {
      window.scrollTo(0, 0);
      if (product) {
          document.title = `${product.name} | littleHYPE`;
      }
      return () => {
          document.title = 'littleHYPE';
      }
  }, [id, product]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play().then(() => setIsPlaying(true));
        }
    }
  };

  if (!product) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black">
            <h2 className="text-4xl font-heading font-black mb-4 uppercase">Void Detected</h2>
            <Button onClick={() => navigate('/')}>Return Home</Button>
        </div>
    )
  }

  // Helper for colors
  const hoverColors = [
      'hover:bg-hype-pink hover:text-white',
      'hover:bg-hype-cyan hover:text-black',
      'hover:bg-hype-lime hover:text-black',
      'hover:bg-hype-purple hover:text-white'
  ];

  return (
    <div className="min-h-screen font-sans text-black bg-white pb-20 md:pb-0">
      <Navbar />
      
      <main className="pt-32 px-4">
        {/* Main Product Hero */}
        <div className="max-w-7xl mx-auto mb-20">
            <Link to="/products" className="inline-flex items-center font-bold mb-8 uppercase text-sm tracking-widest hover:underline hover:text-hype-purple transition-colors">
                <ArrowLeft size={16} className="mr-2" /> Back to Products
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                {/* Visual Side - Large & Bold */}
                <div className="space-y-6">
                    <div 
                        className="relative aspect-square border-3 border-black shadow-hard group cursor-pointer bg-black hover:border-hype-pink hover:shadow-[6px_6px_0px_0px_#FF0090] transition-all"
                        onClick={togglePlay}
                    >
                         {product.videoUrl ? (
                            <video
                                ref={videoRef}
                                src={product.videoUrl}
                                poster={product.imageUrl}
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                         ) : (
                            <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                            />
                         )}

                        {/* Play/Pause Overlay - Minimalist */}
                        {product.videoUrl && (
                            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                                <div className="w-20 h-20 bg-white border-3 border-black flex items-center justify-center hover:scale-110 transition-transform shadow-hard group-hover:border-hype-pink">
                                    {isPlaying ? (
                                        <Pause size={32} fill="black" />
                                    ) : (
                                        <Play size={32} fill="black" className="ml-1" />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Details Side */}
                <div className="flex flex-col justify-center">
                    <div className="flex items-center space-x-1 text-black mb-6">
                        {[1,2,3,4,5].map(i => <Star key={i} className="fill-current w-5 h-5 text-hype-black hover:text-hype-yellow transition-colors" strokeWidth={2} />)}
                        <span className="text-gray-500 text-sm font-bold ml-4 uppercase tracking-wider">Verified</span>
                    </div>
                    
                    <h1 className="font-heading text-6xl font-black mb-4 leading-none uppercase tracking-tighter hover:text-hype-cyan transition-colors cursor-default">
                        {product.name}
                    </h1>
                    <p className="text-2xl font-bold mb-8 text-gray-500 font-mono">{product.tagline}</p>
                    
                    <div className="flex items-center gap-6 mb-8 border-b-3 border-black pb-8">
                        <div className="text-4xl font-black font-mono">
                            {product.price}
                        </div>
                        {product.type === 'physical' && <span className="text-sm font-bold border-2 border-black px-3 py-1 uppercase bg-gray-100">In Stock</span>}
                    </div>

                    <p className="text-lg leading-relaxed mb-10 font-medium text-gray-800">
                        {product.description}
                    </p>

                    <div className="space-y-4 mb-12">
                        {product.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center group">
                                <div className="w-6 h-6 border-2 border-black flex items-center justify-center mr-4 flex-shrink-0 group-hover:bg-hype-lime group-hover:border-hype-lime transition-colors">
                                    <Check size={16} strokeWidth={4} className="group-hover:text-black transition-colors" />
                                </div>
                                <span className="font-bold text-lg group-hover:translate-x-1 transition-transform">{feature}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button variant="primary" size="lg" className="w-full sm:w-auto text-xl uppercase tracking-widest border-3">
                            Buy Now
                        </Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto uppercase tracking-widest border-3">
                            Watch Demo
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        {/* Benefits Grid - Comic Panels */}
        <section className="py-24 border-t-3 border-black">
          <div className="max-w-7xl mx-auto">
             <div className="text-center mb-20 max-w-3xl mx-auto">
                <h2 className="font-heading text-5xl font-black mb-6 uppercase">Why You Need This</h2>
                <div className="h-1 w-32 bg-black mx-auto"></div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-3 border-black">
                {content.benefits.map((benefit, idx) => {
                    const Icon = IconMap[benefit.iconName] || Star;
                    
                    return (
                        <div key={idx} className={`group p-12 border-b-3 md:border-b-0 md:border-r-3 border-black last:border-0 transition-all duration-300 ${hoverColors[idx % hoverColors.length]}`}>
                           <Icon size={48} className="mb-6 stroke-[1.5] group-hover:scale-110 transition-transform" />
                           <h3 className="font-heading text-2xl font-black mb-4 uppercase">{benefit.title}</h3>
                           <p className="font-medium leading-relaxed opacity-80 group-hover:opacity-100">
                              {benefit.description}
                           </p>
                        </div>
                    );
                })}
             </div>
          </div>
        </section>

        {/* How It Works - Video Focus */}
        <section className="py-24 bg-black text-white">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1 border-3 border-white p-2 hover:border-hype-cyan hover:shadow-[8px_8px_0px_0px_#00E5FF] transition-all">
                         <div className="relative aspect-video bg-gray-900 overflow-hidden">
                            <video
                                src={content.howItWorks.videoUrl}
                                className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                         <h2 className="font-heading text-5xl font-black mb-2 uppercase tracking-tighter hover:text-hype-cyan transition-colors cursor-default">
                            {content.howItWorks.heading}
                         </h2>
                         <p className="text-gray-400 font-mono text-xl mb-12 border-b border-white/20 pb-4">{content.howItWorks.subheading}</p>
                         
                         <div className="space-y-8">
                             {content.howItWorks.steps.map((step, idx) => {
                                return (
                                    <div key={idx} className="flex gap-6 group">
                                        <div className="w-12 h-12 border-2 border-white flex items-center justify-center font-heading font-black text-xl flex-shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl mb-1 uppercase group-hover:text-hype-lime transition-colors">{step.title}</h3>
                                            <p className="font-medium text-gray-400">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                             })}
                         </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Vibe Check - Stickman Style */}
        <section className="py-24 px-4">
            <div className="max-w-5xl mx-auto border-3 border-black p-8 md:p-16 relative bg-white shadow-hard">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="font-heading text-5xl font-black mb-8 uppercase leading-none">
                            Is This For You?
                        </h2>
                        <div className="space-y-4">
                            {content.vibeCheck.audiences.map((item, i) => {
                                const Icon = IconMap[item.iconName] || Star;
                                return (
                                    <div key={i} className="flex items-center gap-4 p-4 border-2 border-black hover:translate-x-2 transition-all cursor-default hover:bg-black hover:text-white hover:shadow-hard-sm">
                                         <Icon size={24} />
                                         <span className="font-bold text-lg uppercase">{item.text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ID Card Doodle */}
                    <div className="relative flex justify-center">
                         <div className="w-64 h-80 border-3 border-black bg-white p-6 text-center rotate-3 shadow-hard hover:rotate-0 transition-transform duration-500 hover:shadow-[8px_8px_0px_0px_#FF5500] hover:border-hype-orange">
                             <div className="w-24 h-24 border-2 border-black rounded-full mx-auto mb-4 overflow-hidden bg-gray-100">
                                <img src={`https://picsum.photos/id/${(id?.length || 0) * 10}/200/200`} alt="Profile" className="grayscale" />
                             </div>
                             <h3 className="font-heading font-black text-2xl uppercase mb-1">{content.vibeCheck.idCard.title}</h3>
                             <div className="bg-black text-white text-sm font-bold py-1 px-2 inline-block mb-4 uppercase">{content.vibeCheck.idCard.tag}</div>
                             <div className="text-left text-sm font-mono border-t-2 border-black pt-4">
                                 <div className="flex justify-between"><span>VIBE:</span> <span className="font-bold">{content.vibeCheck.idCard.vibe}</span></div>
                                 <div className="flex justify-between"><span>STAT:</span> <span className="font-bold">{content.vibeCheck.idCard.status}</span></div>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </section>

      </main>
      
      <Footer />
      
       {/* Sticky Mobile Add to Cart Bar */}
       <div className="fixed bottom-0 left-0 right-0 p-4 border-t-3 border-black z-50 md:hidden flex items-center justify-between gap-4 bg-white">
            <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider">Total</span>
                <span className="text-2xl font-black">{product.price}</span>
            </div>
            <Button variant="primary" size="md" className="flex-1 uppercase">Buy Now</Button>
      </div>
    </div>
  );
};