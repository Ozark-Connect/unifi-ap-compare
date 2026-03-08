import { useMemo, useState } from 'react';
import type { AccessPoint, BandKey } from './types';
import { useURLState } from './hooks/useURLState';
import { useDeviceData } from './hooks/useDeviceData';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { APCard } from './components/APCard';
import { APTable } from './components/APTable';
import { ComparisonTray } from './components/ComparisonTray';
import { ComparisonView } from './components/ComparisonView';
import { SkeletonGrid } from './components/Skeleton';

function App() {
  const urlState = useURLState();
  const { devices, allDevices, totalCount, loading, dataSource } = useDeviceData(
    urlState.market,
    urlState.filters,
    urlState.sort,
    urlState.sortDir,
  );

  const [showComparison, setShowComparison] = useState(false);

  // Resolve selected devices
  const selectedDevices = useMemo(() => {
    return urlState.compare
      .map(slug => allDevices.find(d => d.slug === slug))
      .filter((d): d is AccessPoint => d !== undefined);
  }, [urlState.compare, allDevices]);

  // Calculate max EIRP per band across ALL visible devices (for card mini-bars)
  const maxEirpMw = useMemo(() => {
    const result: Record<BandKey, number> = { '2.4GHz': 0, '5GHz': 0, '6GHz': 0 };
    for (const ap of devices) {
      for (const band of ['2.4GHz', '5GHz', '6GHz'] as BandKey[]) {
        const data = ap.bands[band];
        if (data) result[band] = Math.max(result[band], data.eirpMw);
      }
    }
    return result;
  }, [devices]);

  // Open comparison view if URL has compare params on load
  const shouldShowComparison = showComparison || (selectedDevices.length >= 2 && urlState.compare.length >= 2 && !loading);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        market={urlState.market}
        onMarketChange={urlState.setMarket}
        dataSource={dataSource}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 space-y-4">
        {shouldShowComparison && selectedDevices.length >= 2 ? (
          <ComparisonView
            devices={selectedDevices}
            onRemove={(slug) => {
              urlState.toggleCompare(slug);
              if (selectedDevices.length <= 2) setShowComparison(false);
            }}
            onBack={() => setShowComparison(false)}
          />
        ) : (
          <>
            <FilterBar
              filters={urlState.filters}
              onFiltersChange={urlState.setFilters}
              sort={urlState.sort}
              sortDir={urlState.sortDir}
              onSortChange={urlState.setSort}
              onSortDirChange={urlState.setSortDir}
              view={urlState.view}
              onViewChange={urlState.setView}
              totalCount={totalCount}
              filteredCount={devices.length}
              allDevices={allDevices}
            />

            {loading ? (
              <SkeletonGrid />
            ) : devices.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-unifi-text-secondary text-sm">No access points match your filters.</div>
                <button
                  onClick={() => urlState.setFilters({ ...urlState.filters, search: '', bands: [], wifiGeneration: [], formFactor: [], environment: [] })}
                  className="mt-2 text-xs text-unifi-blue-bright hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : urlState.view === 'table' ? (
              <APTable
                devices={devices}
                selectedSlugs={urlState.compare}
                onToggle={urlState.toggleCompare}
                sort={urlState.sort}
                sortDir={urlState.sortDir}
                onSortChange={urlState.setSort}
                onSortDirChange={urlState.setSortDir}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {devices.map(ap => (
                  <APCard
                    key={ap.id}
                    ap={ap}
                    selected={urlState.compare.includes(ap.slug)}
                    onToggle={() => urlState.toggleCompare(ap.slug)}
                    maxEirpMw={maxEirpMw}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Comparison tray (only when not in comparison view) */}
      {!shouldShowComparison && (
        <ComparisonTray
          selectedDevices={selectedDevices}
          onRemove={(slug) => urlState.toggleCompare(slug)}
          onClear={() => urlState.setCompare([])}
          onCompare={() => setShowComparison(true)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-unifi-border/50 py-4 mt-8">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-unifi-text-secondary">
          <span>
            Built by{' '}
            <a href="https://ozarkconnect.com" target="_blank" rel="noopener noreferrer" className="text-unifi-blue-bright hover:underline">
              Ozark Connect
            </a>
          </span>
          <span>
            Data: {dataSource === 'live' ? 'Live' : 'Cached'} from Ubiquiti public catalog
            {' · '}
            Not affiliated with Ubiquiti Inc.
          </span>
        </div>
      </footer>

      {/* Bottom spacer when tray is visible */}
      {selectedDevices.length > 0 && !shouldShowComparison && (
        <div className="h-20 md:h-16" />
      )}
    </div>
  );
}

export default App;
