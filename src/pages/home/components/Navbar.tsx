import logo from '../../../assets/logo.png';
import Button from './Button';

export default function Navbar({ onOpenAuthModal }: { onOpenAuthModal?: () => void }) {
  return (
    <nav className="fixed top-0 left-0 w-full bg-black z-50 border-b border-white/5 h-16 flex items-center">
      <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer">
          <img src={logo} alt="TDN Logo" className="h-7 w-auto object-contain" />
          <span className="text-white font-semibold text-lg tracking-tight">TDN</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="/home" className="text-white/90 hover:text-white transition-colors text-sm font-medium">Home</a>
          <a href="#news" className="text-white/60 hover:text-white transition-colors text-sm font-medium">News</a>
        </div>
        <div>
          <Button variant="primary" size="sm" className="px-5" onClick={onOpenAuthModal}>
            Sign In
          </Button>
        </div>
      </div>
    </nav>
  );
}