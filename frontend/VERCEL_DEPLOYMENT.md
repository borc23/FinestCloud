# Vercel Deployment Guide

## Prerequisites
- Your Render backend URL (e.g., `https://your-service.onrender.com`)
- Google Maps API keys
- Supabase credentials

## Deployment Steps

### 1. Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository: `borc23/FinestCloud`
4. **Important:** Set the **Root Directory** to `frontend`

### 2. Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:
- **Framework Preset:** Next.js
- **Root Directory:** `frontend`
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

### 3. Set Environment Variables

In the Vercel project settings, add these environment variables:

#### Required Variables:

```
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_javascript_api_key
GOOGLE_MAPS_API_KEY=your_google_static_maps_api_key
PYTHON_BACKEND_URL=https://your-service.onrender.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Important Notes:

- **PYTHON_BACKEND_URL**: Use your Render backend URL (e.g., `https://finestcloud-backend.onrender.com`)
  - Do NOT include trailing slash
  - This is a server-side variable (not exposed to client)

- **NEXT_PUBLIC_GOOGLE_MAPS_KEY**: Your Google Maps JavaScript API key
  - Restrict to HTTP referrers (your Vercel domain)

- **GOOGLE_MAPS_API_KEY**: Your Google Static Maps API key
  - Restrict to IP addresses or use the same key as above
  - This is server-side only

- **Supabase Variables**: Copy from your [.env.local](.env.local) or Supabase dashboard

### 4. Deploy

Click **"Deploy"** and Vercel will:
1. Clone your repository
2. Install dependencies
3. Build your Next.js app
4. Deploy to production

### 5. Update Backend CORS

After deployment, update your backend's CORS settings to allow your Vercel domain:

In your backend [main.py](../main.py), update the CORS middleware:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "http://localhost:3000",  # Keep for local dev
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

Then redeploy your backend on Render.

### 6. Set Custom Domain (Optional)

1. Go to your Vercel project settings
2. Navigate to **Domains**
3. Add your custom domain
4. Follow the DNS configuration instructions

## Testing

After deployment:

1. Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Test the main features:
   - Map loading
   - Solar panel detection
   - PVWatts calculations
3. Check browser console for any errors
4. Verify API requests are reaching your Render backend

## Troubleshooting

### Backend Connection Issues

If you see "Python backend is not running":
- Verify `PYTHON_BACKEND_URL` is set correctly in Vercel
- Check your Render backend is running and healthy
- Verify CORS is configured correctly

### Build Failures

- Check Vercel build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify TypeScript has no errors: `npm run build` locally

### Environment Variables Not Working

- Ensure variables starting with `NEXT_PUBLIC_` are used for client-side code
- Server-side variables (without `NEXT_PUBLIC_`) are only available in API routes
- Redeploy after adding/changing environment variables

## Continuous Deployment

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: When you create a pull request

Each deployment gets a unique URL for testing.
