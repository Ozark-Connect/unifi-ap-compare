import { useState, useEffect, useMemo } from 'react';
import type { AccessPoint, FilterState, SortField, SortDir, BandKey, Market } from '../types';

// EU ETSI EIRP limits (dBm) — using max allowed (DFS outdoor where applicable)
const EU_EIRP_LIMITS: Record<BandKey, number> = {
  '2.4GHz': 20,  // 100 mW ETSI
  '5GHz': 30,    // 1 W UNII-2e DFS (5470-5725 MHz)
  '6GHz': 23,    // 200 mW LPI indoor
};

function capBandsForEU(bands: Partial<Record<BandKey, import('../types').BandData>>): Partial<Record<BandKey, import('../types').BandData>> {
  const newBands = { ...bands };
  for (const [bandKey, band] of Object.entries(newBands) as [BandKey, import('../types').BandData][]) {
    if (!band) continue;
    const limit = EU_EIRP_LIMITS[bandKey];
    if (band.eirpDbm > limit) {
      const eirpDbm = limit;
      const eirpMw = Math.round(Math.pow(10, eirpDbm / 10) * 100) / 100;
      const maxPower = Math.min(band.maxPower, eirpDbm - band.gain);
      newBands[bandKey] = { ...band, maxPower, eirpDbm, eirpMw };
    }
  }
  return newBands;
}

function applyMarketFilter(devices: AccessPoint[], market: Market): AccessPoint[] {
  return devices
    // Filter by market availability
    .filter(ap => {
      if (market === 'us') return ap.market === 'us' || ap.market === 'both';
      if (market === 'eu') return ap.market === 'eu' || ap.market === 'both';
      return true;
    })
    // Apply EU caps if needed
    .map(ap => {
      if (market !== 'eu') return ap;
      return {
        ...ap,
        bands: capBandsForEU(ap.bands),
        configs: ap.configs.map(c => ({
          ...c,
          bands: capBandsForEU(c.bands),
        })),
      };
    });
}

function applyFilters(devices: AccessPoint[], filters: FilterState): AccessPoint[] {
  return devices.filter(ap => {
    if (filters.deviceType.length > 0 && !filters.deviceType.includes(ap.deviceType)) return false;

    // Check bands across ALL configs (any config having the band counts)
    if (filters.bands.length > 0) {
      const allBands = new Set(ap.configs.flatMap(c => c.bandList));
      if (!filters.bands.some(b => allBands.has(b))) return false;
    }

    if (filters.wifiGeneration.length > 0 && !filters.wifiGeneration.includes(ap.wifiGeneration)) return false;
    if (filters.formFactor.length > 0 && !filters.formFactor.includes(ap.formFactor)) return false;

    if (filters.environment.length > 0) {
      const matches = filters.environment.some(env => {
        if (env === 'indoor') return ap.indoor;
        if (env === 'outdoor') return ap.outdoor;
        if (env === 'both') return ap.indoor && ap.outdoor;
        return false;
      });
      if (!matches) return false;
    }

    if (filters.multiPort && ap.numberOfPorts <= 1) return false;

    if (filters.search) {
      const words = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
      const searchable = [
        ap.name, ap.abbrev, ap.sku,
        ...ap.shortnames,
        ap.wifiGeneration, ap.formFactor,
      ].join(' ').toLowerCase();
      if (!words.every(w => searchable.includes(w))) return false;
    }

    return true;
  });
}

function getBandValue(ap: AccessPoint, band: BandKey, field: 'eirpDbm' | 'gain' | 'maxPower' | 'maxSpeed'): number {
  const data = ap.bands[band];
  if (!data) return -Infinity;
  return data[field];
}

function applySort(devices: AccessPoint[], sort: SortField, dir: SortDir): AccessPoint[] {
  const sorted = [...devices];
  sorted.sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    if (sort === 'name') {
      aVal = a.name;
      bVal = b.name;
    } else if (sort === 'wifiGeneration') {
      const genOrder = { 'Wi-Fi 4': 4, 'Wi-Fi 5': 5, 'Wi-Fi 6': 6, 'Wi-Fi 6E': 6.5, 'Wi-Fi 7': 7 };
      aVal = genOrder[a.wifiGeneration] || 0;
      bVal = genOrder[b.wifiGeneration] || 0;
    } else if (sort === 'ethernetMaxSpeed') {
      aVal = a.ethernetMaxSpeed;
      bVal = b.ethernetMaxSpeed;
    } else if (sort.startsWith('eirp_')) {
      const band = sort.replace('eirp_', '') as BandKey;
      aVal = getBandValue(a, band, 'eirpDbm');
      bVal = getBandValue(b, band, 'eirpDbm');
    } else if (sort.startsWith('gain_')) {
      const band = sort.replace('gain_', '') as BandKey;
      aVal = getBandValue(a, band, 'gain');
      bVal = getBandValue(b, band, 'gain');
    } else if (sort.startsWith('txPower_')) {
      const band = sort.replace('txPower_', '') as BandKey;
      aVal = getBandValue(a, band, 'maxPower');
      bVal = getBandValue(b, band, 'maxPower');
    } else if (sort.startsWith('maxSpeed_')) {
      const band = sort.replace('maxSpeed_', '') as BandKey;
      aVal = getBandValue(a, band, 'maxSpeed');
      bVal = getBandValue(b, band, 'maxSpeed');
    } else {
      return 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    const diff = (aVal as number) - (bVal as number);
    return dir === 'asc' ? diff : -diff;
  });
  return sorted;
}

export function useDeviceData(market: Market, filters: FilterState, sort: SortField, sortDir: SortDir) {
  const [allDevices, setAllDevices] = useState<AccessPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'fallback'>('live');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const resp = await fetch('https://static.ui.com/fingerprint/ui/public.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const { parseDevices } = await import('../data/parseDevices');
        if (!cancelled) {
          setAllDevices(parseDevices(json));
          setDataSource('live');
        }
      } catch {
        const fallback = await import('../data/fallback.json');
        const { parseDevices } = await import('../data/parseDevices');
        if (!cancelled) {
          setAllDevices(parseDevices(fallback.default || fallback));
          setDataSource('fallback');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const marketFiltered = useMemo(() => applyMarketFilter(allDevices, market), [allDevices, market]);
  const filtered = useMemo(() => applyFilters(marketFiltered, filters), [marketFiltered, filters]);
  const sorted = useMemo(() => applySort(filtered, sort, sortDir), [filtered, sort, sortDir]);

  return {
    devices: sorted,
    allDevices: marketFiltered,
    totalCount: marketFiltered.length,
    loading,
    dataSource,
  };
}
