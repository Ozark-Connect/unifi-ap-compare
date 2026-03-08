/**
 * Manual spec overrides for devices where the Ubiquiti catalog JSON
 * is missing or incomplete data (gain, tx power, antenna configs).
 *
 * Keyed by product name. Each override can specify:
 * - configs: Replace the auto-parsed configs with manually defined ones
 * - market: Which market version this override applies to ('us' | 'eu')
 *
 * To add a new override:
 * 1. Find the product name exactly as it appears in the catalog
 * 2. Define configs with label, per-band gain/power/speed
 * 3. EIRP is auto-calculated — just provide gain and maxPower
 */

interface BandOverride {
  gain: number;
  maxPower: number;
  maxSpeed?: number;  // optional — keeps catalog value if omitted
}

interface ConfigOverride {
  label: string;
  bands: {
    '2.4GHz'?: BandOverride;
    '5GHz'?: BandOverride;
    '6GHz'?: BandOverride;
  };
}

export interface DeviceOverride {
  configs: ConfigOverride[];
}

type OverrideMap = Record<string, Record<'us' | 'eu', DeviceOverride>>;

export const OVERRIDES: OverrideMap = {
  'Access Point U7 Pro Outdoor': {
    us: {
      configs: [
        {
          label: 'Directional',
          bands: {
            '6GHz': { gain: 10, maxPower: 26 },
            '5GHz': { gain: 11, maxPower: 26 },
            '2.4GHz': { gain: 8, maxPower: 23 },
          },
        },
        {
          label: 'Omni',
          bands: {
            '5GHz': { gain: 8, maxPower: 26 },
            '2.4GHz': { gain: 6, maxPower: 23 },
          },
        },
      ],
    },
    eu: {
      configs: [
        {
          label: 'Directional',
          bands: {
            '5GHz': { gain: 11, maxPower: 29 },
            '2.4GHz': { gain: 8, maxPower: 23 },
          },
        },
        {
          label: 'Omni',
          bands: {
            '5GHz': { gain: 8, maxPower: 29 },
            '2.4GHz': { gain: 6, maxPower: 23 },
          },
        },
      ],
    },
  },
};
