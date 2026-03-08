import type { AccessPoint, AntennaConfig, BandData, BandKey } from '../types';

const ICON_BASE = 'https://static.ui.com/fingerprint/ui/icons/';

interface RawRadio {
  gain?: number;
  maxPower?: number;
  maxSpeedMegabitsPerSecond?: number;
}

interface RawDevice {
  id: string;
  deviceType: string;
  icon: { id: string; resolutions: number[][] };
  line: { id: string; name: string };
  product: { abbrev: string; name: string };
  shortnames: string[];
  sku: string;
  sysid: string;
  compliance?: {
    modelName?: string;
    indoorOnly?: boolean;
    fcc?: string;
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

const BAND_ORDER: BandKey[] = ['2.4GHz', '5GHz', '6GHz'];

function calcEirp(gain: number, maxPower: number): { eirpDbm: number; eirpMw: number } {
  const eirpDbm = maxPower + gain;
  const eirpMw = Math.round(Math.pow(10, eirpDbm / 10) * 100) / 100;
  return { eirpDbm, eirpMw };
}

function parseBands(radios: Record<string, RawRadio>): { bands: Partial<Record<BandKey, BandData>>; bandList: BandKey[] } {
  const bands: Partial<Record<BandKey, BandData>> = {};
  const bandList: BandKey[] = [];

  for (const [rawBand, radio] of Object.entries(radios)) {
    const bandKey = BAND_MAP[rawBand];
    if (!bandKey) continue;

    const gain = radio.gain ?? 0;
    const maxPower = radio.maxPower ?? 0;
    const maxSpeed = radio.maxSpeedMegabitsPerSecond ?? 0;

    if (maxPower === 0 && gain === 0 && maxSpeed === 0) continue;

    const { eirpDbm, eirpMw } = calcEirp(gain, maxPower);
    bands[bandKey] = { gain, maxPower, maxSpeed, eirpDbm, eirpMw };
    bandList.push(bandKey);
  }

  bandList.sort((a, b) => BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b));
  return { bands, bandList };
}

function deriveWifiGen(features: Record<string, boolean | number>, hasBands: BandKey[]): AccessPoint['wifiGeneration'] {
  if (features.be) return 'Wi-Fi 7';
  if (features.ax && hasBands.includes('6GHz')) return 'Wi-Fi 6E';
  if (features.ax) return 'Wi-Fi 6';
  if (features.ac) return 'Wi-Fi 5';
  return 'Wi-Fi 4';
}

function deriveFormFactor(name: string, deviceType: string): string {
  const lower = name.toLowerCase();
  if (deviceType === 'console' || deviceType === 'gateway') return 'Gateway';
  if (lower.includes('in-wall') || lower.includes('in wall')) return 'In-Wall';
  if (lower.includes('outdoor') || lower.includes('campus')) return 'Outdoor';
  if (lower.includes('mesh')) return 'Mesh';
  if (lower.includes('wall')) return 'Wall';
  if (lower.includes('basestation')) return 'Outdoor';
  return 'Ceiling';
}

function makeSlug(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-+]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

/** Detect if this is an EU-only variant */
function isEUVariant(d: RawDevice): boolean {
  if (d.sku.endsWith('-EU') || d.sku.includes('-EU-')) return true;
  if (d.shortnames.some(s => s.endsWith('-EU') || s.endsWith('EU'))) return true;
  return false;
}

/** Detect if this is a color variant (black edition, etc.) */
function isColorVariant(d: RawDevice): boolean {
  // -B suffix (but not -BK which is a different pattern)
  const sku = d.sku;
  if (sku.match(/-B$/)) return true;
  if (sku.match(/-BK$/)) return true;
  // Also check shortnames for "Black" variants
  if (d.shortnames.some(s => s.includes('Black'))) return true;
  return false;
}

/** Check if device is relevant (UniFi, has radios, etc.) */
function isRelevantDevice(d: RawDevice): boolean {
  const network = d.unifi?.network;
  if (!network?.radios || Object.keys(network.radios).length === 0) return false;
  if (d.line.id !== 'unifi-network') return false;
  if (!['access-point', 'console', 'gateway'].includes(d.deviceType)) return false;

  const hasBand = Object.keys(network.radios).some(k => BAND_MAP[k]);
  if (!hasBand) return false;

  return true;
}

/** Check if two radio configs have meaningfully different antenna/RF characteristics.
 *  Only gain and power matter for EIRP — speed-only differences are just hardware revisions. */
function radiosAreDifferent(a: Record<string, RawRadio>, b: Record<string, RawRadio>): boolean {
  const aBands = Object.keys(a).filter(k => BAND_MAP[k]).sort();
  const bBands = Object.keys(b).filter(k => BAND_MAP[k]).sort();

  // Different bands supported (e.g. one has 6GHz, other doesn't)
  if (aBands.join(',') !== bBands.join(',')) return true;

  // Different gain or power values (the EIRP-relevant fields)
  for (const band of aBands) {
    const ar = a[band];
    const br = b[band];
    if (!ar || !br) continue;
    if ((ar.gain ?? 0) !== (br.gain ?? 0)) return true;
    if ((ar.maxPower ?? 0) !== (br.maxPower ?? 0)) return true;
  }

  return false;
}

/** Label an antenna config based on its radio characteristics relative to others */
function labelConfig(
  radios: Record<string, RawRadio>,
  allConfigs: Record<string, RawRadio>[],
  model: string,
): string {
  const gain5g = radios.na?.gain ?? 0;
  const gain24g = radios.ng?.gain ?? 0;
  const has6e = !!radios['6e'] && (radios['6e'].maxPower ?? 0) > 0;
  const maxGain = Math.max(gain5g, gain24g, radios['6e']?.gain ?? 0);

  // Check what other configs look like
  const otherGains = allConfigs
    .filter(c => c !== radios)
    .map(c => Math.max(c.na?.gain ?? 0, c.ng?.gain ?? 0, c['6e']?.gain ?? 0));

  const otherHas6e = allConfigs
    .filter(c => c !== radios)
    .some(c => !!c['6e'] && (c['6e'].maxPower ?? 0) > 0);

  // High gain vs standard (directional antenna)
  if (maxGain >= 9 && otherGains.some(g => g < maxGain - 2)) {
    return 'Directional';
  }
  if (otherGains.some(g => g >= 9) && maxGain < 7) {
    return 'Omni';
  }

  // Band difference
  if (has6e && !otherHas6e) return 'Tri-Band (6 GHz)';
  if (!has6e && otherHas6e) return 'Dual-Band';

  // Gain difference
  if (otherGains.length > 0) {
    const avgOther = otherGains.reduce((a, b) => a + b, 0) / otherGains.length;
    if (maxGain > avgOther + 1.5) return 'High-Gain';
    if (maxGain < avgOther - 1.5) return 'Standard';
  }

  // Speed difference
  const speed5g = radios.na?.maxSpeedMegabitsPerSecond ?? 0;
  const otherSpeeds = allConfigs
    .filter(c => c !== radios)
    .map(c => c.na?.maxSpeedMegabitsPerSecond ?? 0);
  if (otherSpeeds.some(s => s > 0) && speed5g > Math.max(...otherSpeeds) * 1.5) {
    return 'High-Speed';
  }
  if (otherSpeeds.some(s => s > speed5g * 1.5)) {
    return 'Standard';
  }

  return model;
}

interface Candidate {
  device: RawDevice;
  isEU: boolean;
  isColor: boolean;
  network: NonNullable<NonNullable<RawDevice['unifi']>['network']>;
}

type ConfigEntry = { candidate: Candidate; radios: Record<string, RawRadio> };

function buildDevice(
  name: string,
  configs: ConfigEntry[],
  market: 'us' | 'eu',
): AccessPoint {
  const primary = configs[0].candidate;
  const d = primary.device;
  const network = primary.network;
  const features = network.features || {};

  const allRadios = configs.map(c => c.radios);
  const antennaConfigs: AntennaConfig[] = configs.map(c => {
    const { bands, bandList } = parseBands(c.radios);
    const label = configs.length > 1
      ? labelConfig(c.radios, allRadios, c.candidate.network.model || '?')
      : 'Default';
    return {
      label, bands, bandList,
      sysid: c.candidate.device.sysid,
      model: c.candidate.network.model || '',
    };
  });

  const defaultConfig = antennaConfigs[0];
  const allBands = [...new Set(antennaConfigs.flatMap(c => c.bandList))] as BandKey[];
  const wifiGeneration = deriveWifiGen(features, allBands);
  const formFactor = deriveFormFactor(name, d.deviceType);
  const lower = name.toLowerCase();
  const outdoor = formFactor === 'Outdoor' || lower.includes('outdoor') || lower.includes('campus') || lower.includes('mesh');
  const indoor = !outdoor || d.compliance?.indoorOnly === true;
  const isGateway = d.deviceType === 'console' || d.deviceType === 'gateway';

  return {
    id: d.id,
    slug: makeSlug(name),
    name,
    abbrev: d.product.abbrev,
    sku: d.sku,
    shortnames: d.shortnames,
    line: d.line.name,
    deviceType: isGateway ? 'gateway' : 'ap',
    iconId: d.icon.id,
    iconUrl: `${ICON_BASE}${d.icon.id}_256x256.png`,
    wifiGeneration,
    activeConfig: 0,
    configs: antennaConfigs,
    bands: defaultConfig.bands,
    bandList: defaultConfig.bandList,
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
    networkType: network.type,
    rawDeviceType: d.deviceType,
    market,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseDevices(rawJson: any): AccessPoint[] {
  const rawDevices = (rawJson.devices || []) as RawDevice[];

  const candidates: Candidate[] = [];
  for (const d of rawDevices) {
    if (!isRelevantDevice(d)) continue;
    candidates.push({
      device: d,
      isEU: isEUVariant(d),
      isColor: isColorVariant(d),
      network: d.unifi!.network!,
    });
  }

  // Phase 2: Group by product name
  const groups = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const name = c.device.product.name;
    const list = groups.get(name) || [];
    list.push(c);
    groups.set(name, list);
  }

  // Phase 3: For each group, build AccessPoint entries
  const devices: AccessPoint[] = [];

  function collectUniqueConfigs(variants: Candidate[]): { candidate: Candidate; radios: Record<string, RawRadio> }[] {
    const configs: { candidate: Candidate; radios: Record<string, RawRadio> }[] = [];
    for (const c of variants) {
      const isDupe = configs.some(
        existing => !radiosAreDifferent(existing.radios, c.network.radios)
      );
      if (!isDupe) {
        configs.push({ candidate: c, radios: c.network.radios });
      } else {
        // Keep the one with higher sysid (latest revision) and highest speeds
        const existingIdx = configs.findIndex(
          existing => !radiosAreDifferent(existing.radios, c.network.radios)
        );
        if (existingIdx >= 0) {
          const existingSysid = parseInt(configs[existingIdx].candidate.device.sysid, 16);
          const newSysid = parseInt(c.device.sysid, 16);
          if (newSysid > existingSysid) {
            configs[existingIdx] = { candidate: c, radios: c.network.radios };
          }
        }
      }
    }
    return configs;
  }

  for (const [name, group] of groups) {
    const euVariants = group.filter(c => c.isEU);
    const baseVariants = group.filter(c => !c.isEU && !c.isColor);

    if (baseVariants.length === 0 && euVariants.length === 0) continue;

    // Build US device (from base variants)
    if (baseVariants.length > 0) {
      const configs = collectUniqueConfigs(baseVariants);
      const primary = configs[0].candidate;
      const d = primary.device;
      const network = primary.network;
      const features = network.features || {};

      devices.push(buildDevice(name, configs, 'us'));
    }

    // Build EU device (from EU variants, or absent if none)
    if (euVariants.length > 0) {
      const configs = collectUniqueConfigs(euVariants);
      devices.push(buildDevice(name, configs, 'eu'));
    }
  }

  // Deduplicate slugs (EU and US versions of same product get different slugs)
  const slugCount = new Map<string, number>();
  for (const ap of devices) {
    const c = slugCount.get(ap.slug) || 0;
    if (c > 0) {
      ap.slug = `${ap.slug}-${ap.market}`;
      ap.id = `${ap.id}-${ap.market}`;
    }
    slugCount.set(ap.slug, c + 1);
  }

  return devices;
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
    const fallback = await import('./fallback.json');
    return parseDevices(fallback.default || fallback);
  }
}
