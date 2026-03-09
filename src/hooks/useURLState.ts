import { useState, useEffect, useCallback } from 'react';
import type { Market, SortField, SortDir, ViewMode, FilterState, BandKey } from '../types';
import { DEFAULT_FILTERS } from '../types';

interface URLState {
  market: Market;
  sort: SortField;
  sortDir: SortDir;
  view: ViewMode;
  compare: string[];
  filters: FilterState;
}

function parseURL(): URLState {
  const params = new URLSearchParams(window.location.search);

  const market = (params.get('market') as Market) || 'us';
  const sort = (params.get('sort') as SortField) || 'eirp_5GHz';
  const sortDir = (params.get('dir') as SortDir) || 'desc';
  const view = (params.get('view') as ViewMode) || 'grid';
  const compare = params.get('compare')?.split(',').filter(Boolean) || [];

  const filters: FilterState = { ...DEFAULT_FILTERS };
  const filterStr = params.get('filters');
  if (filterStr) {
    for (const part of filterStr.split(';')) {
      const [key, vals] = part.split(':');
      if (!vals) continue;
      const values = vals.split(',');
      switch (key) {
        case 'type':
          filters.deviceType = values as ('ap' | 'gateway')[];
          break;
        case 'band':
          filters.bands = values.map(v => v.replace('ghz', 'GHz').replace('2.4', '2.4').replace('5', '5').replace('6', '6')) as BandKey[];
          break;
        case 'wifi':
          filters.wifiGeneration = values[0] === 'all' ? [] : values.map(v => `Wi-Fi ${v}`);
          break;
        case 'form':
          filters.formFactor = values;
          break;
        case 'env':
          filters.environment = values as FilterState['environment'];
          break;
        case 'status':
          filters.status = values;
          break;
        case 'mp':
          filters.multiPort = vals === '1';
          break;
      }
    }
  }

  const search = params.get('q') || '';
  filters.search = search;

  return { market, sort, sortDir, view, compare, filters };
}

function serializeURL(state: URLState) {
  const params = new URLSearchParams();

  if (state.market !== 'us') params.set('market', state.market);
  if (state.sort !== 'eirp_5GHz') params.set('sort', state.sort);
  if (state.sortDir !== 'desc') params.set('dir', state.sortDir);
  if (state.view !== 'grid') params.set('view', state.view);
  if (state.compare.length > 0) params.set('compare', state.compare.join(','));
  if (state.filters.search) params.set('q', state.filters.search);

  // Serialize filters
  const filterParts: string[] = [];
  const f = state.filters;
  if (f.deviceType.length > 0 && !(f.deviceType.length === 2 && f.deviceType.includes('ap') && f.deviceType.includes('gateway'))) {
    filterParts.push(`type:${f.deviceType.join(',')}`);
  }
  if (f.bands.length > 0) filterParts.push(`band:${f.bands.map(b => b.toLowerCase().replace('ghz', 'ghz')).join(',')}`);
  const defaultWifi = DEFAULT_FILTERS.wifiGeneration;
  const wifiChanged = f.wifiGeneration.length !== defaultWifi.length || f.wifiGeneration.some(v => !defaultWifi.includes(v));
  if (wifiChanged) filterParts.push(`wifi:${f.wifiGeneration.length === 0 ? 'all' : f.wifiGeneration.map(v => v.replace('Wi-Fi ', '')).join(',')}`);
  if (f.formFactor.length > 0) filterParts.push(`form:${f.formFactor.join(',')}`);
  if (f.environment.length > 0) filterParts.push(`env:${f.environment.join(',')}`);
  if (f.multiPort) filterParts.push('mp:1');

  if (filterParts.length > 0) params.set('filters', filterParts.join(';'));

  const qs = params.toString();
  const url = window.location.pathname + (qs ? `?${qs}` : '');
  window.history.replaceState(null, '', url);
}

export function useURLState() {
  const [state, setState] = useState<URLState>(parseURL);

  useEffect(() => {
    serializeURL(state);
  }, [state]);

  const setMarket = useCallback((market: Market) => setState(s => ({ ...s, market })), []);
  const setSort = useCallback((sort: SortField) => setState(s => ({ ...s, sort })), []);
  const setSortDir = useCallback((sortDir: SortDir) => setState(s => ({ ...s, sortDir })), []);
  const setView = useCallback((view: ViewMode) => setState(s => ({ ...s, view })), []);
  const setCompare = useCallback((compare: string[]) => setState(s => ({ ...s, compare })), []);
  const setFilters = useCallback((filters: FilterState) => setState(s => ({ ...s, filters })), []);

  const toggleCompare = useCallback((slug: string) => {
    setState(s => {
      const idx = s.compare.indexOf(slug);
      if (idx >= 0) {
        return { ...s, compare: s.compare.filter((_, i) => i !== idx) };
      }
      if (s.compare.length >= 6) return s;
      return { ...s, compare: [...s.compare, slug] };
    });
  }, []);

  return {
    ...state,
    setMarket,
    setSort,
    setSortDir,
    setView,
    setCompare,
    setFilters,
    toggleCompare,
  };
}
