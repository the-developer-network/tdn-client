import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AppMockup from './components/AppMockup';
import News from './components/News';
import Footer from './components/Footer';
// Updated import path
import AuthModal from '../auth/components/AuthModal';

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black selection:bg-white/20 selection:text-white font-sans flex flex-col overflow-x-hidden">
      <Navbar onOpenAuthModal={() => setIsAuthModalOpen(true)} />
      
      <main className="pt-24 flex-grow">
        <Hero onOpenAuthModal={() => setIsAuthModalOpen(true)} />
        <AppMockup />
        <News />
      </main>

      <Footer />
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}