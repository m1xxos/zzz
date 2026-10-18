import React, { useState, useRef } from 'react';
import { X, Download, Upload, AlertTriangle, CheckCircle, Database, FileText, RefreshCw, Copy } from 'lucide-react';

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => string; // Returns raw JSON backup string
  onImport: (jsonString: string, mode: 'overwrite' | 'merge') => { valid: boolean; error?: string };
  stats?: {
    tasksCount: number;
    dailiesCount: number;
    currentStreak: number;
  };
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onExport,
  onImport,
  stats,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Export File Download
  const handleExport = () => {
    try {
      const dataStr = onExport();
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `zzztasks-backup-${todayStr}.json`;

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessAlert(`BACKUP EXPORTED // ARCHIVE SAVED AS: ${filename}`);
      setErrorAlert(null);
    } catch (err: any) {
      setErrorAlert(`EXPORT FAILED: ${err?.message || 'Unknown error'}`);
    }
  };

  // Handle Copy to Clipboard
  const handleCopyClipboard = async () => {
    try {
      const dataStr = onExport();
      await navigator.clipboard.writeText(dataStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Handle File Upload Change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonText(content);
      setErrorAlert(null);
    };
    reader.onerror = () => {
      setErrorAlert('FILE READ ERROR // UNABLE TO PROCESS ARCHIVE');
    };
    reader.readAsText(file);
  };

  // Handle Import Submit
  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert(null);
    setSuccessAlert(null);

    const raw = jsonText.trim();
    if (!raw) {
      setErrorAlert('SCHEMA VALIDATION FAILED: Backup payload cannot be empty.');
      return;
    }

    // Call onImport validation handler
    const result = onImport(raw, importMode);
    if (!result.valid) {
      setErrorAlert(result.error || 'INVALID BACKUP SCHEMA: Data does not match ZZZTasks schema.');
    } else {
      setSuccessAlert('RESTORE COMPLETE // SYSTEM STATE RESTORED SUCCESSFULLY');
      setJsonText('');
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      {/* Modal Card */}
      <div
        data-testid="backup-modal"
        className="relative w-full max-w-2xl bg-[#16181D] border-2 border-[#2E3342] zzz-corner-cut shadow-2xl overflow-hidden flex flex-col font-['Chakra_Petch',sans-serif]"
      >
        {/* Top Caution Hazard Tape Bar */}
        <div className="h-2 zzz-hazard-bar w-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2E3342] bg-[#1A1D24]">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#00F0FF]" />
            <div>
              <span className="font-mono text-xs tracking-widest text-[#00F0FF] uppercase font-bold block">
                INTER-KNOT DATA VAULT // ARCHIVE MANAGEMENT
              </span>
              <span className="text-[11px] text-[#A0A5B5] font-sans">
                JSON Backup Export & Disaster Recovery
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#A0A5B5] hover:text-[#FF3B30] hover:bg-[#242831] p-1.5 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Error Alert Notice */}
          {errorAlert && (
            <div
              data-testid="backup-error-alert"
              className="flex items-start gap-3 p-3.5 bg-[#FF3B30]/15 border-2 border-[#FF3B30] text-[#FF3B30] text-xs font-mono rounded-sm animate-glitch"
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold uppercase tracking-wider">CORRUPTION DETECTED // RESTORE REJECTED</div>
                <div className="mt-0.5 font-sans text-white/90">{errorAlert}</div>
              </div>
            </div>
          )}

          {/* Success Alert Notice */}
          {successAlert && (
            <div className="flex items-start gap-3 p-3.5 bg-[#F2FF00]/15 border-2 border-[#F2FF00] text-[#F2FF00] text-xs font-mono rounded-sm">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold uppercase tracking-wider">SYSTEM READY // SYNCHRONIZED</div>
                <div className="mt-0.5 font-sans text-white/90">{successAlert}</div>
              </div>
            </div>
          )}

          {/* 1. SECTION: EXPORT BACKUP */}
          <div className="bg-[#0D0E12] border border-[#2E3342] p-4 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#F2FF00]" />
                <h3 className="text-sm font-bold text-white tracking-wider uppercase font-mono">
                  1. EXPORT LOCAL ARCHIVE
                </h3>
              </div>

              {stats && (
                <div className="text-[11px] font-mono text-[#A0A5B5]">
                  <span>TASKS: {stats.tasksCount}</span> | <span>DAILIES: {stats.dailiesCount}</span> | <span>STREAK: {stats.currentStreak}d</span>
                </div>
              )}
            </div>

            <p className="text-xs text-[#A0A5B5] font-sans">
              Download complete application state as a timestamped JSON file.
              All commissions, streaks, settings, and mascot preferences are serialized.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {/* Export Button */}
              <button
                type="button"
                data-testid="export-backup-btn"
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-[#F2FF00] hover:bg-[#CBE300] text-[#0D0E12] font-mono font-bold text-xs tracking-wider uppercase rounded-sm border border-[#F2FF00] shadow-[0_0_10px_rgba(242,255,0,0.3)] transition-all"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>DOWNLOAD BACKUP (.JSON)</span>
              </button>

              {/* Copy JSON Button */}
              <button
                type="button"
                onClick={handleCopyClipboard}
                className="flex items-center gap-2 px-3 py-2 bg-[#242831] hover:bg-[#2E3342] text-white font-mono text-xs tracking-wider uppercase rounded-sm border border-[#2E3342] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'COPIED TO CLIPBOARD!' : 'COPY RAW JSON'}</span>
              </button>
            </div>
          </div>

          {/* 2. SECTION: RESTORE / IMPORT BACKUP */}
          <form onSubmit={handleImportSubmit} className="bg-[#0D0E12] border border-[#2E3342] p-4 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#00F0FF]" />
                <h3 className="text-sm font-bold text-white tracking-wider uppercase font-mono">
                  2. RESTORE / IMPORT ARCHIVE
                </h3>
              </div>

              {/* Import Mode Radio Selectors */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#A0A5B5] hover:text-white">
                  <input
                    type="radio"
                    name="importMode"
                    value="overwrite"
                    checked={importMode === 'overwrite'}
                    onChange={() => setImportMode('overwrite')}
                    className="accent-[#F2FF00]"
                  />
                  <span>OVERWRITE</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[#A0A5B5] hover:text-white">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="accent-[#00F0FF]"
                  />
                  <span>MERGE</span>
                </label>
              </div>
            </div>

            <p className="text-xs text-[#A0A5B5] font-sans">
              Upload a previously exported `.json` file or paste raw JSON text below.
              The payload will be verified against the ZZZTasks 1.0.0 schema before execution.
            </p>

            {/* File Upload Option */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                data-testid="import-file-input"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#16181D] hover:bg-[#242831] text-[#00F0FF] border border-[#00F0FF]/40 rounded-sm font-mono text-xs tracking-wider uppercase transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>SELECT .JSON ARCHIVE FILE...</span>
              </button>
              <span className="text-[11px] font-mono text-[#5C6275]">OR PASTE BELOW:</span>
            </div>

            {/* JSON Textarea */}
            <div className="space-y-1">
              <textarea
                data-testid="import-json-textarea"
                rows={4}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  if (errorAlert) setErrorAlert(null);
                }}
                placeholder="PASTE RAW BACKUP JSON DATA HERE..."
                className="w-full bg-[#16181D] border border-[#2E3342] focus:border-[#00F0FF] text-white p-3 text-xs font-mono rounded-sm focus:outline-none focus:ring-1 focus:ring-[#00F0FF] transition-colors resize-none placeholder:text-[#5C6275]"
              />
            </div>

            {/* Submit Import Action Button */}
            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                data-testid="import-backup-btn"
                className="flex items-center gap-2 px-5 py-2 bg-[#00F0FF] hover:bg-[#00C2CF] text-[#0D0E12] font-mono font-bold text-xs tracking-wider uppercase rounded-sm border border-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.35)] transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>RESTORE SYSTEM STATE // EXECUTE</span>
              </button>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#2E3342] bg-[#1A1D24] text-[11px] font-mono text-[#A0A5B5]">
          <span>PROXY PROTOCOL: 0xZZZ_ARCHIVE_1.0</span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase hover:text-white transition-colors"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupModal;
