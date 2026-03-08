/**
 * Manual spec overrides for devices where the Ubiquiti catalog JSON
 * is missing or incomplete data (gain, tx power, antenna configs).
 *
 * Keyed by display name (after "Access Point " prefix is stripped).
 * Each override can specify:
 * - configs: Replace the auto-parsed configs with manually defined ones
 * - market: Which market version this override applies to ('us' | 'eu')
 *
 * Sources: https://techspecs.ui.com/unifi/wifi/
 * EIRP is auto-calculated — just provide gain and maxPower
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

type OverrideMap = Record<string, Partial<Record<'us' | 'eu', DeviceOverride>>>;

/** Legacy devices to hide — incomplete catalog data, no longer sold */
export const EXCLUDED_PRODUCTS: Set<string> = new Set([
  'Access Point',
  'Access Point Long-Range',
  'Access Point In-Wall',
  'Access Point Outdoor',
  'Access Point Outdoor+',
]);

export const OVERRIDES: OverrideMap = {
  // https://techspecs.ui.com/unifi/wifi/u7-outdoor
  'U7 Outdoor': {
    us: {
      configs: [
        {
          label: 'Directional',
          bands: {
            '5GHz': { gain: 12.5, maxPower: 26 },
            '2.4GHz': { gain: 8, maxPower: 23 },
          },
        },
        {
          label: 'Omni',
          bands: {
            '5GHz': { gain: 4, maxPower: 26 },
            '2.4GHz': { gain: 3, maxPower: 23 },
          },
        },
      ],
    },
  },
  // https://techspecs.ui.com/unifi/wifi/u7-pro-outdoor-us
  'U7 Pro Outdoor': {
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
  // https://techspecs.ui.com/unifi/wifi/e7-audience-us
  'E7 Audience': {
    us: {
      configs: [
        {
          label: 'Narrow (50°)',
          bands: {
            '6GHz': { gain: 15, maxPower: 30 },
            '5GHz': { gain: 15, maxPower: 30 },
          },
        },
        {
          label: 'Wide (90°)',
          bands: {
            '6GHz': { gain: 11, maxPower: 30 },
            '5GHz': { gain: 11, maxPower: 30 },
          },
        },
      ],
    },
    eu: {
      configs: [
        {
          label: 'Narrow (50°)',
          bands: {
            '6GHz': { gain: 15, maxPower: 30 },
            '5GHz': { gain: 15, maxPower: 30 },
          },
        },
        {
          label: 'Wide (90°)',
          bands: {
            '6GHz': { gain: 11, maxPower: 30 },
            '5GHz': { gain: 11, maxPower: 30 },
          },
        },
      ],
    },
  },
  // https://techspecs.ui.com/unifi/wifi/e7-audience-indoor
  'E7 Audience Indoor': {
    us: {
      configs: [
        {
          label: 'Narrow (50°)',
          bands: {
            '6GHz': { gain: 15, maxPower: 30 },
            '5GHz': { gain: 15, maxPower: 30 },
          },
        },
        {
          label: 'Wide (90°)',
          bands: {
            '6GHz': { gain: 11, maxPower: 30 },
            '5GHz': { gain: 11, maxPower: 30 },
          },
        },
      ],
    },
  },
  // https://techspecs.ui.com/unifi/cloud-gateways/ucg-industrial
  'Cloud Gateway Industrial': {
    us: {
      configs: [
        {
          label: 'Stub',
          bands: {
            '5GHz': { gain: 5, maxPower: 26 },
            '2.4GHz': { gain: 3, maxPower: 23 },
          },
        },
        {
          label: 'Terminal (Omni)',
          bands: {
            '5GHz': { gain: 6, maxPower: 26 },
            '2.4GHz': { gain: 6, maxPower: 23 },
          },
        },
      ],
    },
  },
  // https://techspecs.ui.com/unifi/cloud-gateways/udr-5g-max
  'Dream Router 5G Max': {
    us: {
      configs: [
        {
          label: 'Default',
          bands: {
            '6GHz': { gain: 8, maxPower: 22 },
            '5GHz': { gain: 5, maxPower: 26 },
            '2.4GHz': { gain: 4, maxPower: 23 },
          },
        },
      ],
    },
    eu: {
      configs: [
        {
          label: 'Default',
          bands: {
            '6GHz': { gain: 8, maxPower: 22 },
            '5GHz': { gain: 5, maxPower: 26 },
            '2.4GHz': { gain: 4, maxPower: 23 },
          },
        },
      ],
    },
  },
};
