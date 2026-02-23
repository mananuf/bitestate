export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-10 flex justify-between items-center px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-400 flex items-center justify-center">
            <span className="font-bold text-black text-xs">BE</span>
          </div>
          <span className="font-bold text-xl tracking-tight">BitEstate</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#" className="hover:text-white transition-colors">Marketplace</a>
          <a href="#" className="hover:text-white transition-colors">How it Works</a>
          <a href="#" className="hover:text-white transition-colors">Midl Network</a>
        </div>
        <div>
          <a href="/dashboard" className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-zinc-200 transition-colors">
            Enter App
          </a>
        </div>
      </nav>

      {/* Hero Section (v0 IRL Event Inspired) */}
      <main className="relative flex flex-col lg:flex-row min-h-screen items-center justify-center px-8 sm:px-16 overflow-hidden">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        </div>

        {/* Left Content */}
        <div className="w-full lg:w-1/2 z-10 flex flex-col items-start justify-center pt-24 lg:pt-0">
          <p className="text-orange-500 font-mono text-sm tracking-widest uppercase mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            Live on Midl Network
          </p>
          
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
            Real Estate,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
              Secured by
            </span>
            <br />
            <span className="text-orange-500">
              Bitcoin.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-zinc-400 max-w-lg mb-12 leading-relaxed font-light">
            Discover, buy, and trade premium real estate natively on the Bitcoin blockchain using high-throughput Midl smart contracts.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <a href="/dashboard" className="px-8 py-4 bg-orange-500 text-black text-center font-semibold rounded-full hover:bg-orange-400 transition-colors text-lg flex items-center justify-center gap-2">
              Browse Listings
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
            <button className="px-8 py-4 bg-transparent border border-zinc-800 text-white text-center font-semibold rounded-full hover:bg-zinc-900 transition-colors text-lg">
              Read the Docs
            </button>
          </div>
        </div>

        {/* Right 3D Element Showcase */}
        <div className="w-full lg:w-1/2 h-[600px] z-10 relative flex items-center justify-center mt-16 lg:mt-0">
          {/* Decorative Glows */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-orange-500/20 blur-[100px] rounded-full pointer-events-none"></div>
          
          {/* Simulated 3D Digital Deed Card */}
          <div className="relative w-80 h-[480px] bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-2xl border border-zinc-700/50 shadow-2xl p-6 flex flex-col justify-between transform perspective-1000 origin-center hover:rotate-y-[-10deg] hover:rotate-x-[5deg] transition-transform duration-700">
            {/* Holographic Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-2xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-1">Asset Class</p>
                <p className="font-semibold text-sm">Real Estate (Tier 1)</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center my-8">
              <div className="w-full aspect-square rounded-xl bg-zinc-900 border border-zinc-800/80 overflow-hidden relative shadow-inner">
                {/* Simulated Property Image */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800')] bg-cover bg-center mix-blend-luminosity opacity-80"></div>
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider mb-2 border-b border-zinc-800 pb-2">Verified Contract Data</p>
              <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <p className="text-zinc-500 text-xs">Network</p>
                  <p className="font-medium text-white">Midl L2</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">Valuation</p>
                  <p className="font-medium text-orange-400">8.00 BTC</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                <p className="text-xs font-mono text-zinc-500">ID: BE-8924</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <p className="text-xs text-green-500 font-medium">Immutable</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
