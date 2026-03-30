export default function AppMockup() {
  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 md:mt-32">
      
      {/* Background Decorative Layer (Greenish tone from the design) */}
      <div className="absolute inset-0 bg-[#d8ddd0] rounded-t-3xl md:rounded-t-[3rem] transform translate-y-12 -z-10"></div>

      {/* Main Mockup Container */}
      <div className="bg-[#121212] rounded-t-2xl md:rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden min-h-[500px] flex flex-col md:flex-row">
        
        {/* Left Side: Community Feed & News */}
        <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/5">
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">T</span>
            </div>
            <span className="text-white/80 font-medium text-sm flex items-center gap-2">
              TDN Global Feed
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {/* Feed Items Container */}
          <div className="space-y-4">
            
            {/* Tech News Card */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-5 hover:bg-white/10 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">Breaking News</span>
                <span className="text-white/40 text-xs">2 hours ago</span>
              </div>
              <h4 className="text-white font-medium mb-1">Amazon lays off 300 employees in AWS and Twitch divisions</h4>
              <p className="text-white/60 text-sm line-clamp-2">Tech giant announces internal restructuring affecting multiple departments to focus on core AI initiatives...</p>
            </div>

            {/* Job Posting Card */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-5 hover:bg-white/10 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">Job Opportunity</span>
                <span className="text-white/40 text-xs">Remote</span>
              </div>
              <h4 className="text-white font-medium mb-1">Senior React Engineer at Vercel</h4>
              <p className="text-white/60 text-sm mb-3">Join the core Next.js team. Experience with React Server Components required.</p>
              <div className="flex gap-2">
                <span className="text-xs border border-white/10 text-white/50 px-2 py-1 rounded-md">$140k - $180k</span>
                <span className="text-xs border border-white/10 text-white/50 px-2 py-1 rounded-md">TypeScript</span>
              </div>
            </div>

            {/* User Community Post */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-5 hover:bg-white/10 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500"></div>
                <div>
                  <div className="text-white text-sm font-medium">Alex Developer</div>
                  <div className="text-white/40 text-xs">@alexdev • Just now</div>
                </div>
              </div>
              <p className="text-white/70 text-sm">Just open-sourced my new Tailwind v4 plugin for advanced animations. Would love some feedback from the community! 🚀</p>
            </div>

          </div>
        </div>

        {/* Right Side: Sidebar / System Info */}
        <div className="w-full md:w-80 bg-[#0a0a0a] p-6 md:p-8 flex flex-col gap-6">
          <h3 className="text-white/50 text-xs uppercase tracking-widest font-semibold">System Updates</h3>
          
          <div className="space-y-5">
            {/* Update Item */}
            <div className="flex gap-4">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <div>
                <div className="text-white text-sm font-medium">v2.1.0 Deployed</div>
                <div className="text-white/50 text-xs mt-1 leading-relaxed">WebSocket infrastructure upgraded. Real-time notifications are now 40% faster.</div>
              </div>
            </div>

            {/* Update Item */}
            <div className="flex gap-4">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
              <div>
                <div className="text-white text-sm font-medium">New Feature: Code Review</div>
                <div className="text-white/50 text-xs mt-1 leading-relaxed">You can now request community code reviews directly from your GitHub repositories.</div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}