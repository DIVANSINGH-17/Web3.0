# Earth Balance Tracker

A Vite + React app with a neutral + green industry-standard theme, a mega navigation menu, and a data visualization dashboard (USGS live water data + mock carbon and waste charts).

## Quick start

```bash
npm install
npm run dev
```

Open the app at the URL shown in your terminal.

## Environment variables (.env)
Create a `.env` file in the project root to configure live data sources:

- VITE_USGS_SITE_ID: USGS site id for river discharge time series (default: 01646500)
- VITE_USGS_API_KEY: Optional USGS API key; sent as `X-Api-Key` header for live water requests
- VITE_CARBON_API_URL: Optional URL returning carbon categories and values (array of objects or key-value). If unset, the app uses mock data.
- VITE_WASTE_API_URL: Optional URL returning waste categories and values (array of objects or key-value). If unset, the app uses mock data.

Example `.env`:

```ini
VITE_USGS_SITE_ID=01646500
VITE_USGS_API_KEY=your_usgs_api_key_here
# VITE_CARBON_API_URL=https://example.com/carbon.json
# VITE_WASTE_API_URL=https://example.com/waste.json
```

Notes:
- USGS data loads from `https://waterservices.usgs.gov/nwis/iv/` by default. The API key header is harmless if the service doesn’t require it and helps when using key-protected gateways.
- For CarbonFootprint/EPA endpoints that require keys, use a proxy or provide a pre-authorized URL as `VITE_*_API_URL`. The UI gracefully falls back to mock data if the fetch fails.

## Build

```bash
npm run build
npm run preview
```

## Accessibility and UX
- Mega menu with keyboard focus, hover states, and icons.
- Charts include tooltips, legends, and responsive containers.
- Light and dark modes via `prefers-color-scheme`.

## Tech
- React, Vite, Recharts.
- CSS variables for theming with a restrained green accent.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
