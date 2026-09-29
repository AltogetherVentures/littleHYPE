import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'coral' | 'teal'; // Added legacy variants for compatibility
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center font-bold transition-all duration-200 transform border-3 border-hype-black rounded-xl active:translate-y-0 active:shadow-none";
  
  // Interactive Pop Colors: Pink for primary, Cyan for secondary
  const variants = {
    primary: "bg-hype-black text-white shadow-hard hover:shadow-[6px_6px_0px_0px_#FF0090] hover:border-hype-pink hover:-translate-y-0.5 active:bg-hype-pink active:border-hype-black",
    secondary: "bg-white text-hype-black shadow-hard hover:shadow-[6px_6px_0px_0px_#00E5FF] hover:border-hype-cyan hover:-translate-y-0.5 active:bg-hype-cyan",
    outline: "bg-transparent text-hype-black shadow-hard hover:shadow-[6px_6px_0px_0px_#AAFF00] hover:bg-hype-lime hover:border-hype-black hover:-translate-y-0.5 active:bg-hype-lime",
    ghost: "bg-transparent border-transparent shadow-none hover:bg-hype-gray text-hype-black hover:text-hype-purple",
    // Compatibility fallbacks mapping to vibrant interactions
    coral: "bg-white text-hype-black shadow-hard hover:shadow-[6px_6px_0px_0px_#FF5500] hover:border-hype-orange hover:-translate-y-0.5",
    teal: "bg-white text-hype-black shadow-hard hover:shadow-[6px_6px_0px_0px_#00E5FF] hover:border-hype-cyan hover:-translate-y-0.5"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-8 py-3 text-base",
    lg: "px-10 py-4 text-lg"
  };

  // Map variants
  const getVariant = (v: string) => {
    if (v === 'coral') return variants.coral;
    if (v === 'teal') return variants.teal;
    if (v === 'accent') return variants.primary;
    if (v === 'outline') return variants.outline;
    if (v === 'secondary') return variants.secondary;
    if (v === 'ghost') return variants.ghost;
    return variants.primary;
  }

  return (
    <button 
      className={`${baseStyle} ${getVariant(variant)} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};