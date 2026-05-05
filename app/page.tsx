import PdfUploader from './components/PdfUploader';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      
      {/* --- SaaS TOP NAVIGATION BAR --- */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
              C
            </div>
            <span className="text-xl font-extrabold text-slate-800 tracking-tight">
              Cosmic<span className="text-indigo-600 font-medium">Studio</span>
            </span>
          </div>
          
          {/* Right Side Navigation & Profile */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
              <a href="#" className="text-indigo-600 transition-colors">Workspace</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Templates</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Settings</a>
            </div>
            
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button className="relative p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Active Notification Dot */}
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
              </button>
              
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm cursor-pointer shadow-sm hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all">
                A
              </div>
            </div>
          </div>

        </div>
      </nav>

      {/* --- MAIN APP WORKSPACE --- */}
      <main className="relative min-h-[calc(100vh-4rem)] pb-12 flex flex-col">
        
        {/* High-Tech Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center z-0">
          {/* Top Ambient Glow */}
          <div className="w-[1000px] h-[600px] bg-gradient-to-b from-indigo-100/50 via-violet-50/20 to-transparent rounded-full blur-3xl opacity-70 -top-40 absolute"></div>
          {/* Subtle Grid Pattern for Blueprint/Engineering Feel */}
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
              backgroundSize: '32px 32px', 
              opacity: 0.4 
            }}
          ></div>
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 w-full flex-1 flex flex-col">
          {/* The Uploader handles its own max-widths and margins now */}
          <PdfUploader />
        </div>

      </main>
      
    </div>
  );
}