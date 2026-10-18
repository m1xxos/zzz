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
import BangbooWidget from './components/bangboo/BangbooWidget';
import ScanlineOverlay from './components/layout/ScanlineOverlay';

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
      <ScanlineOverlay enabled={settings.visual.crtOverlay} />

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
        <BangbooWidget
          mood={bangboo.currentMood}
          activeDialogue={
            bangboo.activeDialogue || {
              id: 'current',
              bangbooText: bangbooDialogueText,
              translation: bangbooSubtitleText,
              mood: bangboo.currentMood,
            }
          }
          preferences={settings.bangboo}
          onPoke={handleBangbooPoke}
        />
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
