import { useEffect, useState } from 'react';
import Button from './Button';

export default function Hero({ onOpenAuthModal }: { onOpenAuthModal: () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center text-center mt-12 md:mt-16 px-4 bg-black">
      <h1 className={`text-3xl md:text-4xl lg:text-[3.5rem] font-serif text-white tracking-tight leading-[1.1] mb-6 max-w-4xl transition-all duration-1000 ease-out transform ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        The community and <br className="hidden md:block" />
        <span className="relative inline-block">sharing platform<span className="absolute left-0 -bottom-2 w-full h-[2px] bg-white/30"></span></span> for developers.
      </h1>
      <div className={`transition-all duration-1000 delay-300 ease-out transform ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <Button size="lg" className="text-lg px-10 py-4 font-medium" onClick={onOpenAuthModal}>
          Join the Community
        </Button>
      </div>
    </div>
  );
}