# UniFi AP Compare

Side-by-side RF comparison for every UniFi access point - EIRP, antenna gain, TX power, speeds, and port configs.

**[Live Demo](https://ozark-connect.github.io/unifi-ap-compare/)**

## Why This Exists

Ubiquiti's store lets you compare APs, but you **cannot compare EIRP (TX power + antenna gain) across models** - the number that actually matters for coverage planning. This tool solves that by calculating and displaying EIRP prominently for every UniFi AP.

It also handles things the store can't:
- Multiple discrete antenna configurations per model (omni vs directional)
- Gateway devices with built-in radios (Dream Router, Express, etc.) compared directly against standalone APs
- US vs EU regulatory domain filtering that adjusts all RF values

## Features

- **EIRP front-and-center** - calculated per band, displayed in dBm and mW with visual comparison bars
- **Side-by-side comparison** of 2-6 APs with best-in-class highlighting
- **Market selector** (US/EU) that adjusts TX power and EIRP to regulatory limits
- **Rich filtering** - by band, Wi-Fi generation, form factor, device type, environment
- **Card grid + table view** for different workflows
- **Shareable URLs** - filter/sort/comparison state encoded in query params
- **Mobile-first responsive design** - usable on-site from your phone
- **Dark theme** matching the UniFi ecosystem aesthetic

## Data Source

Data is fetched live from Ubiquiti's public product catalog (`static.ui.com/fingerprint/ui/public.json`). No API key needed. Falls back to a bundled snapshot if the live fetch fails. The snapshot is refreshed weekly via GitHub Actions.

## Run Locally

```bash
npm install
npm run dev
```

## Refresh Catalog Data

```bash
npm run fetch-data
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zero runtime dependencies beyond React

## Embedding

### iframe
```html
<iframe src="https://ozark-connect.github.io/unifi-ap-compare/" width="100%" height="800" frameborder="0"></iframe>
```

### Direct link with pre-selected comparison
```
https://ozark-connect.github.io/unifi-ap-compare/?compare=u7-pro,u6-long-range
```

## License

MIT - Built by [Ozark Connect](https://ozarkconnect.net)

Not affiliated with Ubiquiti Inc.
