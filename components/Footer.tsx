import React from 'react';
import { Instagram, Twitter, Mail, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-hype-black text-white pt-20 pb-10 mt-12 relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 border-b border-white/20 pb-12">
          
          <div className="col-span-1 md:col-span-2 space-y-6">
            <h3 className="text-4xl font-heading font-black text-white tracking-tighter">
                littleHYPE
                <span className="text-4xl ml-2">✌️</span>
            </h3>
            <p className="text-gray-300 max-w-sm text-lg font-medium">
              We make things. You buy things. We both feel better. <br/>
              Simplicity is the ultimate sophistication (or whatever).
            </p>
            <div className="flex space-x-4">
              {[Instagram, Twitter, Mail].map((Icon, i) => (
                  <a key={i} href="#" className="bg-white text-hype-black p-3 rounded-lg hover:bg-gray-200 transition-transform hover:-translate-y-1 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] border-2 border-white">
                    <Icon size={20} strokeWidth={2.5} />
                  </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-xl mb-6 text-white uppercase tracking-widest border-b-2 border-white inline-block pb-1">Products</h4>
            <ul className="space-y-4">
              <li><Link to="/products" className="text-gray-400 hover:text-white transition-colors font-bold">All Products</Link></li>
              <li><Link to="/products" className="text-gray-400 hover:text-white transition-colors font-bold">Digital</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-bold text-xl mb-6 text-white uppercase tracking-widest border-b-2 border-white inline-block pb-1">Company</h4>
            <ul className="space-y-4">
              <li><Link to="/story" className="text-gray-400 hover:text-white transition-colors font-bold">Our Story</Link></li>
              <li><Link to="/brand" className="text-gray-400 hover:text-white transition-colors font-bold">Brand Assets</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors font-bold">Contact</a></li>
            </ul>
          </div>

        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400 font-bold uppercase tracking-wider">
          <p>&copy; {new Date().getFullYear()} littleHYPE.</p>
          <p className="flex items-center mt-2 md:mt-0">
            Made with <Heart size={14} className="mx-2 fill-current text-white animate-pulse" /> & lots of coffee.
          </p>
        </div>
      </div>
    </footer>
  );
};