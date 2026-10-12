import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Array of hover colors for nav items
  const navHoverClasses = [
      "hover:text-hype-pink hover:border-hype-pink",
      "hover:text-hype-cyan hover:border-hype-cyan",
      "hover:text-hype-lime hover:border-hype-lime"
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center w-full bg-white border-b-3 border-hype-black">
      <nav className="w-full max-w-7xl px-4 md:px-8 py-4 flex justify-between items-center">
            
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <span className="font-heading font-black text-2xl tracking-tighter text-hype-black uppercase relative transition-colors group-hover:text-hype-orange">
                little<span className="text-hype-black underline decoration-4 decoration-hype-black group-hover:text-hype-orange group-hover:decoration-hype-orange">HYPE</span>
                {/* Stickman Doodle */}
                <svg className="absolute -right-8 -top-4 w-8 h-8 text-black hidden group-hover:block animate-wiggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="5" r="3" />
                    <line x1="12" y1="8" x2="12" y2="15" />
                    <line x1="12" y1="8" x2="6" y2="12" />
                    <line x1="12" y1="8" x2="18" y2="12" />
                    <line x1="12" y1="15" x2="8" y2="20" />
                    <line x1="12" y1="15" x2="16" y2="20" />
                </svg>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-1">
              {['Products', 'Story', 'Community'].map((item, idx) => (
                  <Link 
                    key={item}
                    to={`/${item.toLowerCase()}`} 
                    className={`px-6 py-2 rounded-lg text-sm font-bold text-hype-black transition-all border-2 border-transparent hover:bg-black ${navHoverClasses[idx % navHoverClasses.length]}`}
                  >
                    {item}
                  </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsOpen(!isOpen)} className="text-hype-black p-2 border-2 border-hype-black rounded-lg hover:bg-hype-pink hover:border-hype-pink hover:text-white transition-colors">
                {isOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
              </button>
            </div>
      </nav>

        {/* Mobile Menu Overlay */}
        {isOpen && (
          <div className="md:hidden absolute top-[72px] left-0 right-0 bg-white border-b-3 border-hype-black shadow-hard-lg z-40">
            <div className="flex flex-col p-4">
              {['Home', 'Products', 'Story', 'Community'].map((item, idx) => {
                 const colors = ["hover:bg-hype-pink", "hover:bg-hype-cyan", "hover:bg-hype-lime", "hover:bg-hype-orange"];
                 return (
                  <Link 
                    key={item}
                    to={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                    onClick={() => setIsOpen(false)}
                    className={`px-6 py-4 font-black text-xl text-hype-black transition-colors uppercase border-b border-gray-100 last:border-0 hover:text-white ${colors[idx % colors.length]}`}
                  >
                    {item}
                  </Link>
                 );
              })}
            </div>
          </div>
        )}
    </div>
  );
};