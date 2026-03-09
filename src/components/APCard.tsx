import { useState } from 'react';
import type { AccessPoint, BandKey, SortField } from '../types';
import { EIRPMiniBar } from './EIRPBar';

interface APCardProps {
  ap: AccessPoint;
  selected: boolean;
  onToggle: () => void;
  onDetail: () => void;
  maxEirpMw: Record<BandKey, number>;
  sort: SortField;
}

const BAND_PILL_ACTIVE: Record<BandKey, string> = {
  '2.4GHz': 'bg-band-24/20 text-band-24',
  '5GHz': 'bg-band-5/20 text-band-5',
  '6GHz': 'bg-band-6/20 text-band-6',
};

const BAND_TEXT_COLORS: Record<BandKey, string> = {
  '2.4GHz': 'text-band-24',
  '5GHz': 'text-band-5',
  '6GHz': 'text-band-6',
};

const WIFI_GEN_COLORS: Record<string, string> = {
  'Wi-Fi 7': 'bg-purple-500/20 text-purple-400',
  'Wi-Fi 6E': 'bg-band-6/20 text-band-6',
  'Wi-Fi 6': 'bg-unifi-blue/20 text-unifi-blue-bright',
  'Wi-Fi 5': 'bg-unifi-amber/20 text-unifi-amber',
  'Wi-Fi 4': 'bg-gray-500/20 text-gray-400',
};

type CardMetric = 'eirp' | 'gain' | 'txPower' | 'speed' | 'ethernet';

function sortToMetric(sort: SortField): CardMetric {
  if (sort.startsWith('gain_')) return 'gain';
  if (sort.startsWith('txPower_')) return 'txPower';
  if (sort.startsWith('maxSpeed_')) return 'speed';
  if (sort === 'ethernetMaxSpeed') return 'ethernet';
  return 'eirp';
}

function formatSpeed(mbps: number) {
  if (mbps >= 1000) return `${parseFloat((mbps / 1000).toFixed(1))} Gbps`;
  return `${mbps} Mbps`;
}

export function APCard({ ap, selected, onToggle, onDetail, maxEirpMw, sort }: APCardProps) {
  const [imgError, setImgError] = useState(false);

  const config = ap.configs[ap.activeConfig];
  const bands = config.bands;
  const bandList = config.bandList;
  const metric = sortToMetric(sort);

  return (
    <div
      className={`card-hover bg-unifi-surface rounded-xl border overflow-hidden transition-all ${
        selected ? 'border-unifi-blue shadow-lg shadow-unifi-blue/10' : 'border-unifi-border'
      }`}
    >
      {/* Top section: image + info */}
      <div className="p-4 pb-3 cursor-pointer" onClick={onDetail}>
        <div className="flex gap-3">
          <div className="w-16 h-16 flex-shrink-0 bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
            {!imgError ? (
              <img
                src={ap.iconUrl}
                alt={ap.name}
                className="w-14 h-14 object-contain"
                onError={() => setImgError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-14 h-14 flex items-center justify-center text-unifi-text-secondary text-[10px] text-center">
                {ap.abbrev}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate" title={ap.name}>
              {ap.name}
            </h3>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${WIFI_GEN_COLORS[ap.wifiGeneration]}`}>
                {ap.wifiGeneration}
              </span>
              {ap.deviceType === 'gateway' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-unifi-amber/20 text-unifi-amber font-medium">
                  Gateway + AP
                </span>
              )}
              {ap.configs.length > 1 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-unifi-surface-2 text-unifi-text-secondary font-medium">
                  {ap.configs.length} configs
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Band pills */}
        <div className="flex gap-1 mt-2.5">
          {(['2.4GHz', '5GHz', '6GHz'] as BandKey[]).map(band => (
            <span
              key={band}
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                bandList.includes(band)
                  ? BAND_PILL_ACTIVE[band]
                  : 'bg-unifi-bg/50 text-unifi-text-secondary/30'
              }`}
            >
              {band}
            </span>
          ))}
        </div>
      </div>

      {/* Metric section — adapts to sort field */}
      <div className="px-4 py-3 bg-unifi-bg/30 border-t border-unifi-border/50 space-y-2 cursor-pointer" onClick={onDetail}>
        {metric === 'eirp' && (
          <>
            <div className="text-[10px] text-unifi-text-secondary uppercase tracking-wider font-semibold" title="Effective Isotropic Radiated Power — combined TX power + antenna gain">EIRP</div>
            {bandList.map(band => {
              const data = bands[band];
              if (!data) return null;
              return (
                <div key={band} className="flex items-center gap-2">
                  <span className={`text-[10px] w-7 font-mono ${BAND_TEXT_COLORS[band]}`}>
                    {band.replace('GHz', '')}
                  </span>
                  <div className="flex-1">
                    <EIRPMiniBar
                      eirpDbm={data.eirpDbm}
                      eirpMw={data.eirpMw}
                      maxMwInView={maxEirpMw[band] || data.eirpMw}
                    />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {metric === 'gain' && (
          <>
            <div className="text-[10px] text-unifi-text-secondary uppercase tracking-wider font-semibold">Antenna Gain</div>
            {bandList.map(band => {
              const data = bands[band];
              if (!data) return null;
              return (
                <div key={band} className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono ${BAND_TEXT_COLORS[band]}`}>{band}</span>
                  <span className="font-mono text-xs text-unifi-text">{data.gain} <span className="text-unifi-text-secondary">dBi</span></span>
                </div>
              );
            })}
          </>
        )}

        {metric === 'txPower' && (
          <>
            <div className="text-[10px] text-unifi-text-secondary uppercase tracking-wider font-semibold">TX Power</div>
            {bandList.map(band => {
              const data = bands[band];
              if (!data) return null;
              return (
                <div key={band} className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono ${BAND_TEXT_COLORS[band]}`}>{band}</span>
                  <span className="font-mono text-xs text-unifi-text">{data.maxPower} <span className="text-unifi-text-secondary">dBm</span></span>
                </div>
              );
            })}
          </>
        )}

        {metric === 'speed' && (
          <>
            <div className="text-[10px] text-unifi-text-secondary uppercase tracking-wider font-semibold">Max Speed</div>
            {bandList.map(band => {
              const data = bands[band];
              if (!data) return null;
              return (
                <div key={band} className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono ${BAND_TEXT_COLORS[band]}`}>{band}</span>
                  <span className="font-mono text-xs text-unifi-text">{formatSpeed(data.maxSpeed)}</span>
                </div>
              );
            })}
          </>
        )}

        {metric === 'ethernet' && (
          <>
            <div className="text-[10px] text-unifi-text-secondary uppercase tracking-wider font-semibold">Ethernet</div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-unifi-text-secondary">Max Speed</span>
              <span className="font-mono text-xs text-unifi-text">
                {ap.ethernetMaxSpeed ? formatSpeed(ap.ethernetMaxSpeed) : <span className="text-unifi-text-secondary/30">—</span>}
              </span>
            </div>
            {ap.numberOfPorts > 2 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-unifi-text-secondary">Ports</span>
                <span className="font-mono text-xs text-unifi-text">{ap.numberOfPorts}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-unifi-border/50 flex items-center justify-between">
        <span className="text-[10px] text-unifi-text-secondary font-mono">
          {ap.sku}
        </span>
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md transition-all ${
            selected
              ? 'bg-unifi-blue text-white'
              : 'bg-unifi-surface-2 text-unifi-text-secondary hover:text-unifi-text border border-unifi-border'
          }`}
        >
          {selected ? (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              Selected
            </>
          ) : (
            '+ Compare'
          )}
        </button>
      </div>
    </div>
  );
}
