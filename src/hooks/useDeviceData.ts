import { useState, useEffect, useMemo } from 'react';
import type { AccessPoint, FilterState, SortField, SortDir, BandKey, Market } from '../types';
import { fetchDevices } from '../data/parseDevices';

// EU ETSI limits (dBm EIRP) — used to cap values for EU market
const EU_EIRP_LIMITS: Record<BandKey, number> = {
  '2.4GHz': 20,  // 100 mW
  '5GHz': 23,    // 200 mW (indoor), outdoor varies
  '6GHz': 23,    // LPI indoor
};

function applyMarket(devices: AccessPoint[], market: Market): AccessPoint[] {
  if (market === 'us') return devices;

  return devices.map(ap => {
    const newBands = { ...ap.bands };
    for (const bandKey of ap.bandList) {
      const band = newBands[bandKey];
      if (!band) continue;
      const limit = EU_EIRP_LIMITS[bandKey];
      if (band.eirpDbm > limit) {
        // Cap the EIRP at the EU limit
        const eirpDbm = limit;
        const eirpMw = Math.round(Math.pow(10, eirpDbm / 10) * 100) / 100;
        // Recalculate max power (keep gain, reduce power)
        const maxPower = Math.min(band.maxPower, eirpDbm - band.gain);
        newBands[bandKey] = { ...band, maxPower, eirpDbm, eirpMw };
      }
    }
    return { ...ap, bands: newBands };
  });
}

function applyFilters(devices: AccessPoint[], filters: FilterState): AccessPoint[] {
  return devices.filter(ap => {
    // Device type
    if (filters.deviceType.length > 0 && !filters.deviceType.includes(ap.deviceType)) return false;

    // Bands (any match)
    if (filters.bands.length > 0 && !filters.bands.some(b => ap.bandList.includes(b))) return false;

    // WiFi generation
    if (filters.wifiGeneration.length > 0 && !filters.wifiGeneration.includes(ap.wifiGeneration)) return false;

    // Form factor
    if (filters.formFactor.length > 0 && !filters.formFactor.includes(ap.formFactor)) return false;

    // Environment
    if (filters.environment.length > 0) {
      const matches = filters.environment.some(env => {
        if (env === 'indoor') return ap.indoor;
        if (env === 'outdoor') return ap.outdoor;
        if (env === 'both') return ap.indoor && ap.outdoor;
        return false;
      });
      if (!matches) return false;
    }

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const searchable = [
        ap.name, ap.abbrev, ap.sku,
        ...ap.shortnames,
        ap.wifiGeneration, ap.formFactor,
        ap.antennaConfig || '',
      ].join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
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

  const marketAdjusted = useMemo(() => applyMarket(allDevices, market), [allDevices, market]);
  const filtered = useMemo(() => applyFilters(marketAdjusted, filters), [marketAdjusted, filters]);
  const sorted = useMemo(() => applySort(filtered, sort, sortDir), [filtered, sort, sortDir]);

  return {
    devices: sorted,
    allDevices: marketAdjusted,
    totalCount: marketAdjusted.length,
    loading,
    dataSource,
  };
}
