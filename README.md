# LEIRAD-IPTV

Modern, high-performance IPTV web player powered by global open M3U channels with dynamic Supabase database management, smart categorization, live search, and HD playback.

---

## Features
- **Supabase Cloud Database**: All IPTV M3U playlist feeds are stored, managed, and fetched dynamically from Supabase (`iptv_playlists` table).
- **Password-Protected `/admin` Portal**: Secure master access gate authenticated against Supabase (`admin_settings` table).
- **Full Admin CRUD**: Create, Read, Update, and Delete playlist sources with 1-click toggles and live status badges.
- **Clean Channel Selector**: High-contrast, user-friendly channel guide with left/right scrollable category filters and instant search.
- **High-Performance HLS Streaming**: Low-latency live streaming powered by `hls.js` with auto-skip and turbo buffer modes.

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Supabase Database
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** (`>_`).
3. Paste the contents of [`supabase_schema.sql`](./supabase_schema.sql) and click **Run**.
4. Configure your `.env.local` file:
```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Public Player**: `http://localhost:3000/`
- **Admin Portal**: `http://localhost:3000/admin` (Default password: `D@rielgwapo223`)
