import PdfUploader from './components/PdfUploader';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      
      
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          
          
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
              C
            </div>
            <span className="text-xl font-extrabold text-slate-800 tracking-tight">
              Astro<span className="text-indigo-600 font-medium">PDF Engine</span>
            </span>
          </div>
          
          
          <div className="flex items-center gap-6">
            {/* <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-500">
              <a href="#" className="text-indigo-600 transition-colors">Workspace</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Templates</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Settings</a>
            </div> */}
            
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            
            <div className="flex items-center gap-4">
              
              
              
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm cursor-pointer shadow-sm hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all">
                A
              </div>
            </div>
          </div>

        </div>
      </nav>

      <main className="relative min-h-[calc(100vh-4rem)] pb-12 flex flex-col">
        
  
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