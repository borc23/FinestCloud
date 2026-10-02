# finestcloud

Solar panel detection and configuration API (FastAPI backend in `src/finestcloud`, Next.js frontend in `frontend/`).

## Development

API keys are read from the environment and never stored in the code. For local development:

```bash
cp .env.example .env                              # backend: GOOGLE_MAPS_API_KEY, NREL_API_KEY
cp frontend/.env.example frontend/.env.local      # frontend
```

Both files are gitignored. In production, set the same variables in Render (backend) and Vercel (frontend).

```bash
uv sync
uv run pre-commit install
uv run finestcloud          # dev server on http://127.0.0.1:8000
uv run pytest
```
