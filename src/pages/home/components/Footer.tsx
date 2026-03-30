import logo from '../../../assets/logo.png';

export default function Footer() {
  return (
    <footer className="w-full bg-black pt-24 pb-8 border-t border-white/5 mt-32">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex flex-col md:flex-row justify-between gap-12 md:gap-0">
          <div>
            <div className="flex items-center gap-2 cursor-pointer mb-6">
              <img src={logo} alt="TDN Logo" className="h-7 w-auto object-contain" />
              <span className="text-white font-semibold text-xl tracking-tight">TDN</span>
            </div>
            <p className="text-white/40 text-sm max-w-xs">
              The community and sharing platform for developers.
            </p>
          </div>

          <div className="flex gap-16 md:gap-24">
            <div className="flex flex-col gap-4">
              <h4 className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2">Company</h4>
              <a href="#news" className="text-white/80 hover:text-white text-sm transition-colors">News</a>
              <a href="/terms" className="text-white/80 hover:text-white text-sm transition-colors">Terms of Use</a>
              <a href="/privacy" className="text-white/80 hover:text-white text-sm transition-colors">Privacy Policy</a>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-2">Social & Contact</h4>
              <a href="https://x.com/devnetworknet" target="_blank" rel="noreferrer" className="text-white/80 hover:text-white text-sm transition-colors">
                X
              </a>
              <a href="https://instagram.com/devnetworknet" target="_blank" rel="noreferrer" className="text-white/80 hover:text-white text-sm transition-colors">
                Instagram
              </a>
              <a href="https://github.com/the-developer-network" target="_blank" rel="noreferrer" className="text-white/80 hover:text-white text-sm transition-colors">
                GitHub
              </a>
              <a href="mailto:contact@developernetwork.net" className="text-white/80 hover:text-white text-sm transition-colors">
                Email Us
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between mt-20 pt-8 border-t border-white/5 text-white/50 text-sm gap-6">
          <p>© 2026 All Rights Reserved, TDN</p>
        </div>

      </div>
    </footer>
  );
}