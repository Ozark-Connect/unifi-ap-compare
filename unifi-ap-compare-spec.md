# UniFi AP Comparison Tool — Claude Code Spec

## Overview

A self-contained, single-page web application for comparing UniFi access point specifications side-by-side — including standalone APs and gateway products with built-in radios (UDR, UX, UCG-Industrial, etc.). Built as a React artifact (or standalone HTML) that consumes Ubiquiti's public product catalog JSON. The tool solves a specific gap in Ubiquiti's own store comparison: **you cannot compare EIRP (TX power + antenna gain) across models**, which is the number that actually matters for coverage planning. Their store also can't handle the reality that some APs have multiple discrete antenna configurations, that EU and US models ship with different regulatory limits, or that gateway-integrated radios should be directly comparable to dedicated APs.

**Target users:** Network professionals, consultants, and prosumers evaluating UniFi AP purchases — people who know what EIRP means and want to filter/sort by it without manually cross-referencing spec sheets.

---

## Data Source

### Ubiquiti Public Catalog JSON

The tool pulls AP data from Ubiquiti's publicly accessible product catalog endpoint. The user will provide Claude Code with:

- The catalog JSON URL / example payloads
- Examples of how to resolve device icon URLs from the catalog data
- Examples showing where antenna gain, TX power, supported bands, and radio chain configurations live in the JSON structure

Claude Code should parse and normalize this data at build time or on first load. No API key is needed — this is a public endpoint.

### Device Icon Resolution

Ubiquiti's catalog includes icon/image references that can be resolved to CDN URLs. The user will provide examples of this mapping. Each AP entry in the comparison grid should display its product image for quick visual identification.

---

## Data Model & Key Decisions

### Handling Multiple Antenna Configurations

Some UniFi APs have multiple discrete antenna configurations per radio (e.g., different internal antenna arrays for different beam patterns, or models with both internal and external antenna options). These are NOT the same as MIMO chain counts — these are genuinely different antenna setups with different gain values.

**Decision: Create separate comparison entries for each discrete antenna configuration.** Each entry should clearly label which configuration it represents (e.g., "U7 Pro — High-Gain Panel" vs "U7 Pro — Omni"). This keeps the comparison honest since you can't mix-and-match antenna configs on a single unit — you're choosing one or the other.

### Gateways with Built-In APs (UDR, UX, UCG-Industrial, etc.)

Several UniFi gateway/router products include integrated access point radios — the UDR (Dream Router), Express (UX), and UCG-Industrial being the current examples. These are primarily gateways, but their AP radios are real radios with real TX power and antenna gain specs, and people absolutely need to compare their wireless performance against standalone APs when deciding whether the built-in radio is sufficient or if they need to add dedicated APs.

**Decision: Include these devices in the comparison tool.** The catalog JSON will indicate that these devices have AP capabilities (they'll have radio/antenna data in their specs just like standalone APs). Claude Code should identify these by looking for devices that have UAP-equivalent radio data regardless of their primary product category (ugw, uxg, udm, etc.).

**UX treatment for gateway-with-AP entries:**
- Display with a visual badge or tag distinguishing them from standalone APs — something like a "Gateway + AP" or "Built-in AP" pill/label on the card and in the comparison column header. This sets expectations: the user knows this isn't a dedicated AP, it's a gateway that also does Wi-Fi.
- The product image should show the actual gateway hardware (from catalog icons), not a generic AP icon.
- In the comparison view, include a row or note in the "Physical" section indicating the device's primary role (e.g., "Primary function: Router/Gateway"). This helps contextualize specs like PoE (gateways don't need PoE — they have their own PSU) and form factor.
- These devices should appear in filter results when their AP specs match the filter criteria. If someone filters for "6 GHz support" and the UDR supports 6 GHz, it should show up. But the "Form Factor" filter should have an additional option like "Gateway (built-in AP)" so users can include or exclude them.
- RF specs (TX power, antenna gain, EIRP, streams, channel widths) are displayed identically to standalone APs — no special treatment for the numbers themselves. The radio is a radio regardless of what chassis it lives in.

**Identification in the catalog JSON:** The user will provide examples, but Claude Code should expect that these devices won't be categorized as "uap" in the catalog — they'll be under gateway/router categories (udm, uxg, ugw, etc.) but will have the same radio specification fields that standalone APs have. The presence of radio/antenna data is the signal, not the product category.

### Handling Regional Market Variants (US vs EU vs Other)

Different markets have different regulatory limits on TX power and allowed channels, which directly affects real-world EIRP. A U7 Pro in the US and a U7 Pro in the EU are functionally different products for coverage planning purposes.

**Decision: Global market selector at the top of the page.** The selector filters the dataset so all displayed specs reflect the chosen regulatory domain. This is cleaner than creating N entries per model per market — the user picks their market once and everything adjusts. Default to US (FCC) since that's the largest market segment.

**Supported markets (at minimum):**
- US (FCC)
- EU (ETSI / CE)

If the catalog data exposes other regulatory domains (e.g., AU, JP), include them. If a model isn't available in the selected market, it should either be hidden or shown greyed out with a "Not available in [market]" note.

### Calculated Fields

These are derived at parse time and are the whole point of the tool:

- **EIRP (per band, per chain config):** `TX Power (dBm) + Antenna Gain (dBi)` — Display in both dBm and mW. This is the primary value-add over Ubiquiti's own comparison.
- **Max Theoretical Throughput (per radio):** Derived from channel width, MCS index, and spatial streams. Label clearly as theoretical.
- **Price per EIRP (optional/stretch):** If MSRP is in the catalog data, `price / max EIRP` as a rough value metric.

---

## UX Specification

### Layout & Visual Design

**Design direction:** Industrial-utilitarian with a networking equipment aesthetic. Think: dark-mode default (matching UniFi's own UI language), monospace or semi-mono type for data values, crisp grid lines, and generous use of the UniFi blue (#0559C9) as an accent. This is a data-dense tool for technical users — prioritize information density and scannability over whitespace. Avoid consumer-friendly softness. This should feel like opening a network management dashboard, not browsing a retail catalog.

**Typography:**
- Data values / specs: A monospace or tabular-figure font (e.g., JetBrains Mono, IBM Plex Mono, or Source Code Pro) so columns of numbers align visually
- Labels / headers: A clean sans-serif with good weight range (e.g., DM Sans, Manrope, or similar) — something with personality but not distracting
- Avoid: Inter, Roboto, Arial, system-ui defaults

**Color:**
- Dark background (#1a1a2e or similar deep navy/charcoal)
- UniFi blue (#0559C9) for interactive elements, selected states, and EIRP highlights
- Muted grays for secondary data
- Green/amber/red for conditional formatting (signal strength tiers, band support indicators)
- High contrast text on dark backgrounds — no low-contrast gray-on-dark-gray

### Page Structure

```
┌─────────────────────────────────────────────────────────┐
│  [UniFi AP Compare]              [Market: US ▾] [Theme] │
│                                                         │
│  Filter Bar                                             │
│  ┌─────────────────────────────────────────────────────┐│
│  │ [Band ▾] [Form Factor ▾] [WiFi Gen ▾] [Search...]  ││
│  │ [Indoor/Outdoor ▾] [PoE Type ▾] [Status ▾]         ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Sort: [EIRP 5GHz ▾] [Asc/Desc]    Showing 24 of 31   │
│                                                         │
│  ┌──────────────────────────────────────────────────────┐
│  │  AP Grid / Table                                    │
│  │                                                     │
│  │  (See "Comparison Views" below)                     │
│  │                                                     │
│  └──────────────────────────────────────────────────────┘
│                                                         │
│  [Selected for comparison: U7 Pro, U6 LR, U7 Pro Max] │
│  [Compare Selected →]                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Core Interactions

#### 1. Market Selector (Top-Level, Persistent)

- Dropdown or segmented control pinned to the top bar
- Changing market re-derives all TX power, EIRP, and channel availability values across the entire view
- Visual confirmation of active market (e.g., flag icon or bold label)
- Persists across view changes (grid → detail → comparison)

#### 2. Filter Bar

Filters are multi-select dropdowns that stack as chips/tags when active. Filters narrow the visible AP list. Available filters:

| Filter | Options | Notes |
|---|---|---|
| Device Type | Standalone AP, Gateway (built-in AP) | Default: both selected. Lets users include or exclude gateway devices like UDR/UX/UCG-Industrial |
| Band Support | 2.4 GHz, 5 GHz, 6 GHz | Multi-select; shows APs supporting ANY selected band |
| Wi-Fi Generation | Wi-Fi 5, Wi-Fi 6, Wi-Fi 6E, Wi-Fi 7 | |
| Form Factor | Ceiling, Wall, Outdoor, In-Wall, Desktop, Mesh, Gateway | Derived from catalog metadata. "Gateway" covers UDR/UX/UCG-Industrial form factors |
| Indoor / Outdoor | Indoor, Outdoor, Both | |
| PoE Type | 802.3af, 802.3at, 802.3bt, Passive 24V, N/A (self-powered) | "N/A" covers gateways with their own PSU |
| Product Status | Current, End of Sale, Legacy | Default: Current only |

- A text search box for quick model name/SKU lookup
- "Clear all filters" button when any filter is active
- Filter state reflected in URL query params (shareable links)

#### 3. Sort Controls

Single-column sort with direction toggle. Sortable columns include:

- **EIRP (per band)** — The star of the show. Sort by 2.4 GHz EIRP, 5 GHz EIRP, or 6 GHz EIRP independently
- Antenna Gain (per band)
- Max TX Power (per band)
- Number of Spatial Streams
- Max Channel Width
- Price (if available)
- Model Name (alphabetical)
- Wi-Fi Generation

Default sort: **5 GHz EIRP descending** (most common comparison scenario for coverage planning).

#### 4. AP Grid (Default View)

The main listing. Two layout options the user can toggle between:

**Card Grid (default):** Each AP as a card showing:
- Product image (from catalog icon URL)
- Model name + SKU
- Wi-Fi generation badge
- Band support indicators (colored dots or pills: 2.4 / 5 / 6 GHz)
- **EIRP per band** — prominently displayed, this is the key metric
- Antenna config label (if this entry represents a specific config)
- Price (if available)
- Checkbox for "add to comparison"

**Table View:** Dense tabular layout with all sortable columns visible. Better for rapid scanning of many models. Rows are selectable for comparison. Sticky header row. Horizontally scrollable on narrow viewports with the model name column frozen.

#### 5. Comparison Tray (Sticky Bottom Bar)

As the user checks APs for comparison, a sticky tray appears at the bottom:

- Shows thumbnails + model names of selected APs (max ~6 for readability)
- "Compare (N)" button to enter side-by-side view
- "Clear" to deselect all
- Can remove individual selections from the tray
- Tray slides up with a subtle animation on first selection

#### 6. Side-by-Side Comparison View

This is where the real value lives. A dedicated view showing 2-6 selected APs in columns:

```
┌──────────┬──────────┬──────────┬──────────┐
│          │ U7 Pro   │ U6 LR    │ U7 ProMax│
│          │ [image]  │ [image]  │ [image]  │
├──────────┼──────────┼──────────┼──────────┤
│ EIRP     │          │          │          │
│  2.4 GHz │ 28 dBm   │ 26 dBm   │ 29 dBm   │
│          │ (631 mW) │ (398 mW) │ (794 mW) │
│  5 GHz   │ 30 dBm   │ 28 dBm   │ 33 dBm   │ ← highlighted as best
│          │ (1000 mW)│ (631 mW) │ (1995 mW)│
│  6 GHz   │ 30 dBm   │ —        │ 36 dBm   │
├──────────┼──────────┼──────────┼──────────┤
│ TX Power │          │          │          │
│  2.4 GHz │ 23 dBm   │ 23 dBm   │ 23 dBm   │
│  5 GHz   │ 25 dBm   │ 25 dBm   │ 27 dBm   │
│  ...     │          │          │          │
├──────────┼──────────┼──────────┼──────────┤
│ Antenna  │          │          │          │
│  2.4 Gain│ 5 dBi    │ 3 dBi    │ 6 dBi    │
│  5 Gain  │ 5 dBi    │ 3 dBi    │ 6 dBi    │
│  ...     │          │          │          │
├──────────┼──────────┼──────────┼──────────┤
│ Radio    │          │          │          │
│ Streams  │ 2x2      │ 2x2      │ 4x4      │
│ Max ChW  │ 160 MHz  │ 80 MHz   │ 320 MHz  │
│ WiFi Gen │ Wi-Fi 7  │ Wi-Fi 6  │ Wi-Fi 7  │
├──────────┼──────────┼──────────┼──────────┤
│ Physical │          │          │          │
│ PoE      │ 802.3at  │ 802.3af  │ 802.3bt  │
│ Env      │ Indoor   │ Indoor   │ Indoor   │
│ Mount    │ Ceiling  │ Ceiling  │ Ceiling  │
├──────────┼──────────┼──────────┼──────────┤
│ Price    │ $189     │ $179     │ $299     │
└──────────┴──────────┴──────────┴──────────┘
```

**Comparison view features:**

- **EIRP Visual Comparison (per band):** The EIRP rows in the comparison table include inline horizontal bar charts behind the numeric values. Each AP's EIRP value renders as a filled bar scaled relative to the highest value in that row. This gives an instant visual sense of the spread — you can see at a glance that one AP has 2x the EIRP of another without doing mental dBm-to-linear math. Bars use the UniFi blue accent color, with the best-in-class value getting a brighter/saturated fill and others slightly muted. The numeric dBm + mW values overlay the bars (left-aligned text on the bar). Bars scale linearly in mW (not dBm) because that's how power actually scales — a 3 dB difference is 2x power, and the bar should visually reflect that doubling. On the card grid view, each AP card should also have a compact EIRP mini-bar per band (just the bar, no axis) so you can visually scan relative performance while browsing, not just in the comparison view.

  **Example rendering (5 GHz EIRP row in comparison):**
  ```
  U7 Pro     │ ████████████████████░░░░░  30 dBm (1000 mW)
  U6 LR      │ ████████████░░░░░░░░░░░░░  28 dBm (631 mW)
  U7 Pro Max │ █████████████████████████  33 dBm (1995 mW)  ← best
  ```
  The bar for U7 Pro Max fills 100% (it's the reference). U7 Pro fills ~50% (1000/1995). U6 LR fills ~32% (631/1995). The visual immediately communicates that the Pro Max has roughly 2x the radiated power of the Pro, which the "30 vs 33 dBm" numbers alone don't intuitively convey to most people.

  **Scale behavior:** Bars within each band row scale independently — the max EIRP in the 2.4 GHz row sets 100% for 2.4 GHz bars, and the max in the 5 GHz row sets 100% for 5 GHz bars. This prevents a high 6 GHz value from making all the 2.4 GHz bars look tiny. If the user wants cross-band comparison (e.g., "is this AP's 5 GHz EIRP higher than that AP's 6 GHz EIRP"), the numeric values are right there — the bars are for within-band relative comparison.

  **Edge cases:** If an AP doesn't support a band, show an empty cell with "—" and no bar. If all compared APs have identical EIRP for a band, all bars fill 100% and none get the "best" highlight (they're all best).

- **Best-in-class highlighting:** The highest EIRP per band gets a highlight (green text or background bar). Same for other "higher is better" metrics. "Lower is better" metrics (price, power draw) highlight the lowest.
- **Difference indicators:** Optional toggle to show deltas from a "baseline" column (first selected AP). e.g., "+3 dBm" or "-$50". When enabled, delta values appear below the primary value in a smaller font. Positive deltas (better) in green, negative (worse) in amber/red, zero in gray.
- **Row grouping:** Specs grouped into logical sections (RF Performance → EIRP, TX, Gain, Streams; Physical → PoE, mounting, dimensions; Connectivity → ports, uplink).
- **EIRP section is always first and visually emphasized** — larger font, subtle background differentiation, or a left-border accent. This is the reason the tool exists.
- **"Hide identical rows" toggle:** When comparing similar models, collapse rows where all values match to focus on differences.
- **Horizontal scroll on mobile** with the spec label column frozen.
- **Removable columns:** X button on each AP column header to remove it from comparison without going back to the grid.
- **Add more:** "+" button to add another AP to the comparison from a quick-search dropdown without leaving the view.

### Future: Antenna Pattern Visualization

Not in scope for this phase, but the next major feature would be overlaying or comparing antenna radiation patterns (azimuth and elevation cuts) alongside the EIRP data. The user has pattern data for the full AP lineup. When this gets added, it would likely live as an expandable detail row or a dedicated tab within the comparison view — click an AP's antenna row to see its pattern plot, or overlay multiple patterns on the same polar chart for direct visual comparison. The current data model (per-band, per-antenna-config entries) is already structured to support this cleanly since each entry maps to a single physical antenna configuration with a single pattern. Spec this as a separate phase.

### Spec Sections (Comparison & Detail Views)

Organized in this priority order:

**1. EIRP & RF Performance (Primary Section)**
- EIRP per band (dBm + mW) — **the headline metric**
- TX Power per band (dBm)
- Antenna Gain per band (dBi)
- Antenna Configuration label (if applicable)
- Spatial Streams per band (e.g., 2x2, 4x4)
- Supported Channel Widths per band
- Wi-Fi Standard / Generation
- Supported Bands (2.4 / 5 / 6 GHz)

**2. Network & Connectivity**
- Uplink Port(s) — speed, type (RJ45 / SFP+)
- Secondary Ethernet port (if present, e.g., U6 Enterprise has a second GbE)
- Mesh capable (yes/no)
- Band steering support
- MU-MIMO support
- OFDMA support

**3. Power & Physical**
- PoE standard required
- Max power consumption (W)
- Form factor / mounting type
- Indoor / Outdoor / Both
- Operating temperature range
- Dimensions
- Weight
- IP rating (if outdoor)

**4. Regulatory & Availability**
- Supported regulatory domains
- DFS channel support (per market)
- Product status (current / EOS / legacy)
- MSRP (per market, if available)

### Responsive Design (Mobile-First)

This tool must work well on phones. Network consultants pull up spec comparisons on-site from their pocket — during client meetings, standing in a server closet, or walking a building doing a site survey. If the mobile experience is an afterthought, the tool fails its core audience.

**Breakpoints:**

**Mobile (<768px):**
- Single-column card stack for the AP grid. Cards should be compact but readable — product image, model name, Wi-Fi gen badge, and EIRP values per band. No wasted space.
- **Filters:** Collapsed behind a "Filters" button that opens a full-screen modal/drawer from the bottom. Active filters show as a horizontal scrollable chip row below the header so the user always knows what's filtered. Chip row is dismissible per-chip with an X tap target sized for thumbs (minimum 44x44px).
- **Sort:** Dropdown selector above the card list, not a separate toolbar row. Compact — just the sort field and a direction toggle arrow.
- **Market selector:** Stays in the sticky header. Use a compact segmented control (US | EU) not a dropdown — fewer taps.
- **Comparison tray:** Transforms into a floating action button (FAB) in the bottom-right corner with a badge count of selected APs. Tapping the FAB opens a bottom sheet showing selected APs with thumbnails, remove buttons, and a "Compare" action.
- **Side-by-side comparison on mobile:** This is the hardest part to get right. Two options (Claude Code should evaluate which feels better, or support both):
  - *Option A — Swipeable columns:* Spec label column is frozen on the left (~40% width). AP columns are swipeable horizontally, one AP visible at a time, with dot indicators showing position. Swipe to compare. This preserves the full spec depth.
  - *Option B — Stacked cards with diff highlighting:* Each AP gets a full-width card with all its specs. Differences from the first-selected AP are highlighted inline ("+3 dBm", "−$50"). Scroll vertically through APs. Easier to read individual APs, harder to compare specific rows.
  - Whichever approach is used, the EIRP section must be immediately visible without scrolling on initial load of the comparison view.
- **Touch targets:** All interactive elements (checkboxes, filter chips, dropdown triggers, comparison tray items) must meet minimum 44x44px touch targets. No tiny desktop-sized checkboxes.
- **Text sizing:** Data values no smaller than 14px. Labels no smaller than 12px. EIRP values should be 16px+ even on mobile — they're the whole point.

**Tablet (768–1200px):**
- Card grid becomes a 2-column layout. Cards can show slightly more detail than mobile (add antenna config label, PoE type).
- Filters use a collapsible panel that slides in from the side (not a full-screen modal like mobile).
- Comparison view supports 2-3 visible AP columns with horizontal scroll for more. Frozen label column is wider (~200px) to show full spec names without truncation.
- Comparison tray is a slim sticky bottom bar (same as desktop but narrower).

**Desktop (>1200px):**
- Full card grid (3-4 columns) or dense table view. Table view is the power-user mode — show it here.
- Filter bar is fully expanded inline (no collapse). All filter dropdowns visible in a single row or two.
- Comparison view supports up to 6 AP columns side-by-side without horizontal scroll (at 1440px+). At 1200-1440px, 4-5 columns fit comfortably.
- Comparison tray is a sticky bottom bar with full thumbnail + model name for each selected AP.

**Responsive considerations that apply at all breakpoints:**
- The market selector is always visible and accessible — never buried in a menu. It affects every value on the page and users need to trust they're looking at the right regulatory domain.
- EIRP values are always the most visually prominent data on any card or comparison row regardless of screen size.
- Loading skeletons match the layout of the breakpoint they're displayed at (mobile skeleton looks like stacked cards, desktop skeleton looks like a grid/table).
- URL state works identically across breakpoints — a comparison URL shared from desktop renders correctly on mobile and vice versa. The layout adapts but the data and selection are preserved.
- Scroll position management: Entering comparison view from the grid should start at the top. Returning to the grid should restore the previous scroll position.
- No horizontal scroll on the page body at any breakpoint. Horizontal scroll is only allowed inside the comparison table/view where it's an intentional interaction pattern, and only when the number of selected APs exceeds the viewport width.

### Micro-Interactions & Polish

- Filter changes animate the grid with a subtle fade/reflow (no jarring repaints)
- Sort direction toggle has a rotation animation on the arrow icon
- Comparison tray slides up from the bottom on first AP selection
- Card hover shows a subtle lift/shadow increase
- Best-in-class values in comparison get a brief pulse animation on first render
- Market selector change triggers a brief "recalculating" shimmer on all EIRP values to signal the data changed
- Loading state: skeleton cards matching the card layout (not a spinner)

### URL State & Shareability

The current view state should be reflected in URL query parameters so comparisons can be shared:

- `?market=us` — active market
- `?compare=U7-Pro,U6-LR,U7-ProMax` — active comparison (model slugs)
- `?sort=eirp_5ghz&dir=desc` — current sort
- `?filters=band:5ghz,6ghz;wifi:7;status:current` — active filters
- `?view=table` or `?view=grid` — layout preference

---

## Deployment & Hosting

### GitHub Repository (Public, Open Source)

This project lives in a public GitHub repo under the Ozark Connect org/account. It should be structured as a standard modern frontend project that's easy to fork, contribute to, and understand.

**Repo structure (suggested):**
```
unifi-ap-compare/
├── src/                    # Application source
├── public/                 # Static assets
├── data/                   # Fallback catalog snapshot (see below)
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages deployment workflow
├── README.md               # Setup, usage, contributing, license
├── LICENSE                  # MIT or similar permissive license
├── package.json
└── vite.config.js          # (or whatever build tool Claude Code chooses)
```

**README should include:**
- What the tool does and why (EIRP comparison gap in Ubiquiti's store)
- Live demo link (GitHub Pages URL)
- Screenshot or GIF of the comparison view
- How to run locally (`npm install && npm run dev`)
- How data sourcing works (live fetch vs fallback)
- How to embed in another site (see integration section below)
- Attribution: "Built by Ozark Connect" with link to ozarkconnect.com

### GitHub Pages

Deploy via GitHub Actions on push to `main`. The build step compiles the app to static assets and publishes to the `gh-pages` branch (or uses the newer GitHub Actions deployment method). The GitHub Pages URL becomes the canonical public demo.

**CI/CD workflow should:**
- Install dependencies
- Run the build
- Optionally fetch a fresh catalog snapshot and commit it to `data/` as part of the build (so the fallback stays reasonably current)
- Deploy to GitHub Pages

### Data Sourcing Strategy

**Primary: Live fetch from Ubiquiti's public catalog endpoint at page load.** The app makes a client-side fetch to the catalog JSON URL on initial load. This ensures specs are always current without requiring rebuilds.

**Fallback: Bundled catalog snapshot.** If the live fetch fails (CORS issues, endpoint changes, network errors, Ubiquiti blocks the request), the app falls back gracefully to a bundled JSON snapshot in the `data/` directory. This snapshot should be dated and the UI should indicate when data was last refreshed vs when the snapshot was captured (e.g., a subtle "Data as of: March 2026" note in the footer, or "Live" / "Cached — last updated [date]" indicator).

**CORS reality check:** Ubiquiti's catalog endpoint may or may not have permissive CORS headers for browser-side fetches. Claude Code should test this early. If CORS blocks direct fetch:
- Option 1: Use a lightweight CORS proxy (allorigins, corsproxy.io, or self-hosted). Note the dependency and fragility in the README.
- Option 2: Fetch at build time via a GitHub Action (runs server-side, no CORS issue) and bundle the result. Add a scheduled Action (weekly or daily) that re-fetches and rebuilds to keep data fresh.
- Option 3: Accept the bundled snapshot as the primary data source with a manual or scheduled refresh. Simpler, more reliable, slightly less current.

Claude Code should evaluate the tradeoffs and recommend the best approach after testing the actual endpoint. The user's preference is live fetch if possible, bundled snapshot if not.

### Ozark Connect Website Integration

After the tool is stable and deployed on GitHub Pages, the final step is embedding it into the Ozark Connect website (ozarkconnect.com). Claude Code should evaluate the Ozark Connect site's stack and recommend the best integration approach. Common options:

**Option A — iframe embed:**
Simplest. Add an `<iframe>` pointing to the GitHub Pages URL. Works regardless of the host site's stack. Downsides: no shared styling, potential CORS/CSP issues, iframe height management can be finicky. Best if the Ozark Connect site is a simple static site or WordPress.

**Option B — Build as a standalone component with a mount point:**
If the tool is built with React (or Preact/vanilla JS with a mount function), export an `init()` function that accepts a DOM element and renders into it. The Ozark Connect site includes the built JS/CSS bundle (from the repo's releases or a CDN like jsDelivr pointing at the GitHub repo) and calls `init(document.getElementById('ap-compare'))`. Tighter integration, shared page chrome, better UX. Best if the Ozark Connect site can include external scripts.

**Option C — Subdomain or subpath:**
Host the tool at `compare.ozarkconnect.com` or `ozarkconnect.com/compare/` as its own standalone page. GitHub Pages custom domain or Cloudflare Pages deployment. The Ozark Connect site links to it. Cleanest separation, easy to maintain independently. Best if the tool should feel like its own product page.

**Claude Code should advise on the best option** based on the Ozark Connect site's current tech stack and hosting setup once it has that context. The user will provide details on the site when it's time for integration.

---

## Technical Notes for Claude Code

These are implementation-level notes. The user will provide catalog JSON examples and icon URL patterns — Claude Code should use those to build the data normalization layer.

- **Data parsing:** The catalog JSON will need normalization. AP entries may have nested radio objects, each with their own TX/gain/streams. Claude Code should flatten this into a comparison-friendly structure while preserving the per-band, per-config granularity.
- **EIRP calculation is simple math** but the data extraction is the hard part. Antenna gain and TX power may be in different places in the JSON depending on the AP generation. Claude Code should handle inconsistencies gracefully (missing fields → show "—" not 0).
- **Unit conversions:** Always store in dBm internally. Display mW alongside dBm for EIRP. Conversion: `mW = 10^(dBm/10)`.
- **Market filtering logic:** If the catalog doesn't explicitly separate US/EU specs, Claude Code may need to apply known regulatory caps (e.g., ETSI 5 GHz EIRP limits) to derive EU values. The user can advise on how the catalog handles this.
- **No backend required.** This should be a fully client-side application. Data can be fetched at load time or bundled as a static JSON import.
- **Framework choice:** React with Vite is the likely pick for fast builds and GitHub Pages compatibility, but Claude Code can choose what makes sense. The tool should build to a static bundle that can be served from any static host.
- **Bundle size matters.** This is a data table tool, not a SPA framework showcase. Keep dependencies minimal. If a full component library isn't needed, don't include one.

---

## Out of Scope (For Now)

- Historical pricing or price tracking
- Coverage simulation / heatmapping (that's what Network Optimizer is for)
- UniFi switch or other product category comparisons
- User accounts or saved comparisons (URL sharing covers this)
- Integration with UniFi Network Controller APIs

---

## Success Criteria

1. A user can find any current UniFi AP and instantly see its EIRP per band without mental math
2. Side-by-side comparison of 2-6 APs with EIRP front-and-center
3. Market selector accurately reflects regional TX/EIRP differences
4. Multiple antenna configs for the same model are clearly distinguished
5. Filter + sort workflow gets you from "which APs support 6 GHz?" to a sorted EIRP ranking in under 3 clicks
6. Shareable URLs preserve the full comparison state
7. The tool looks like it belongs in the UniFi ecosystem — dark, data-dense, professional
8. Full comparison workflow is usable on a phone — from filtering to selecting to comparing — without pinch-zooming or fighting the layout
9. Deployed and live on GitHub Pages with a public repo and clear README
10. Data stays current via live catalog fetch (preferred) or regularly refreshed bundled snapshot
11. Claude Code provides a clear recommendation for embedding into the Ozark Connect website based on the site's stack
