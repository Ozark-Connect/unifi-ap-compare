export interface BandData {
  gain: number;      // dBi
  maxPower: number;  // dBm
  maxSpeed: number;  // Mbps
  eirpDbm: number;   // calculated: maxPower + gain
  eirpMw: number;    // calculated: 10^(eirpDbm/10)
}

export type BandKey = '2.4GHz' | '5GHz' | '6GHz';

export interface AccessPoint {
  id: string;
  slug: string;
  name: string;
  abbrev: string;
  sku: string;
  shortnames: string[];
  line: string;
  deviceType: 'ap' | 'gateway';
  iconId: string;
  iconUrl: string;
  wifiGeneration: 'Wi-Fi 4' | 'Wi-Fi 5' | 'Wi-Fi 6' | 'Wi-Fi 6E' | 'Wi-Fi 7';
  bands: Partial<Record<BandKey, BandData>>;
  bandList: BandKey[];
  features: {
    bandsteer: boolean;
    outdoorMode: boolean;
    muMimo: boolean;
    ofdma: boolean;
    mesh: boolean;
  };
  formFactor: string;
  indoor: boolean;
  outdoor: boolean;
  ethernetMaxSpeed: number;
  numberOfPorts: number;
  antennaConfig?: string;
  networkType: string; // uap, udm, etc.
  sysid: string;
  rawDeviceType: string;
}

export type Market = 'us' | 'eu';

export type SortField =
  | 'name'
  | 'wifiGeneration'
  | 'eirp_2.4GHz'
  | 'eirp_5GHz'
  | 'eirp_6GHz'
  | 'gain_2.4GHz'
  | 'gain_5GHz'
  | 'gain_6GHz'
  | 'txPower_5GHz'
  | 'maxSpeed_5GHz'
  | 'ethernetMaxSpeed';

export type SortDir = 'asc' | 'desc';

export type ViewMode = 'grid' | 'table';

export interface FilterState {
  deviceType: ('ap' | 'gateway')[];
  bands: BandKey[];
  wifiGeneration: string[];
  formFactor: string[];
  environment: ('indoor' | 'outdoor' | 'both')[];
  status: string[];
  search: string;
}

export const DEFAULT_FILTERS: FilterState = {
  deviceType: ['ap', 'gateway'],
  bands: [],
  wifiGeneration: [],
  formFactor: [],
  environment: [],
  status: [],
  search: '',
};
