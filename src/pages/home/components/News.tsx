import Button from './Button';

export default function News() {
  return (
    <section id="news" className="w-full bg-black py-32 px-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col items-center text-center mb-32">
          <span className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-4">
            Ecosystem & Features
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white tracking-tight leading-tight max-w-3xl">
            Stay in the loop with the <br className="hidden md:block" />
            developer world.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center mb-40">
          <div className="order-2 lg:order-1 flex flex-col items-start">
            <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
              Real-Time Integrations
            </span>
            <h3 className="text-3xl md:text-4xl font-serif text-white leading-[1.2] mb-6">
              Never miss an update from <br className="hidden md:block" />
              the open-source ecosystem.
            </h3>
            <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8 max-w-md">
              Updates from your favorite technologies like Fastify, React, and Tailwind drop right into your feed. Read release notes, inspect code changes, and discuss with the community.
            </p>
            <Button variant="secondary" size="md" className="border border-white/10 hover:bg-white/5">
              Explore Integrations
            </Button>
          </div>

          <div className="order-1 lg:order-2 w-full flex justify-end">
            <div className="w-full max-w-lg bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
              
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <div className="w-8 h-8 rounded bg-black border border-white/10 flex items-center justify-center shadow-inner">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </div>
                <div>
                  <h4 className="text-white/90 font-medium text-sm">fastify / fastify</h4>
                  <p className="text-white/40 text-xs">Release v5.0.0 • 2 mins ago</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 font-mono border border-green-500/20">v5.0.0</span>
                  <span className="text-white/80 text-sm font-semibold">The Next Generation of Fastify</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-blue-500"></div>
                </div>
                <p className="text-white/50 text-xs font-mono line-clamp-3 leading-relaxed border-l-2 border-white/10 pl-3">
                  + Added native support for WebSockets. <br/>
                  + Improved routing performance by 20%. <br/>
                  - Deprecated legacy middleware patterns.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="order-2 lg:order-1 w-full flex justify-start relative">
            <div className="absolute top-12 left-12 w-full max-w-sm bg-[#050505] rounded-2xl border border-white/5 p-6 shadow-2xl opacity-50 scale-95 blur-[2px] pointer-events-none">
              <div className="h-6 w-3/4 bg-white/5 rounded mb-4"></div>
              <div className="h-4 w-1/2 bg-white/5 rounded mb-8"></div>
              <div className="h-10 w-full bg-white/5 rounded"></div>
            </div>

            <div className="relative w-full max-w-md bg-[#111] rounded-2xl border border-white/10 p-6 shadow-2xl z-10 group">
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                  <span className="text-black font-bold text-xl">N</span>
                </div>
                <span className="bg-white/5 text-white/50 px-3 py-1 rounded-full text-[10px] border border-white/10">
                  Full-time
                </span>
              </div>

              <h4 className="text-white font-semibold text-lg mb-1">Senior Frontend Engineer</h4>
              <p className="text-white/50 text-sm mb-6">Notion • Remote (EMEA)</p>

              <div className="flex flex-wrap gap-2 mb-8">
                <span className="px-2.5 py-1 rounded-md bg-white/5 text-white/70 text-xs border border-white/5">React</span>
                <span className="px-2.5 py-1 rounded-md bg-white/5 text-white/70 text-xs border border-white/5">TypeScript</span>
                <span className="px-2.5 py-1 rounded-md bg-white/5 text-white/70 text-xs border border-white/5">$150k - $180k</span>
              </div>

              <div className="w-full bg-white text-black text-sm font-semibold py-3 rounded-xl text-center hover:bg-gray-200 transition-colors cursor-pointer">
                Apply Now
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 flex flex-col items-start lg:pl-12">
            <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
              Developer Job Board
            </span>
            <h3 className="text-3xl md:text-4xl font-serif text-white leading-[1.2] mb-6">
              Take the next step <br className="hidden md:block" />
              in your career.
            </h3>
            <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8 max-w-md">
              Filtered and verified job postings exclusively for the software world. Create listings to build your own team, or apply to open positions at global tech giants with a single click.
            </p>
            <Button variant="secondary" size="md" className="border border-white/10 hover:bg-white/5">
              Browse Jobs
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
}