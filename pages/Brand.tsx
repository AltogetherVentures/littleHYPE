import React, { useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Button } from '../components/Button';
import { Download, Copy } from 'lucide-react';

export const Brand: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure font is loaded before drawing
        document.fonts.ready.then(() => {
            drawLogo(ctx, canvas.width, canvas.height);
        });
    }, []);

    const drawLogo = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.clearRect(0, 0, width, height);

        // Center Point
        const centerX = width / 2;
        const centerY = height / 2;

        // Font Settings matching the website theme
        // font-heading is 'Poppins'
        // uppercase
        ctx.font = '900 80px "Poppins", sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        const text = "LITTLEHYPE";
        // Calculate width to position stickman relative to text
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;

        // Draw Text
        ctx.fillText(text, centerX, centerY);

        // Draw Underline for "HYPE"
        // HYPE is roughly the last 4 chars. 
        // Approx calc: HYPE is roughly 45% of width visually in this font.
        const underlineStart = centerX + (textWidth / 2) - (textWidth * 0.45); 
        const underlineEnd = centerX + (textWidth / 2);
        
        ctx.beginPath();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000000';
        ctx.lineCap = 'round';
        ctx.moveTo(underlineStart, centerY + 45);
        ctx.lineTo(underlineEnd, centerY + 45);
        ctx.stroke();

        // Draw Stickman (Doodle style)
        // Position: Top right of text
        const stickX = centerX + (textWidth / 2) + 30;
        const stickY = centerY - 20;

        ctx.beginPath();
        ctx.lineWidth = 4;
        
        // Head
        ctx.arc(stickX, stickY - 20, 10, 0, Math.PI * 2);
        
        // Body
        ctx.moveTo(stickX, stickY - 10);
        ctx.lineTo(stickX, stickY + 25);
        
        // Arms
        ctx.moveTo(stickX, stickY + 5);
        ctx.lineTo(stickX - 15, stickY + 15);
        
        ctx.moveTo(stickX, stickY + 5);
        ctx.lineTo(stickX + 15, stickY - 5); // Waving
        
        // Legs
        ctx.moveTo(stickX, stickY + 25);
        ctx.lineTo(stickX - 12, stickY + 45);
        
        ctx.moveTo(stickX, stickY + 25);
        ctx.lineTo(stickX + 12, stickY + 45);
        
        ctx.stroke();
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = 'littleHYPE_logo.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="bg-white min-h-screen font-sans text-black">
            <Navbar />
            <main className="pt-32 px-4 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="font-heading text-6xl font-black uppercase mb-4">Brand Assets</h1>
                    <p className="text-xl text-gray-500 font-medium">Steal our look. (Please don't actually steal it, just use it nicely).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                    {/* Preview Section */}
                    <div className="border-3 border-black p-8 rounded-xl shadow-hard bg-gray-50">
                         <h2 className="font-heading text-2xl font-black uppercase mb-6 flex items-center gap-2">
                            <span className="w-3 h-3 bg-black rounded-full"></span> Logo Preview
                         </h2>
                         
                         <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 flex items-center justify-center mb-8 overflow-hidden">
                             {/* We display the canvas here directly so user sees exactly what they get */}
                             <canvas 
                                ref={canvasRef} 
                                width={800} 
                                height={300} 
                                className="w-full h-auto max-w-md"
                             />
                         </div>

                         <div className="flex gap-4">
                            <Button onClick={handleDownload} variant="primary" className="w-full uppercase tracking-widest">
                                <Download className="mr-2" size={20} /> Download PNG
                            </Button>
                         </div>
                    </div>

                    {/* Info Section */}
                    <div className="space-y-8">
                        <div className="bg-hype-black text-white p-8 rounded-xl shadow-hard border-3 border-black">
                             <h3 className="font-heading text-xl font-bold uppercase mb-4 text-hype-cyan">Colors</h3>
                             <div className="space-y-4">
                                 <div className="flex items-center justify-between">
                                     <span className="font-mono">#000000</span>
                                     <div className="w-12 h-12 bg-black border-2 border-white shadow-sm"></div>
                                 </div>
                                 <div className="flex items-center justify-between">
                                     <span className="font-mono">#FFFFFF</span>
                                     <div className="w-12 h-12 bg-white border-2 border-black shadow-sm"></div>
                                 </div>
                                 <div className="flex items-center justify-between">
                                     <span className="font-mono">#FF0090</span>
                                     <div className="w-12 h-12 bg-hype-pink border-2 border-black shadow-sm"></div>
                                 </div>
                                 <div className="flex items-center justify-between">
                                     <span className="font-mono">#00E5FF</span>
                                     <div className="w-12 h-12 bg-hype-cyan border-2 border-black shadow-sm"></div>
                                 </div>
                             </div>
                        </div>

                        <div className="border-3 border-black p-8 rounded-xl shadow-hard bg-white">
                             <h3 className="font-heading text-xl font-bold uppercase mb-4">Typography</h3>
                             <div className="space-y-4">
                                 <div>
                                     <p className="text-sm text-gray-500 uppercase font-bold mb-1">Headings</p>
                                     <p className="font-heading font-black text-3xl">Poppins</p>
                                 </div>
                                 <div>
                                     <p className="text-sm text-gray-500 uppercase font-bold mb-1">Body</p>
                                     <p className="font-sans font-medium text-xl">Inter</p>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>

            </main>
            <Footer />
        </div>
    );
};