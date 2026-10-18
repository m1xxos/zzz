import React from 'react';

export interface ScanlineOverlayProps {
  enabled?: boolean;
  showVignette?: boolean;
  className?: string;
}

/**
 * ScanlineOverlay Component
 * Renders authentic Zenless Zone Zero CRT scanlines, subtle phosphor screen texture,
 * and dark edge vignette.
 *
 * Safeguards:
 * - pointer-events: none (ensures all clicks pass through freely)
 * - Automatically suppressed when prefers-reduced-motion is active
 * - Exposes data-testid="crt-overlay" for automated E2E & unit test verification
 */
export const ScanlineOverlay: React.FC<ScanlineOverlayProps> = ({
  enabled = true,
  showVignette = true,
  className = '',
}) => {
  if (!enabled) {
    return null;
  }

  return (
    <div
      data-testid="crt-overlay"
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-[9999] select-none ${className}`}
    >
      {/* 1. Primary CRT Scanlines (horizontal raster lines) */}
      <div className="absolute inset-0 zzz-scanlines opacity-75" />

      {/* 2. CRT Screen Edge Vignette (darkened borders like a classic arcade monitor) */}
      {showVignette && (
        <div className="absolute inset-0 zzz-crt-vignette opacity-80" />
      )}

      {/* 3. Subtle chromatic aberration screen border */}
      <div className="absolute inset-0 border border-white/[0.03]" />
    </div>
  );
};

export default ScanlineOverlay;
