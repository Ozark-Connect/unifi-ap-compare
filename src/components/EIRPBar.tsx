import type { BandData } from '../types';

interface EIRPBarProps {
  band: BandData;
  maxMw: number;
  isBest: boolean;
  compact?: boolean;
}

export function EIRPBar({ band, maxMw, isBest, compact }: EIRPBarProps) {
  const pct = maxMw > 0 ? (band.eirpMw / maxMw) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-unifi-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isBest ? 'bg-unifi-blue-bright' : 'bg-unifi-blue/60'
            }`}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
        <span className={`font-mono text-xs whitespace-nowrap ${isBest ? 'text-unifi-green font-semibold' : 'text-unifi-text'}`}>
          {band.eirpDbm} dBm
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="h-8 bg-unifi-bg rounded overflow-hidden">
        <div
          className={`h-full rounded transition-all duration-500 flex items-center px-2 ${
            isBest ? 'bg-unifi-blue-bright/30' : 'bg-unifi-blue/15'
          } ${isBest ? 'pulse-best' : ''}`}
          style={{ width: `${Math.max(pct, 8)}%` }}
        >
          <span className={`font-mono text-sm whitespace-nowrap ${isBest ? 'text-unifi-green font-semibold' : 'text-unifi-text'}`}>
            {band.eirpDbm} dBm
          </span>
        </div>
      </div>
      <div className="text-xs text-unifi-text-secondary font-mono mt-0.5">
        {band.eirpMw.toLocaleString(undefined, { maximumFractionDigits: 0 })} mW
      </div>
    </div>
  );
}

interface EIRPMiniBarProps {
  eirpDbm: number;
  eirpMw: number;
  maxMwInView: number;
}

export function EIRPMiniBar({ eirpDbm, eirpMw, maxMwInView }: EIRPMiniBarProps) {
  const pct = maxMwInView > 0 ? (eirpMw / maxMwInView) * 100 : 0;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-unifi-bg rounded-full overflow-hidden min-w-[40px]">
        <div
          className="h-full rounded-full bg-unifi-blue"
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      <span className="font-mono text-xs text-unifi-text whitespace-nowrap">
        {eirpDbm}
      </span>
    </div>
  );
}
