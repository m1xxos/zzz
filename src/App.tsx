import { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Database,
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
} from 'lucide-react';
import { StoreProvider, useStore } from './store/useStore';
import { exportBackup, validateBackup, importBackup } from './services/storage';
import TaskBoard from './components/tasks/TaskBoard';
import DailiesBoard from './components/dailies/DailiesBoard';
import BackupModal from './components/common/BackupModal';
import CalendarMatrix from './components/calendar/CalendarMatrix';

function MainAppShell() {
  const store = useStore();
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [bangbooDialogueText, setBangbooDialogueText] = useState('Eh-nah! En-nah!');
  const [bangbooSubtitleText, setBangbooSubtitleText] = useState('Proxy, commissions operational!');

  const {
    activeView,
    setActiveView,
    settings,
    toggleAudioMute,
    bangboo,
    setBangbooMood,
    tasks,
    dailies,
    importState,
  } = store;

  const isMuted = settings.audio.muted;

  // Handle Bangboo Mascot Poke
  const handleBangbooPoke = () => {
    if (typeof store.triggerBangbooPoke === 'function') {
      store.triggerBangbooPoke();
      return;
    }

    const quotes = [
      { dialect: 'Eh-nah! En-nah!', sub: 'Proxy, ready for dispatch!' },
      { dialect: 'En-na en-nah!', sub: 'Hollow zero telemetry clear!' },
      { dialect: 'Eh-nah!! ★', sub: 'Let’s clear all S-Rank commissions!' },
      { dialect: 'Nyah-nah!', sub: 'Eous is cheering for you!' },
    ];
    const picked = quotes[Math.floor(Math.random() * quotes.length)];
    setBangbooDialogueText(picked.dialect);
    setBangbooSubtitleText(picked.sub);
    setBangbooMood('happy');

    setTimeout(() => {
      setBangbooMood('idle');
    }, 4000);
  };

  // Handle Backup Import
  const handleImportBackup = (jsonString: string, mode: 'overwrite' | 'merge') => {
    const valResult = validateBackup(jsonString);
    if (!valResult.valid || !valResult.data) {
      return { valid: false, error: valResult.error || 'Schema validation error' };
    }

    try {
      const newState = importBackup(valResult.data, mode);
      importState(newState);
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err?.message || 'Failed to restore state' };
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E12] text-white flex flex-col font-['Chakra_Petch',sans-serif] selection:bg-[#F2FF00] selection:text-[#0D0E12] relative overflow-x-hidden">
      {/* 1. CRT Scanlines & Visual Texture Overlay */}
      {settings.visual.crtOverlay && (
        <div data-testid="crt-overlay" className="zzz-crt-overlay" />
      )}

      {/* 2. Top Inter-Knot OSD Header */}
      <header className="border-b-2 border-[#2E3342] bg-[#16181D] px-4 sm:px-6 py-3 flex items-center justify-between z-10 shadow-lg">
        {/* Left: OSD Status & Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-[#F2FF00] animate-pulse shadow-[0_0_8px_#F2FF00]" />
          <span className="font-mono text-xs sm:text-sm tracking-widest text-[#F2FF00] font-bold">
            REC ● INTER-KNOT OSD
          </span>
          <span className="text-xs sm:text-sm font-bold tracking-wider text-white hidden sm:inline">
            ZZZTasks // SYSTEM READY
          </span>
          <span className="bg-[#242831] px-2.5 py-1 rounded border border-[#2E3342] hidden lg:flex items-center gap-1.5 text-xs font-mono text-[#A0A5B5]">
            PROXY LICENSE: ACTIVE
          </span>
        </div>

        {/* Right: Audio Toggle & Backup Modal Buttons */}
        <div className="flex items-center space-x-2.5">
          {/* Audio Mute Toggle Button */}
          <button
            type="button"
            data-testid="audio-toggle"
            data-muted={isMuted ? 'true' : 'false'}
            onClick={toggleAudioMute}
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            title={isMuted ? 'Audio Muted' : 'Audio Active'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border font-mono text-xs tracking-wider transition-all ${
              isMuted
                ? 'bg-[#242831] border-[#4A5268] text-[#A0A5B5]'
                : 'bg-[#16181D] border-[#F2FF00] text-[#F2FF00] shadow-[0_0_10px_rgba(242,255,0,0.25)]'
            }`}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#F2FF00]" />
            )}
            <span className="hidden md:inline font-bold">
              {isMuted ? 'SFX: MUTED' : 'SFX: ON'}
            </span>
          </button>

          {/* Backup & Data Vault Modal Trigger */}
          <button
            type="button"
            data-testid="backup-modal-btn"
            onClick={() => setIsBackupOpen(true)}
            title="Open Data Management & JSON Backup"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#242831] hover:bg-[#2E3342] border border-[#2E3342] hover:border-[#00F0FF] text-[#00F0FF] rounded-sm font-mono text-xs tracking-wider transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline font-bold">DATA VAULT</span>
          </button>
        </div>
      </header>

      {/* 3. Primary Skewed Navigation Tab Bar */}
      <nav
        data-testid="tab-nav"
        className="bg-[#121418] border-b border-[#2E3342] px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto z-10"
      >
        {/* Tab 1: Hollow Commissions (Tasks) */}
        <button
          type="button"
          data-testid="tab-tasks"
          onClick={() => setActiveView('tasks')}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transform -skew-x-12 border transition-all ${
            activeView === 'tasks'
              ? 'bg-[#F2FF00] text-[#0D0E12] border-[#F2FF00] shadow-[0_0_12px_rgba(242,255,0,0.35)]'
              : 'bg-[#16181D] text-[#A0A5B5] border-[#2E3342] hover:border-[#4A5268] hover:text-white'
          }`}
        >
          <span className="inline-block transform skew-x-12 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4" />
            <span>// HOLLOW COMMISSIONS</span>
          </span>
        </button>

        {/* Tab 2: Inter-Knot Dailies */}
        <button
          type="button"
          data-testid="tab-dailies"
          onClick={() => setActiveView('dailies')}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transform -skew-x-12 border transition-all ${
            activeView === 'dailies'
              ? 'bg-[#00F0FF] text-[#0D0E12] border-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.35)]'
              : 'bg-[#16181D] text-[#A0A5B5] border-[#2E3342] hover:border-[#4A5268] hover:text-white'
          }`}
        >
          <span className="inline-block transform skew-x-12 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>// INTER-KNOT DAILIES</span>
          </span>
        </button>

        {/* Tab 3: Schedule Matrix (Calendar) */}
        <button
          type="button"
          data-testid="tab-calendar"
          onClick={() => setActiveView('calendar')}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transform -skew-x-12 border transition-all ${
            activeView === 'calendar'
              ? 'bg-[#B33BFF] text-white border-[#B33BFF] shadow-[0_0_12px_rgba(179,59,255,0.35)]'
              : 'bg-[#16181D] text-[#A0A5B5] border-[#2E3342] hover:border-[#4A5268] hover:text-white'
          }`}
        >
          <span className="inline-block transform skew-x-12 flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4" />
            <span>// SCHEDULE MATRIX</span>
          </span>
        </button>
      </nav>

      {/* 4. Main Viewport Container */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto pb-28">
        {activeView === 'tasks' && <TaskBoard />}
        {activeView === 'dailies' && <DailiesBoard />}

        {activeView === 'calendar' && (
          <div
            data-testid="calendar-view"
            className="space-y-6"
          >
            <CalendarMatrix />
          </div>
        )}
      </main>

      {/* 5. Interactive Cute Bangboo Mascot Companion Widget */}
      {settings.bangboo.enabled && (
        <div
          data-testid="bangboo-mascot"
          data-mood={bangboo.currentMood}
          onClick={handleBangbooPoke}
          className="fixed bottom-4 right-4 z-40 flex flex-col items-end cursor-pointer group select-none transition-transform hover:scale-105 active:scale-95"
          title="Click to interact with Eous!"
        >
          {/* Comic Dialogue Bubble */}
          {(bangboo.currentMood !== 'idle' || true) && (
            <div
              data-testid="bangboo-speech-bubble"
              className={`mb-2 bg-[#F2FF00] text-[#0D0E12] border-2 border-black rounded-lg px-3 py-1.5 shadow-[4px_4px_0px_#000000] relative max-w-[220px] transition-all duration-200 ${
                bangboo.currentMood !== 'idle' ? 'animate-bounce opacity-100' : 'opacity-90 group-hover:opacity-100'
              }`}
            >
              <div
                data-testid="bangboo-dialogue"
                className="font-comic font-black text-xs tracking-wider uppercase leading-tight"
              >
                {bangboo.activeDialogue?.bangbooText ||
                  (bangboo.currentMood === 'celebrating'
                    ? 'Eh-nah!! CLEARED! ★'
                    : bangboo.currentMood === 'triumphant'
                    ? 'En-nah-en!! ★★★'
                    : bangbooDialogueText)}
              </div>
              <div
                data-testid="bangboo-subtitle"
                className="font-sans text-[10px] text-black/80 leading-none mt-0.5 italic"
              >
                {bangboo.activeDialogue?.translation ||
                  (bangboo.currentMood === 'celebrating'
                    ? 'Proxy, commission successfully archived!'
                    : bangboo.currentMood === 'triumphant'
                    ? 'Proxy, all daily commissions cleared! Triumphant victory!'
                    : bangbooSubtitleText)}
              </div>
              {/* Bubble pointer caret */}
              <div className="absolute right-6 -bottom-2 w-0 h-0 border-x-4 border-x-transparent border-t-8 border-t-[#F2FF00]" />
            </div>
          )}

          {/* Scalable Bangboo SVG Mascot (Eous Avatar) */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#16181D] border-2 border-[#F2FF00] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(242,255,0,0.35)] relative overflow-hidden">
            <svg
              data-testid="bangboo-svg"
              viewBox="0 0 100 100"
              className="w-14 h-14 sm:w-16 sm:h-16 transform group-hover:rotate-6 transition-transform"
            >
              {/* Ears */}
              <rect x="25" y="10" width="14" height="26" rx="7" fill="#242831" stroke="#F2FF00" strokeWidth="3" />
              <rect x="61" y="10" width="14" height="26" rx="7" fill="#242831" stroke="#F2FF00" strokeWidth="3" />
              <rect x="28" y="16" width="8" height="14" rx="4" fill="#F2FF00" />
              <rect x="64" y="16" width="8" height="14" rx="4" fill="#F2FF00" />

              {/* Main Body */}
              <ellipse cx="50" cy="62" rx="36" ry="32" fill="#242831" stroke="#2E3342" strokeWidth="4" />

              {/* White Belly Patch */}
              <ellipse cx="50" cy="66" rx="22" ry="20" fill="#FFFFFF" />

              {/* Visor / Eye Display */}
              <rect x="26" y="44" width="48" height="20" rx="10" fill="#0D0E12" stroke="#00F0FF" strokeWidth="2" />

              {/* Eyes reacting to mood */}
              {bangboo.currentMood === 'celebrating' || bangboo.currentMood === 'happy' || bangboo.currentMood === 'triumphant' ? (
                <>
                  <path d="M 36 56 Q 40 48 44 56" fill="none" stroke="#F2FF00" strokeWidth="3" strokeLinecap="round" />
                  <path d="M 56 56 Q 60 48 64 56" fill="none" stroke="#F2FF00" strokeWidth="3" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <circle cx="40" cy="54" r="4" fill="#00F0FF" />
                  <circle cx="60" cy="54" r="4" fill="#00F0FF" />
                  <circle cx="41.5" cy="52.5" r="1.5" fill="#FFFFFF" />
                  <circle cx="61.5" cy="52.5" r="1.5" fill="#FFFFFF" />
                </>
              )}

              {/* Scarf / Tie Motif */}
              <polygon points="50,70 44,82 56,82" fill="#FF3B30" />
            </svg>

            {/* Little Hazard Ribbon Badge */}
            <div className="absolute bottom-0 inset-x-0 h-1.5 zzz-hazard-bar" />
          </div>
        </div>
      )}

      {/* 6. JSON Backup & State Persistence Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onExport={() => exportBackup(store)}
        onImport={handleImportBackup}
        stats={{
          tasksCount: tasks.length,
          dailiesCount: dailies.commissions.length,
          currentStreak: dailies.currentStreak,
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainAppShell />
    </StoreProvider>
  );
}
