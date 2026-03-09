import { useState, useRef, useEffect } from 'react';
import type { FilterState, BandKey, SortField, SortDir, ViewMode, AccessPoint } from '../types';
import { DEFAULT_FILTERS } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  sort: SortField;
  sortDir: SortDir;
  onSortChange: (s: SortField) => void;
  onSortDirChange: (d: SortDir) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  totalCount: number;
  filteredCount: number;
  allDevices: AccessPoint[];
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'eirp_5GHz', label: 'EIRP 5 GHz' },
  { value: 'eirp_2.4GHz', label: 'EIRP 2.4 GHz' },
  { value: 'eirp_6GHz', label: 'EIRP 6 GHz' },
  { value: 'gain_5GHz', label: 'Gain 5 GHz' },
  { value: 'gain_2.4GHz', label: 'Gain 2.4 GHz' },
  { value: 'gain_6GHz', label: 'Gain 6 GHz' },
  { value: 'txPower_5GHz', label: 'TX Power 5 GHz' },
  { value: 'txPower_2.4GHz', label: 'TX Power 2.4 GHz' },
  { value: 'txPower_6GHz', label: 'TX Power 6 GHz' },
  { value: 'maxSpeed_5GHz', label: 'Max Speed 5 GHz' },
  { value: 'maxSpeed_2.4GHz', label: 'Max Speed 2.4 GHz' },
  { value: 'maxSpeed_6GHz', label: 'Max Speed 6 GHz' },
  { value: 'wifiGeneration', label: 'Wi-Fi Gen' },
  { value: 'name', label: 'Name' },
  { value: 'ethernetMaxSpeed', label: 'Ethernet Speed' },
];

const WIFI_GENS = ['Wi-Fi 7', 'Wi-Fi 6E', 'Wi-Fi 6', 'Wi-Fi 5', 'Wi-Fi 4'];
const BANDS: BandKey[] = ['2.4GHz', '5GHz', '6GHz'];
const ENVIRONMENTS = [
  { value: 'indoor' as const, label: 'Indoor' },
  { value: 'outdoor' as const, label: 'Outdoor' },
];

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-all ${
          selected.length > 0
            ? 'border-unifi-blue bg-unifi-blue/10 text-unifi-blue-bright'
            : 'border-unifi-border bg-unifi-surface hover:border-unifi-text-secondary text-unifi-text-secondary'
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="bg-unifi-blue text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
            {selected.length}
          </span>
        )}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-unifi-surface-2 border border-unifi-border rounded-lg shadow-xl z-50 py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-unifi-blue/10 transition-colors text-left"
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                selected.includes(opt.value)
                  ? 'bg-unifi-blue border-unifi-blue'
                  : 'border-unifi-border'
              }`}>
                {selected.includes(opt.value) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterBar({
  filters, onFiltersChange,
  sort, sortDir, onSortChange, onSortDirChange,
  view, onViewChange,
  totalCount, filteredCount, allDevices,
}: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const formFactors = [...new Set(allDevices.map(d => d.formFactor))].sort();

  const wifiDefault = DEFAULT_FILTERS.wifiGeneration;
  const wifiChanged = filters.wifiGeneration.length !== wifiDefault.length || filters.wifiGeneration.some(v => !wifiDefault.includes(v));
  const hasActiveFilters = filters.bands.length > 0 ||
    wifiChanged ||
    filters.formFactor.length > 0 ||
    filters.environment.length > 0 ||
    filters.search !== '' ||
    (filters.deviceType.length > 0 && filters.deviceType.length < 2);

  const filterControls = (
    <>
      <MultiSelect
        label="Device Type"
        options={[
          { value: 'ap', label: 'Standalone AP' },
          { value: 'gateway', label: 'Gateway (built-in AP)' },
        ]}
        selected={filters.deviceType}
        onChange={vals => onFiltersChange({ ...filters, deviceType: vals as FilterState['deviceType'] })}
      />
      <MultiSelect
        label="Band"
        options={BANDS.map(b => ({ value: b, label: b }))}
        selected={filters.bands}
        onChange={vals => onFiltersChange({ ...filters, bands: vals as BandKey[] })}
      />
      <MultiSelect
        label="Wi-Fi Gen"
        options={WIFI_GENS.map(g => ({ value: g, label: g }))}
        selected={filters.wifiGeneration}
        onChange={vals => onFiltersChange({ ...filters, wifiGeneration: vals })}
      />
      <MultiSelect
        label="Form Factor"
        options={formFactors.map(f => ({ value: f, label: f }))}
        selected={filters.formFactor}
        onChange={vals => onFiltersChange({ ...filters, formFactor: vals })}
      />
      <MultiSelect
        label="Environment"
        options={ENVIRONMENTS}
        selected={filters.environment}
        onChange={vals => onFiltersChange({ ...filters, environment: vals as FilterState['environment'] })}
      />
    </>
  );

  return (
    <div className="space-y-3">
      {/* Search + filter toggle (mobile) */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-unifi-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search model, SKU..."
            value={filters.search}
            onChange={e => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-8 py-2 text-sm bg-unifi-surface border border-unifi-border rounded-lg text-unifi-text placeholder:text-unifi-text-secondary/50 focus:outline-none focus:border-unifi-blue transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-unifi-text-secondary hover:text-unifi-text transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-xs bg-unifi-surface border border-unifi-border rounded-lg text-unifi-text-secondary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-unifi-blue" />}
        </button>
      </div>

      {/* Desktop filter row */}
      <div className="hidden lg:flex flex-wrap gap-2 items-center">
        {filterControls}
        {hasActiveFilters && (
          <button
            onClick={() => onFiltersChange({ ...DEFAULT_FILTERS })}
            className="text-xs text-unifi-text-secondary hover:text-unifi-red transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Mobile filter drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-unifi-surface-2 rounded-t-2xl p-4 pb-8 space-y-3 max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Filters</span>
              <button onClick={() => setMobileOpen(false)} className="text-unifi-text-secondary p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterControls}
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => onFiltersChange({ ...DEFAULT_FILTERS })}
                className="text-xs text-unifi-red"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 lg:hidden">
          {filters.bands.map(b => (
            <span key={b} className="inline-flex items-center gap-1 text-[10px] bg-unifi-blue/15 text-unifi-blue-bright px-2 py-1 rounded-full">
              {b}
              <button onClick={() => onFiltersChange({ ...filters, bands: filters.bands.filter(v => v !== b) })} className="hover:text-white">×</button>
            </span>
          ))}
          {wifiChanged && filters.wifiGeneration.map(g => (
            <span key={g} className="inline-flex items-center gap-1 text-[10px] bg-unifi-blue/15 text-unifi-blue-bright px-2 py-1 rounded-full">
              {g}
              <button onClick={() => onFiltersChange({ ...filters, wifiGeneration: filters.wifiGeneration.filter(v => v !== g) })} className="hover:text-white">×</button>
            </span>
          ))}
          {filters.formFactor.map(f => (
            <span key={f} className="inline-flex items-center gap-1 text-[10px] bg-unifi-blue/15 text-unifi-blue-bright px-2 py-1 rounded-full">
              {f}
              <button onClick={() => onFiltersChange({ ...filters, formFactor: filters.formFactor.filter(v => v !== f) })} className="hover:text-white">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Sort + view toggle + count */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-unifi-text-secondary">Sort:</label>
          <select
            value={sort}
            onChange={e => onSortChange(e.target.value as SortField)}
            className="text-xs bg-unifi-surface border border-unifi-border rounded-md px-2 py-1.5 text-unifi-text focus:outline-none focus:border-unifi-blue"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => onSortDirChange(sortDir === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 text-unifi-text-secondary hover:text-unifi-text transition-colors"
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${sortDir === 'asc' ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-unifi-text-secondary">
            {filteredCount} of {totalCount}
          </span>
          <div className="hidden sm:flex bg-unifi-bg rounded-lg p-0.5">
            <button
              onClick={() => onViewChange('grid')}
              className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-unifi-surface-2 text-unifi-text' : 'text-unifi-text-secondary'}`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zM9 2.5A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zM1 10.5A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zM9 10.5A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z"/>
              </svg>
            </button>
            <button
              onClick={() => onViewChange('table')}
              className={`p-1.5 rounded-md transition-all ${view === 'table' ? 'bg-unifi-surface-2 text-unifi-text' : 'text-unifi-text-secondary'}`}
              title="Table view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2zm15 2H1v10a1 1 0 001 1h12a1 1 0 001-1V4zm0-3a1 1 0 00-1-1H2a1 1 0 00-1 1v1h14V1z"/>
                <path d="M1 7h14v1H1zM1 10h14v1H1z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
