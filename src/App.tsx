import { Terminal, Shield, Zap } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0D0E12] text-white flex flex-col font-['Chakra_Petch',sans-serif]">
      {/* VCR Header OSD */}
      <header className="border-b border-[#2E3342] bg-[#16181D] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-[#F2FF00] animate-pulse" />
          <span className="font-mono text-xs tracking-widest text-[#F2FF00] font-bold">REC ● INTER-KNOT OSD</span>
          <span className="text-[#5C6275]">|</span>
          <span className="text-sm font-bold tracking-wider text-white">ZZZTasks // SYSTEM READY</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-[#A0A5B5]">
          <span className="bg-[#242831] px-2.5 py-1 rounded border border-[#2E3342] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#00F0FF]" /> PROXY LICENSE: ACTIVE
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md bg-[#16181D] border-2 border-[#2E3342] p-8 rounded-lg shadow-2xl relative overflow-hidden">
          {/* Top Yellow Hazard Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#F2FF00]" />
          
          <div className="w-16 h-16 bg-[#242831] border border-[#F2FF00] rounded-full mx-auto flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(242,255,0,0.3)]">
            <Zap className="w-8 h-8 text-[#F2FF00]" />
          </div>

          <h1 className="text-2xl font-bold tracking-wider text-white mb-2 uppercase">
            ZZZTasks Core HUD
          </h1>
          <p className="text-sm text-[#A0A5B5] mb-6">
            Scaffolding & Tooling initialized. Ready for Hollow Commission modules, Bangboo mascot, and calendar matrix.
          </p>

          <div className="flex items-center justify-center gap-2 text-xs font-mono bg-[#0D0E12] py-2 px-3 rounded border border-[#2E3342] text-[#00F0FF]">
            <Terminal className="w-4 h-4" />
            <span>VITE 6 + REACT 18 + TAILWIND + VITEST</span>
          </div>
        </div>
      </main>
    </div>
  );
}
