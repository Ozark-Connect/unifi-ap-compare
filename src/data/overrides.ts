/**
 * Manual spec overrides for devices where the Ubiquiti catalog JSON
 * (public.json) has incorrect or missing data.
 *
 * Keyed by display name (after "Access Point " prefix is stripped).
 * Values sourced from ApModelCatalog.cs (NetworkOptimizer) and
 * https://techspecs.ui.com/unifi/wifi/
 *
 * EIRP is auto-calculated — just provide gain and maxPower.
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
  wifiGeneration?: 'Wi-Fi 4' | 'Wi-Fi 5' | 'Wi-Fi 6' | 'Wi-Fi 6E' | 'Wi-Fi 7';
  numberOfPorts?: number;
  portConfig?: string;
}

type OverrideMap = Record<string, Partial<Record<'us' | 'eu', DeviceOverride>>>;

/** Devices only available in the US market (no EU variant, not sold in EU) */
export const US_ONLY_PRODUCTS: Set<string> = new Set([
  'Access Point E7 Campus Indoor',
  'Access Point E7 Audience Indoor',
]);

/** Legacy devices to hide — incomplete catalog data, no longer sold */
export const EXCLUDED_PRODUCTS: Set<string> = new Set([
  'Access Point',
  'Access Point Long-Range',
  'Access Point In-Wall',
  'Access Point Outdoor',
  'Access Point Outdoor+',
]);

export const OVERRIDES: OverrideMap = {
  // === Wi-Fi 7 APs ===

  // https://techspecs.ui.com/unifi/wifi/u7-outdoor
  // public.json has directional gains as default; omni config missing entirely
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
  // public.json: 2.4 maxPower=22→23, 6 maxPower=23→26; omni config missing
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
  // https://techspecs.ui.com/unifi/wifi/u7-pro-wall
  // public.json: 2.4 gain=5→4 maxPower=22→23, 5 gain=3→5, 6 maxPower=26→24
  'U7 Pro Wall': {
    us: {
      configs: [
        {
          label: 'Default',
          bands: {
            '6GHz': { gain: 6, maxPower: 24 },
            '5GHz': { gain: 5, maxPower: 26 },
            '2.4GHz': { gain: 4, maxPower: 23 },
          },
        },
      ],
    },
  },
  // https://techspecs.ui.com/unifi/wifi/u7-pro-xgs
  // public.json: 6 maxPower=23→24
  'U7 Pro XGS': {
    us: {
      configs: [
        {
          label: 'Default',
          bands: {
            '6GHz': { gain: 6, maxPower: 24 },
            '5GHz': { gain: 6, maxPower: 29 },
            '2.4GHz': { gain: 4, maxPower: 23 },
          },
        },
      ],
    },
  },

  // === Enterprise APs ===

  // https://techspecs.ui.com/unifi/wifi/e7
  // public.json: 2.4 gain=4→5 maxPower=22→23, 5 maxPower=29→30, 6 maxPower=29→30
  // Ports: 1x 10GbE + 1x GbE (PoE++ on both) — catalog says 1
  'E7': {
    us: {
      numberOfPorts: 2,
      portConfig: '1x 10GbE + 1x GbE, PoE++',
      configs: [
        {
          label: 'Default',
          bands: {
            '6GHz': { gain: 6, maxPower: 30 },
            '5GHz': { gain: 6, maxPower: 30 },
            '2.4GHz': { gain: 5, maxPower: 23 },
          },
        },
      ],
    },
  },
  // https://techspecs.ui.com/unifi/wifi/e7-audience-us
  // public.json: gain missing on both bands; 6 GHz US EIRP cap 36 dBm → narrow max 21, wide max 25
  // Ports: 1x 10GbE + 1x GbE (PoE++ on both) — catalog says 1
  'E7 Audience': {
    us: {
      numberOfPorts: 2,
      portConfig: '1x 10GbE + 1x GbE, PoE++',
      configs: [
        {
          label: 'Narrow (50°)',
          bands: {
            '6GHz': { gain: 15, maxPower: 21 },
            '5GHz': { gain: 15, maxPower: 30 },
          },
        },
        {
          label: 'Wide (90°)',
          bands: {
            '6GHz': { gain: 11, maxPower: 25 },
            '5GHz': { gain: 11, maxPower: 30 },
          },
        },
      ],
    },
    eu: {
      numberOfPorts: 2,
      portConfig: '1x 10GbE + 1x GbE, PoE++',
      configs: [
        {
          label: 'Narrow (50°)',
          bands: {
            '6GHz': { gain: 15, maxPower: 21 },
            '5GHz': { gain: 15, maxPower: 30 },
          },
        },
        {
          label: 'Wide (90°)',
          bands: {
            '6GHz': { gain: 11, maxPower: 25 },
            '5GHz': { gain: 11, maxPower: 30 },
          },
        },
      ],
    },
  },
  // https://techspecs.ui.com/unifi/wifi/e7-audience-indoor
  // Same antenna hardware as E7 Audience; same 6 GHz EIRP cap applies
  // Ports: 1x 10GbE + 1x GbE (PoE++ on both) — catalog says 1
  'E7 Audience Indoor': {
    us: {
      numberOfPorts: 2,
      portConfig: '1x 10GbE + 1x GbE, PoE++',
      configs: [
        {
          label: 'Narrow (50°)',
          bands: {
            '6GHz': { gain: 15, maxPower: 21 },
            '5GHz': { gain: 15, maxPower: 30 },
          },
        },
        {
          label: 'Wide (90°)',
          bands: {
            '6GHz': { gain: 11, maxPower: 25 },
            '5GHz': { gain: 11, maxPower: 30 },
          },
        },
      ],
    },
  },
  // https://techspecs.ui.com/unifi/wifi/e7-campus
  // public.json: ALL values wrong — gain=4/6/6→9/12/12, maxPower=22/29/29→23/30/24
  // Ports: 1x 10GbE + 1x GbE (PoE++ on both) — catalog says 1
  'E7 Campus': {
    us: {
      numberOfPorts: 2,
      portConfig: '1x 10GbE + 1x GbE, PoE++',
      configs: [
        {
          label: 'Default',
          bands: {
            '6GHz': { gain: 12, maxPower: 24 },
            '5GHz': { gain: 12, maxPower: 30 },
            '2.4GHz': { gain: 9, maxPower: 23 },
          },
        },
      ],
    },
    eu: {
      numberOfPorts: 2,
      portConfig: '1x 10GbE + 1x GbE, PoE++',
      configs: [
        {
          label: 'Default',
          bands: {
            '5GHz': { gain: 12, maxPower: 30 },
            '2.4GHz': { gain: 9, maxPower: 23 },
          },
        },
      ],
    },
  },

  // https://techspecs.ui.com/unifi/wifi/e7-campus-indoor
  // public.json has 2.4/5 GHz swapped! Correct: 9/12/12 dBi, same as E7 Campus
  // 6 GHz US EIRP capped at 36 dBm → 12 dBi gain → max 24 dBm TX
  // Ports: 1x 10GbE + 1x GbE (PoE++ on both) — catalog says 1
  'E7 Campus Indoor': {
    us: {
      numberOfPorts: 2,
      portConfig: '1x 10GbE + 1x GbE, PoE++',
      configs: [
        {
          label: 'Default',
          bands: {
            '6GHz': { gain: 12, maxPower: 24 },
            '5GHz': { gain: 12, maxPower: 30 },
            '2.4GHz': { gain: 9, maxPower: 23 },
          },
        },
      ],
    },
  },

  // XG: 1x 10GbE + 1x GbE (PoE++ on both) — catalog says 1
  'XG': {
    us: { configs: [], numberOfPorts: 2, portConfig: '1x 10GbE + 1x GbE, PoE++' },
  },

  // === Wi-Fi 5 APs with dual GbE (catalog says 1) ===

  // AC Pro: 2x GbE — catalog says 1
  'AC Pro': {
    us: { configs: [], numberOfPorts: 2, portConfig: '2x GbE' },
  },
  // AC HD: 2x GbE — catalog says 1
  'AC HD': {
    us: { configs: [], numberOfPorts: 2, portConfig: '2x GbE' },
  },
  // AC SHD: 2x GbE — catalog says 1
  'AC SHD': {
    us: { configs: [], numberOfPorts: 2, portConfig: '2x GbE' },
  },
  // AC Mesh Pro: 2x GbE — catalog says 1
  'AC Mesh Pro': {
    us: { configs: [], numberOfPorts: 2, portConfig: '2x GbE' },
  },
  // AC: 2x GbE — catalog correct
  'AC': {
    us: { configs: [], portConfig: '2x GbE' },
  },
  // AC Outdoor: 2x GbE — catalog correct
  'AC Outdoor': {
    us: { configs: [], portConfig: '2x GbE' },
  },
  // U6 Mesh Pro: 2x GbE — catalog correct
  'U6 Mesh Pro': {
    us: { configs: [], portConfig: '2x GbE' },
  },

  // === In-Wall APs — port descriptions (catalog port counts correct) ===

  // U6 In-Wall: 5 ports — catalog correct
  'U6 In-Wall': {
    us: { configs: [], portConfig: '1x GbE uplink, 4x GbE switch (1 PoE out)' },
  },
  // U6 Enterprise In-Wall: 5 ports — catalog correct
  'U6 Enterprise In-Wall': {
    us: { configs: [], portConfig: '1x 2.5GbE uplink, 4x GbE switch (1 PoE out)' },
  },
  // AC In-Wall: 3 ports — catalog correct
  'AC In-Wall': {
    us: { configs: [], portConfig: '1x GbE uplink, 2x GbE switch' },
  },
  // AC In-Wall Pro: 3 ports — catalog correct
  'AC In-Wall Pro': {
    us: { configs: [], portConfig: '1x GbE uplink, 2x GbE switch' },
  },
  // In-Wall HD: 5 ports — catalog correct
  'In-Wall HD': {
    us: { configs: [], portConfig: '1x GbE uplink, 4x GbE switch (1 PoE out)' },
  },

  // === Wi-Fi 7 APs missing 'be' feature flag in catalog ===

  // U7 In Wall: catalog has ax but not be; 3 ports
  'U7 In Wall': {
    us: { configs: [], wifiGeneration: 'Wi-Fi 7', portConfig: '1x 2.5GbE uplink, 2x 2.5GbE switch (1 PoE out)' },
  },
  // U7 Long-Range: catalog has ax but not be
  'U7 Long-Range': {
    us: { configs: [], wifiGeneration: 'Wi-Fi 7' },
  },
  // U7 Mesh: catalog has ax but not be
  'U7 Mesh': {
    us: { configs: [], wifiGeneration: 'Wi-Fi 7' },
  },
  // U7 Pro XG Wall: catalog has ax but not be
  'U7 Pro XG Wall': {
    us: { configs: [], wifiGeneration: 'Wi-Fi 7' },
  },

  // === Specialty APs ===

  // https://techspecs.ui.com/unifi/wifi/uk-ultra
  // public.json: 2.4 gain=3→5, 5 gain=4→6; panel mode missing
  'Swiss Army Knife': {
    us: {
      configs: [
        {
          label: 'Omni',
          bands: {
            '5GHz': { gain: 6, maxPower: 20 },
            '2.4GHz': { gain: 5, maxPower: 20 },
          },
        },
        {
          label: 'Panel',
          bands: {
            '5GHz': { gain: 15, maxPower: 20 },
            '2.4GHz': { gain: 10, maxPower: 20 },
          },
        },
      ],
    },
  },
  // https://techspecs.ui.com/unifi/wifi/uwb-xg
  // public.json: 5 gain=10→15; narrow/wide modes missing
  'WiFi BaseStation XG': {
    us: {
      configs: [
        {
          label: 'Narrow (50°)',
          bands: {
            '5GHz': { gain: 15, maxPower: 25 },
          },
        },
        {
          label: 'Wide (90°)',
          bands: {
            '5GHz': { gain: 10, maxPower: 25 },
          },
        },
      ],
    },
  },

  // === Gateways with Wi-Fi ===

  // https://techspecs.ui.com/unifi/cloud-gateways/ucg-industrial
  // public.json: gain AND maxPower missing entirely; no ax/be feature flags
  'Cloud Gateway Industrial': {
    us: {
      wifiGeneration: 'Wi-Fi 7',
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
  // public.json: gain AND maxPower missing entirely; no ax/be feature flags
  'Dream Router 5G Max': {
    us: {
      wifiGeneration: 'Wi-Fi 7',
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
      wifiGeneration: 'Wi-Fi 7',
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
  // Dream Wall: catalog missing ax feature flag
  'Dream Wall': {
    us: { configs: [], wifiGeneration: 'Wi-Fi 6' },
  },
  // Dream Router 7: catalog missing ax/be feature flags entirely
  'Dream Router 7': {
    us: { configs: [], wifiGeneration: 'Wi-Fi 7' },
  },
  // Express 7: catalog has ax but not be
  'Express 7': {
    us: { configs: [], wifiGeneration: 'Wi-Fi 7' },
  },
};
