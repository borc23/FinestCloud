# FinestCloud Solar Frontend

Next.js frontend for the solar panel analysis application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env.local
```

3. Add your Google Maps API key to `.env.local`

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `app/` - Next.js 14 App Router pages and layouts
- `components/` - React components with CSS modules
- `styles/` - Global styles and CSS variables
- `lib/` - Utility functions and services

## Key Features

- **Responsive Design** - Mobile-first approach with breakpoints
- **CSS Modules** - Component-scoped styling
- **CSS Variables** - Consistent design system
- **Google Maps Integration** - Satellite view with Places API
- **Modern UI** - Clean, accessible interface

## Components

- `Sidebar` - Main navigation with tool buttons
- `Navbar` - Search and module selection
- `MapContainer` - Google Maps and image upload
- `LoadingSpinner` - Loading states

## Development

The app uses:
- Next.js 14 with App Router
- TypeScript for type safety
- CSS Modules for styling
- Google Maps JavaScript API