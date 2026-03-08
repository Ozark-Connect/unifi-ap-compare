import type { AccessPoint, BandData, BandKey } from '../types';

const ICON_BASE = 'https://static.ui.com/fingerprint/ui/icons/';

interface RawRadio {
  gain?: number;
  maxPower?: number;
  maxSpeedMegabitsPerSecond?: number;
}

interface RawDevice {
  id: string;
  deviceType: string;
  deviceTypes?: string[];
  icon: { id: string; resolutions: number[][] };
  line: { id: string; name: string };
  product: { abbrev: string; name: string };
  shortnames: string[];
  sku: string;
  sysid: string;
  sysids?: string[];
  compliance?: {
    modelName?: string;
    indoorOnly?: boolean;
  };
  unifi?: {
    network?: {
      type: string;
      model?: string;
      radios: Record<string, RawRadio>;
      features?: Record<string, boolean | number>;
      ethernetMaxSpeedMegabitsPerSecond?: number;
      numberOfPorts?: number;
      deviceCapabilities?: string[];
    };
  };
}

const BAND_MAP: Record<string, BandKey> = {
  ng: '2.4GHz',
  na: '5GHz',
  '6e': '6GHz',
};

function calcEirp(gain: number, maxPower: number): { eirpDbm: number; eirpMw: number } {
  const eirpDbm = maxPower + gain;
  const eirpMw = Math.round(Math.pow(10, eirpDbm / 10) * 100) / 100;
  return { eirpDbm, eirpMw };
}

function deriveWifiGen(features: Record<string, boolean | number>, hasBands: BandKey[]): AccessPoint['wifiGeneration'] {
  if (features.be) return 'Wi-Fi 7';
  if (features.ax && hasBands.includes('6GHz')) return 'Wi-Fi 6E';
  if (features.ax) return 'Wi-Fi 6';
  if (features.ac) return 'Wi-Fi 5';
  return 'Wi-Fi 4';
}

function deriveFormFactor(name: string, deviceType: string, features: Record<string, boolean | number>): string {
  const lower = name.toLowerCase();
  if (deviceType === 'console' || deviceType === 'gateway') return 'Gateway';
  if (lower.includes('in-wall') || lower.includes('in wall') || lower.includes('iw')) return 'In-Wall';
  if (lower.includes('outdoor') || lower.includes('campus')) return 'Outdoor';
  if (lower.includes('mesh')) return 'Mesh';
  if (lower.includes('wall')) return 'Wall';
  if (lower.includes('basestation')) return 'Outdoor';
  if (features.outdoorModeSupport) return 'Ceiling'; // Indoor APs with outdoor mode are ceiling
  return 'Ceiling';
}

function isOutdoor(name: string, formFactor: string, features: Record<string, boolean | number>): boolean {
  const lower = name.toLowerCase();
  return formFactor === 'Outdoor' || lower.includes('outdoor') || lower.includes('campus') || lower.includes('mesh');
}

function makeSlug(name: string, sysid: string, antennaConfig?: string): string {
  let slug = name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  if (antennaConfig) {
    slug += '-' + antennaConfig.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }
  return slug;
}

/** Filter for UniFi devices with usable radio data */
function isRelevantDevice(d: RawDevice): boolean {
  const network = d.unifi?.network;
  if (!network?.radios || Object.keys(network.radios).length === 0) return false;

  // Must be UniFi line
  if (d.line.id !== 'unifi-network') return false;

  // Filter out non-AP/gateway types (bridges, power supplies, LTE devices, etc.)
  const validTypes = ['access-point', 'console', 'gateway'];
  if (!validTypes.includes(d.deviceType)) return false;

  // For consoles, must have actual radio capabilities
  if (d.deviceType === 'console') {
    const caps = network.deviceCapabilities || [];
    const hasRadioData = Object.values(network.radios).some(
      r => r.maxPower !== undefined || r.gain !== undefined
    );
    // Some consoles only list speeds without gain/power — still include if they have radio entries
    if (!hasRadioData && !Object.keys(network.radios).some(k => BAND_MAP[k])) return false;
  }

  // Must have at least one recognized band with some data
  const hasBand = Object.keys(network.radios).some(k => BAND_MAP[k]);
  if (!hasBand) return false;

  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseDevices(rawJson: any): AccessPoint[] {
  const rawDevices = (rawJson.devices || []) as RawDevice[];
  const devices: AccessPoint[] = [];
  const seen = new Map<string, number>(); // track duplicate names

  for (const d of rawDevices) {
    if (!isRelevantDevice(d)) continue;

    const network = d.unifi!.network!;
    const features = network.features || {};
    const radios = network.radios;

    // Parse band data
    const bands: Partial<Record<BandKey, BandData>> = {};
    const bandList: BandKey[] = [];

    for (const [rawBand, radio] of Object.entries(radios)) {
      const bandKey = BAND_MAP[rawBand];
      if (!bandKey) continue; // skip unknown bands like 'swift'

      const gain = radio.gain ?? 0;
      const maxPower = radio.maxPower ?? 0;
      const maxSpeed = radio.maxSpeedMegabitsPerSecond ?? 0;

      // Skip bands with no useful data
      if (maxPower === 0 && gain === 0 && maxSpeed === 0) continue;

      const { eirpDbm, eirpMw } = calcEirp(gain, maxPower);
      bands[bandKey] = { gain, maxPower, maxSpeed, eirpDbm, eirpMw };
      bandList.push(bandKey);
    }

    if (bandList.length === 0) continue;

    // Sort bands consistently
    const bandOrder: BandKey[] = ['2.4GHz', '5GHz', '6GHz'];
    bandList.sort((a, b) => bandOrder.indexOf(a) - bandOrder.indexOf(b));

    const name = d.product.name;
    const formFactor = deriveFormFactor(name, d.deviceType, features);
    const outdoor = isOutdoor(name, formFactor, features);
    const indoor = !outdoor || d.compliance?.indoorOnly === true;
    const wifiGeneration = deriveWifiGen(features, bandList);

    // Handle duplicates — different antenna configs or hardware revisions
    const count = seen.get(name) || 0;
    seen.set(name, count + 1);
    let antennaConfig: string | undefined;
    if (count > 0) {
      // This is a duplicate — we'll label it after processing all
      antennaConfig = `config-${count + 1}`;
    }

    const isGateway = d.deviceType === 'console' || d.deviceType === 'gateway';

    const ap: AccessPoint = {
      id: d.id + (antennaConfig ? `-${antennaConfig}` : ''),
      slug: makeSlug(name, d.sysid, antennaConfig),
      name,
      abbrev: d.product.abbrev,
      sku: d.sku,
      shortnames: d.shortnames,
      line: d.line.name,
      deviceType: isGateway ? 'gateway' : 'ap',
      iconId: d.icon.id,
      iconUrl: `${ICON_BASE}${d.icon.id}_256x256.png`,
      wifiGeneration,
      bands,
      bandList,
      features: {
        bandsteer: !!features.bandsteer,
        outdoorMode: !!features.outdoorModeSupport,
        muMimo: wifiGeneration !== 'Wi-Fi 4',
        ofdma: !!features.ax || !!features.be,
        mesh: formFactor === 'Mesh',
      },
      formFactor,
      indoor,
      outdoor,
      ethernetMaxSpeed: network.ethernetMaxSpeedMegabitsPerSecond || 0,
      numberOfPorts: network.numberOfPorts || 0,
      antennaConfig,
      networkType: network.type,
      sysid: d.sysid,
      rawDeviceType: d.deviceType,
    };

    devices.push(ap);
  }

  // Post-process: label duplicate configs meaningfully
  labelDuplicateConfigs(devices);

  return devices;
}

function labelDuplicateConfigs(devices: AccessPoint[]) {
  const groups = new Map<string, AccessPoint[]>();
  for (const ap of devices) {
    const list = groups.get(ap.name) || [];
    list.push(ap);
    groups.set(ap.name, list);
  }

  for (const [, group] of groups) {
    if (group.length <= 1) {
      // Single entry — no config label needed
      group[0].antennaConfig = undefined;
      continue;
    }

    // Try to differentiate by gain values or band support
    for (let i = 0; i < group.length; i++) {
      const ap = group[i];
      const gains: string[] = [];
      for (const band of ['5GHz', '6GHz', '2.4GHz'] as BandKey[]) {
        const data = ap.bands[band];
        if (data && data.gain > 0) {
          gains.push(`${data.gain}dBi ${band.replace('GHz', 'G')}`);
        }
      }

      if (gains.length > 0) {
        // Check if this entry has notably higher gain (directional)
        const maxGain = Math.max(
          ...Object.values(ap.bands).map(b => b?.gain ?? 0).filter(Boolean)
        );
        const otherMaxGains = group
          .filter((_, idx) => idx !== i)
          .map(other => Math.max(...Object.values(other.bands).map(b => b?.gain ?? 0).filter(Boolean)));

        if (maxGain >= 9 && otherMaxGains.some(g => g < maxGain - 2)) {
          ap.antennaConfig = 'Directional';
        } else if (otherMaxGains.some(g => g >= 9) && maxGain < 9) {
          ap.antennaConfig = 'Omni';
        } else {
          // Differentiate by band support
          const has6e = ap.bandList.includes('6GHz');
          const othersHave6e = group
            .filter((_, idx) => idx !== i)
            .some(other => other.bandList.includes('6GHz'));

          if (has6e && !othersHave6e) {
            ap.antennaConfig = '6 GHz';
          } else if (!has6e && othersHave6e) {
            ap.antennaConfig = '5 GHz Only';
          } else {
            ap.antennaConfig = `Config ${i + 1}`;
          }
        }
      } else {
        ap.antennaConfig = `Config ${i + 1}`;
      }

      // Update slug and id
      ap.slug = makeSlug(ap.name, ap.sysid, ap.antennaConfig);
      ap.id = ap.id.replace(/(-config-\d+)?$/, '') + `-${ap.antennaConfig.replace(/\s+/g, '').toLowerCase()}`;
    }
  }
}

export const CATALOG_URL = 'https://static.ui.com/fingerprint/ui/public.json';

export async function fetchDevices(): Promise<AccessPoint[]> {
  try {
    const resp = await fetch(CATALOG_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    return parseDevices(json);
  } catch (err) {
    console.warn('Live fetch failed, using bundled fallback:', err);
    // Dynamic import for code splitting
    const fallback = await import('./fallback.json');
    return parseDevices(fallback.default || fallback);
  }
}
