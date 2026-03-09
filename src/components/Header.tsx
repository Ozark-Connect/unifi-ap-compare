import type { Market } from '../types';

interface HeaderProps {
  market: Market;
  onMarketChange: (m: Market) => void;
  dataSource: 'live' | 'fallback';
}

export function Header({ market, onMarketChange, dataSource }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-unifi-surface/95 backdrop-blur-sm border-b border-unifi-border">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <h1 className="text-lg font-bold tracking-tight whitespace-nowrap">
            <a href="." className="hover:opacity-80 transition-opacity">
              <span className="text-unifi-blue-bright">UniFi</span> AP Compare
            </a>
          </h1>
          {dataSource === 'fallback' && (
            <span className="text-[10px] bg-unifi-amber/20 text-unifi-amber px-1.5 py-0.5 rounded hidden sm:inline">
              Cached Data
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-unifi-text-secondary hidden sm:inline">Market:</span>
          <div className="flex bg-unifi-bg rounded-lg p-0.5">
            <button
              onClick={() => onMarketChange('us')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                market === 'us'
                  ? 'bg-unifi-blue text-white shadow'
                  : 'text-unifi-text-secondary hover:text-unifi-text'
              }`}
            >
              US
            </button>
            <button
              onClick={() => onMarketChange('eu')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                market === 'eu'
                  ? 'bg-unifi-blue text-white shadow'
                  : 'text-unifi-text-secondary hover:text-unifi-text'
              }`}
            >
              EU
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
