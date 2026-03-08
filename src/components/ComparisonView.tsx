import { useState, useMemo } from 'react';
import type { AccessPoint, BandKey } from '../types';
import { EIRPBar } from './EIRPBar';

interface ComparisonViewProps {
  devices: AccessPoint[];
  onRemove: (slug: string) => void;
  onBack: () => void;
}

const BAND_ORDER: BandKey[] = ['2.4GHz', '5GHz', '6GHz'];
const BAND_COLORS: Record<BandKey, string> = {
  '2.4GHz': 'text-unifi-amber',
  '5GHz': 'text-unifi-blue-bright',
  '6GHz': 'text-unifi-green',
};

const GEN_COLORS: Record<string, string> = {
  'Wi-Fi 7': 'text-purple-400',
  'Wi-Fi 6E': 'text-unifi-green',
  'Wi-Fi 6': 'text-unifi-blue-bright',
  'Wi-Fi 5': 'text-unifi-amber',
  'Wi-Fi 4': 'text-gray-400',
};

function formatSpeed(mbps: number) {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(1)} Gbps`;
  return `${mbps} Mbps`;
}

export function ComparisonView({ devices, onRemove, onBack }: ComparisonViewProps) {
  const [showDeltas, setShowDeltas] = useState(false);
  const [hideIdentical, setHideIdentical] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  // Calculate max EIRP per band for bar scaling
  const maxEirpMw = useMemo(() => {
    const result: Record<BandKey, number> = { '2.4GHz': 0, '5GHz': 0, '6GHz': 0 };
    for (const ap of devices) {
      for (const band of BAND_ORDER) {
        const data = ap.bands[band];
        if (data) result[band] = Math.max(result[band], data.eirpMw);
      }
    }
    return result;
  }, [devices]);

  // Build comparison rows
  const sections = useMemo(() => {
    const baseline = devices[0];

    type Row = {
      label: string;
      bandLabel?: string;
      values: (string | number | null)[];
      rawValues?: (number | null)[];
      isBest?: boolean[];
      unit?: string;
      isEirp?: boolean;
      bandKey?: BandKey;
      highlight?: 'higher' | 'lower';
    };

    type Section = {
      title: string;
      accent?: boolean;
      rows: Row[];
    };

    const sections: Section[] = [];

    // EIRP & RF Performance
    const eirpRows: Row[] = [];

    for (const band of BAND_ORDER) {
      const hasData = devices.some(d => d.bands[band]);
      if (!hasData) continue;

      const rawMw = devices.map(d => d.bands[band]?.eirpMw ?? null);
      const maxMw = Math.max(...rawMw.filter((v): v is number => v !== null));
      const allSame = rawMw.every(v => v === rawMw[0]);

      // EIRP row
      eirpRows.push({
        label: 'EIRP',
        bandLabel: band,
        values: devices.map(d => {
          const data = d.bands[band];
          if (!data) return null;
          return `${data.eirpDbm} dBm`;
        }),
        rawValues: rawMw,
        isBest: rawMw.map(v => v !== null && v === maxMw && !allSame),
        isEirp: true,
        bandKey: band,
        highlight: 'higher',
      });

      // TX Power
      const txValues = devices.map(d => d.bands[band]?.maxPower ?? null);
      eirpRows.push({
        label: 'TX Power',
        bandLabel: band,
        values: txValues.map(v => v !== null ? `${v} dBm` : null),
        rawValues: txValues,
        highlight: 'higher',
      });

      // Antenna Gain
      const gainValues = devices.map(d => d.bands[band]?.gain ?? null);
      eirpRows.push({
        label: 'Antenna Gain',
        bandLabel: band,
        values: gainValues.map(v => v !== null ? `${v} dBi` : null),
        rawValues: gainValues,
        highlight: 'higher',
      });

      // Max Speed
      const speedValues = devices.map(d => d.bands[band]?.maxSpeed ?? null);
      eirpRows.push({
        label: 'Max Speed',
        bandLabel: band,
        values: speedValues.map(v => v !== null ? formatSpeed(v) : null),
        rawValues: speedValues,
        highlight: 'higher',
      });
    }

    sections.push({ title: 'EIRP & RF Performance', accent: true, rows: eirpRows });

    // Radio details
    const radioRows: Row[] = [
      {
        label: 'Wi-Fi Generation',
        values: devices.map(d => d.wifiGeneration),
      },
      {
        label: 'Supported Bands',
        values: devices.map(d => d.bandList.join(', ')),
      },
      {
        label: 'Band Steering',
        values: devices.map(d => d.features.bandsteer ? 'Yes' : 'No'),
      },
      {
        label: 'OFDMA',
        values: devices.map(d => d.features.ofdma ? 'Yes' : 'No'),
      },
    ];
    sections.push({ title: 'Radio', rows: radioRows });

    // Network & Connectivity
    const netRows: Row[] = [
      {
        label: 'Ethernet Speed',
        values: devices.map(d => d.ethernetMaxSpeed ? formatSpeed(d.ethernetMaxSpeed) : null),
        rawValues: devices.map(d => d.ethernetMaxSpeed || null),
        highlight: 'higher',
      },
      {
        label: 'Ports',
        values: devices.map(d => d.numberOfPorts > 0 ? String(d.numberOfPorts) : null),
      },
    ];
    sections.push({ title: 'Network & Connectivity', rows: netRows });

    // Physical
    const physRows: Row[] = [
      {
        label: 'Form Factor',
        values: devices.map(d => d.formFactor),
      },
      {
        label: 'Environment',
        values: devices.map(d => {
          if (d.indoor && d.outdoor) return 'Indoor / Outdoor';
          if (d.outdoor) return 'Outdoor';
          return 'Indoor';
        }),
      },
      {
        label: 'Primary Role',
        values: devices.map(d => d.deviceType === 'gateway' ? 'Router / Gateway' : 'Access Point'),
      },
    ];
    sections.push({ title: 'Physical', rows: physRows });

    // Filter identical rows if toggled
    if (hideIdentical) {
      for (const section of sections) {
        section.rows = section.rows.filter(row => {
          const nonNull = row.values.filter(v => v !== null);
          if (nonNull.length <= 1) return true;
          return !nonNull.every(v => v === nonNull[0]);
        });
      }
    }

    return sections;
  }, [devices, hideIdentical]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-unifi-text-secondary hover:text-unifi-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to grid
        </button>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-unifi-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDeltas}
              onChange={e => setShowDeltas(e.target.checked)}
              className="accent-unifi-blue"
            />
            Show deltas
          </label>
          <label className="flex items-center gap-1.5 text-xs text-unifi-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideIdentical}
              onChange={e => setHideIdentical(e.target.checked)}
              className="accent-unifi-blue"
            />
            Hide identical
          </label>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl border border-unifi-border">
        <table className="w-full">
          {/* Device headers */}
          <thead>
            <tr className="bg-unifi-surface-2">
              <th className="sticky left-0 z-10 bg-unifi-surface-2 min-w-[140px] md:min-w-[180px] p-3" />
              {devices.map(ap => (
                <th key={ap.slug} className="p-3 min-w-[150px] md:min-w-[180px] text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative group">
                      <button
                        onClick={() => onRemove(ap.slug)}
                        className="absolute -top-1 -right-1 bg-unifi-surface-2 border border-unifi-border rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-unifi-text-secondary hover:text-unifi-red z-10"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="w-14 h-14 bg-white/5 rounded-lg flex items-center justify-center">
                        {!imgErrors.has(ap.id) ? (
                          <img
                            src={ap.iconUrl}
                            alt={ap.name}
                            className="w-12 h-12 object-contain"
                            onError={() => setImgErrors(s => new Set(s).add(ap.id))}
                          />
                        ) : (
                          <span className="text-[10px] text-unifi-text-secondary">{ap.abbrev}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-unifi-text">{ap.name}</div>
                      {ap.antennaConfig && (
                        <div className="text-[10px] text-unifi-text-secondary">{ap.antennaConfig}</div>
                      )}
                      {ap.deviceType === 'gateway' && (
                        <span className="text-[9px] bg-unifi-amber/20 text-unifi-amber px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                          Gateway + AP
                        </span>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sections.map((section, si) => (
              <>
                {/* Section header */}
                {section.rows.length > 0 && (
                  <tr key={`section-${si}`}>
                    <td
                      colSpan={devices.length + 1}
                      className={`px-3 py-2 text-[10px] uppercase tracking-wider font-bold ${
                        section.accent
                          ? 'bg-unifi-blue/10 text-unifi-blue-bright border-l-2 border-l-unifi-blue'
                          : 'bg-unifi-surface-2/50 text-unifi-text-secondary'
                      }`}
                    >
                      {section.title}
                    </td>
                  </tr>
                )}

                {section.rows.map((row, ri) => {
                  const bestIdx = row.rawValues && row.highlight === 'higher'
                    ? row.rawValues.reduce<number[]>((acc, v, i) => {
                        if (v === null) return acc;
                        const max = Math.max(...row.rawValues!.filter((x): x is number => x !== null));
                        const allSame = row.rawValues!.filter((x): x is number => x !== null).every(x => x === max);
                        if (v === max && !allSame) acc.push(i);
                        return acc;
                      }, [])
                    : [];

                  return (
                    <tr key={`row-${si}-${ri}`} className="border-t border-unifi-border/30">
                      {/* Label */}
                      <td className="sticky left-0 z-10 bg-unifi-bg px-3 py-2 text-xs text-unifi-text-secondary whitespace-nowrap">
                        <div>{row.label}</div>
                        {row.bandLabel && (
                          <div className={`text-[10px] font-mono ${BAND_COLORS[row.bandLabel as BandKey] || ''}`}>
                            {row.bandLabel}
                          </div>
                        )}
                      </td>

                      {/* Values */}
                      {devices.map((ap, di) => {
                        const value = row.values[di];
                        const isBest = row.isBest?.[di] || bestIdx.includes(di);

                        // EIRP rows get special bar treatment
                        if (row.isEirp && row.bandKey) {
                          const data = ap.bands[row.bandKey];
                          return (
                            <td key={ap.slug} className="px-3 py-2 min-w-[150px]">
                              {data ? (
                                <EIRPBar
                                  band={data}
                                  maxMw={maxEirpMw[row.bandKey]}
                                  isBest={isBest}
                                />
                              ) : (
                                <span className="text-unifi-text-secondary/30 text-xs">—</span>
                              )}
                              {showDeltas && di > 0 && data && devices[0].bands[row.bandKey] && (
                                <Delta current={data.eirpDbm} baseline={devices[0].bands[row.bandKey]!.eirpDbm} unit="dBm" />
                              )}
                            </td>
                          );
                        }

                        return (
                          <td key={ap.slug} className="px-3 py-2">
                            <span className={`text-xs font-mono ${
                              isBest ? 'text-unifi-green font-semibold' : value !== null ? 'text-unifi-text' : 'text-unifi-text-secondary/30'
                            }`}>
                              {value ?? '—'}
                            </span>
                            {showDeltas && di > 0 && row.rawValues && row.rawValues[di] !== null && row.rawValues[0] !== null && (
                              <Delta current={row.rawValues[di]!} baseline={row.rawValues[0]!} unit="" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Delta({ current, baseline, unit }: { current: number; baseline: number; unit: string }) {
  const diff = current - baseline;
  if (diff === 0) return <div className="text-[10px] text-unifi-text-secondary/40 font-mono">0</div>;
  const isPositive = diff > 0;
  return (
    <div className={`text-[10px] font-mono ${isPositive ? 'text-unifi-green' : 'text-unifi-red'}`}>
      {isPositive ? '+' : ''}{diff}{unit ? ` ${unit}` : ''}
    </div>
  );
}
