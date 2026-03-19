function App() {
  const sections = [
    { title: 'Communities' },
    { title: 'News' },
    { title: 'Job Postings' },
    { title: 'Updates' }
  ];

  return (
    // Main container: min-height screen, dark background, flex column layout, centered horizontally, vertical padding
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center p-6 font-sans antialiased">
      
      {/* Glow Effect Background (Sutil ve profesyonel) */}
      <div className="absolute top-0 -z-10 h-full w-full bg-slate-950">
        <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[30%] translate-y-[20%] rounded-full bg-[rgba(173,109,244,0.15)] opacity-50 blur-[80px]"></div>
      </div>

      {/* Header Section - Top */}
      <header className="pt-24 md:pt-32 pb-16 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-4">
          The Developer Network
        </h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium">
          Geliştiriciler için yeni nesil topluluk ve paylaşım platformu.
        </p>
      </header>

      {/* Main Content Section - Middle Navigation */}
      <main className="flex-grow flex items-center justify-center">
        <nav>
          <ul className="flex flex-col sm:flex-row items-center gap-x-12 gap-y-6 text-center text-slate-300">
            {sections.map((section) => (
              <li key={section.title} className="text-xl md:text-2xl font-semibold tracking-wide hover:text-white transition-colors cursor-default">
                {section.title}
              </li>
            ))}
          </ul>
        </nav>
      </main>

      {/* Footer Section - Bottom */}
      <footer className="w-full max-w-7xl mx-auto py-10 mt-auto border-t border-slate-800 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 font-semibold mb-6 animate-pulse">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
          </span>
          Yakında Yayında - Nisan 2026
        </div>
        <p className="text-sm text-slate-600">
          © TDN 2026
        </p>
      </footer>
    </div>
  );
}

export default App;