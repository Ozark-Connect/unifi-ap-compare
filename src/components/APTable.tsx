import { useState } from 'react';
import type { AccessPoint, BandKey, SortField, SortDir } from '../types';

interface APTableProps {
  devices: AccessPoint[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  onDetail: (slug: string) => void;
  sort: SortField;
  sortDir: SortDir;
  onSortChange: (s: SortField) => void;
  onSortDirChange: (d: SortDir) => void;
}

const BAND_DOT: Record<BandKey, string> = {
  '2.4GHz': 'bg-band-24',
  '5GHz': 'bg-band-5',
  '6GHz': 'bg-band-6',
};

interface ColDef {
  key: SortField | 'bands' | 'select';
  label: string;
  sortable: boolean;
  className?: string;
  title?: string;
}

const COLUMNS: ColDef[] = [
  { key: 'select', label: '', sortable: false, className: 'w-10' },
  { key: 'name', label: 'Model', sortable: true, className: 'min-w-[180px]' },
  { key: 'wifiGeneration', label: 'Gen', sortable: true, className: 'w-20' },
  { key: 'bands', label: 'Bands', sortable: false, className: 'w-20' },
  { key: 'eirp_2.4GHz', label: 'EIRP 2.4G', sortable: true, className: 'w-24', title: 'Effective Isotropic Radiated Power - combined TX power + antenna gain' },
  { key: 'eirp_5GHz', label: 'EIRP 5G', sortable: true, className: 'w-24', title: 'Effective Isotropic Radiated Power - combined TX power + antenna gain' },
  { key: 'eirp_6GHz', label: 'EIRP 6G', sortable: true, className: 'w-24', title: 'Effective Isotropic Radiated Power - combined TX power + antenna gain' },
  { key: 'gain_5GHz', label: 'Gain 5G', sortable: true, className: 'w-20' },
  { key: 'txPower_5GHz', label: 'TX 5G', sortable: true, className: 'w-20' },
  { key: 'maxSpeed_5GHz', label: 'Speed 5G', sortable: true, className: 'w-24' },
  { key: 'ethernetMaxSpeed', label: 'Ethernet', sortable: true, className: 'w-24' },
];

const GEN_COLORS: Record<string, string> = {
  'Wi-Fi 7': 'text-purple-400',
  'Wi-Fi 6E': 'text-band-6',
  'Wi-Fi 6': 'text-unifi-blue-bright',
  'Wi-Fi 5': 'text-unifi-amber',
  'Wi-Fi 4': 'text-gray-400',
};

export function APTable({ devices, selectedSlugs, onToggle, onDetail, sort, sortDir, onSortChange, onSortDirChange }: APTableProps) {
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const handleSort = (col: ColDef) => {
    if (!col.sortable) return;
    const key = col.key as SortField;
    if (sort === key) {
      onSortDirChange(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key);
      onSortDirChange('desc');
    }
  };

  const formatSpeed = (mbps: number) => {
    if (mbps >= 1000) return `${parseFloat((mbps / 1000).toFixed(1))} Gbps`;
    return `${mbps} Mbps`;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-unifi-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-unifi-surface-2">
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left font-semibold text-unifi-text-secondary uppercase tracking-wider ${col.className || ''} ${
                  col.sortable ? 'cursor-pointer hover:text-unifi-text select-none' : ''
                }`}
                onClick={() => handleSort(col)}
                title={col.title}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sort === col.key && (
                    <svg className={`w-3 h-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {devices.map(ap => {
            const isSelected = selectedSlugs.includes(ap.slug);
            return (
              <tr
                key={ap.id}
                className={`border-t border-unifi-border/50 transition-colors ${
                  isSelected ? 'bg-unifi-blue/5' : 'hover:bg-unifi-surface-2/50'
                }`}
              >
                {/* Checkbox */}
                <td className="px-3 py-2">
                  <button
                    onClick={() => onToggle(ap.slug)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      isSelected ? 'bg-unifi-blue border-unifi-blue' : 'border-unifi-border hover:border-unifi-text-secondary'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </td>

                {/* Model */}
                <td className="px-3 py-2 cursor-pointer" onClick={() => onDetail(ap.slug)}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex-shrink-0 bg-white/5 rounded flex items-center justify-center">
                      {!imgErrors.has(ap.id) ? (
                        <img
                          src={ap.iconUrl}
                          alt=""
                          className="w-7 h-7 object-contain"
                          onError={() => setImgErrors(s => new Set(s).add(ap.id))}
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[8px] text-unifi-text-secondary">{ap.abbrev.slice(0, 3)}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-unifi-text whitespace-nowrap">
                        {ap.name}
                        {ap.deviceType === 'gateway' && (
                          <span className="ml-1 text-[9px] text-unifi-amber bg-unifi-amber/15 px-1 py-0.5 rounded">GW</span>
                        )}
                      </div>
                      {ap.configs.length > 1 && (
                        <div className="text-[10px] text-unifi-text-secondary">{ap.configs.length} configs</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Gen */}
                <td className={`px-3 py-2 font-mono font-medium ${GEN_COLORS[ap.wifiGeneration] || ''}`}>
                  {ap.wifiGeneration.replace('Wi-Fi ', '')}
                </td>

                {/* Bands */}
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {(['2.4GHz', '5GHz', '6GHz'] as BandKey[]).map(band => (
                      <div
                        key={band}
                        className={`w-2 h-2 rounded-full ${
                          ap.bandList.includes(band) ? BAND_DOT[band] : 'bg-unifi-border/30'
                        }`}
                        title={band}
                      />
                    ))}
                  </div>
                </td>

                {/* EIRP per band */}
                {(['2.4GHz', '5GHz', '6GHz'] as BandKey[]).map(band => {
                  const data = ap.bands[band];
                  return (
                    <td key={band} className="px-3 py-2 font-mono">
                      {data ? (
                        <span className="text-unifi-text">{data.eirpDbm} <span className="text-unifi-text-secondary">dBm</span></span>
                      ) : (
                        <span className="text-unifi-text-secondary/30">-</span>
                      )}
                    </td>
                  );
                })}

                {/* Gain 5G */}
                <td className="px-3 py-2 font-mono">
                  {ap.bands['5GHz'] ? (
                    <span>{ap.bands['5GHz'].gain} <span className="text-unifi-text-secondary">dBi</span></span>
                  ) : <span className="text-unifi-text-secondary/30">-</span>}
                </td>

                {/* TX Power 5G */}
                <td className="px-3 py-2 font-mono">
                  {ap.bands['5GHz'] ? (
                    <span>{ap.bands['5GHz'].maxPower} <span className="text-unifi-text-secondary">dBm</span></span>
                  ) : <span className="text-unifi-text-secondary/30">-</span>}
                </td>

                {/* Speed 5G */}
                <td className="px-3 py-2 font-mono">
                  {ap.bands['5GHz'] ? (
                    <span>{formatSpeed(ap.bands['5GHz'].maxSpeed)}</span>
                  ) : <span className="text-unifi-text-secondary/30">-</span>}
                </td>

                {/* Ethernet */}
                <td className="px-3 py-2 font-mono">
                  {ap.ethernetMaxSpeed ? formatSpeed(ap.ethernetMaxSpeed) : <span className="text-unifi-text-secondary/30">-</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
