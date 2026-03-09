import { useState } from 'react';
import type { AccessPoint } from '../types';

interface ComparisonTrayProps {
  selectedDevices: AccessPoint[];
  onRemove: (slug: string) => void;
  onClear: () => void;
  onCompare: () => void;
}

export function ComparisonTray({ selectedDevices, onRemove, onClear, onCompare }: ComparisonTrayProps) {
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  if (selectedDevices.length === 0) return null;

  return (
    <>
      {/* Desktop tray */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40 tray-enter">
        <div className="max-w-[1600px] mx-auto px-4 pb-4">
          <div className="bg-unifi-surface-2 border border-unifi-border rounded-xl shadow-2xl p-3 flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto">
              {selectedDevices.map(ap => (
                <div
                  key={ap.slug}
                  className="flex items-center gap-2 bg-unifi-surface rounded-lg px-2.5 py-1.5 flex-shrink-0"
                >
                  <div className="w-7 h-7 bg-white/5 rounded flex items-center justify-center">
                    {!imgErrors.has(ap.id) ? (
                      <img
                        src={ap.iconUrl}
                        alt=""
                        className="w-6 h-6 object-contain"
                        onError={() => setImgErrors(s => new Set(s).add(ap.id))}
                      />
                    ) : null}
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">{ap.abbrev || ap.name}</span>
                  <button
                    onClick={() => onRemove(ap.slug)}
                    className="text-unifi-text-secondary hover:text-unifi-red transition-colors p-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onClear}
                className="text-xs text-unifi-text-secondary hover:text-unifi-red transition-colors px-2 py-1"
              >
                Clear
              </button>
              <button
                onClick={onCompare}
                className="bg-unifi-blue hover:bg-unifi-blue-bright text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Compare ({selectedDevices.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={onCompare}
        className="md:hidden fixed bottom-6 right-6 z-40 tray-enter bg-unifi-blue hover:bg-unifi-blue-bright text-white shadow-2xl rounded-full px-5 py-3 flex items-center gap-2 text-sm font-semibold transition-all active:scale-95"
      >
        Compare ({selectedDevices.length})
      </button>
    </>
  );
}
