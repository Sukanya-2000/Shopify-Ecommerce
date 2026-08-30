# Shopify-Ecommerce

CyberNest is a complete sample ecommerce project with:

- A Shopify Online Store 2.0 theme in `cybernest-theme`
- An Express/MongoDB backend in `backend`
- A Shopify-compatible product import CSV with 72 sample products
- Seeded local API data for products, users, and orders

## Local Backend And Database

From the repo root:

```bash
cd backend
npm install
copy .env.example .env
npm run check
npm run seed
npm run dev
```

The API runs at `http://localhost:5000`.
The default backend uses a local JSON database at `backend/data/dev-db.json`, so MongoDB and Docker are optional.

To use MongoDB instead, set `DATA_STORE=mongo` in `backend/.env`, then run `docker compose up -d mongo` from the repo root before seeding.

Seeded logins:

- Admin: `admin@cybernest.local` / `Password123!`
- Customer: `customer@cybernest.local` / `Password123!`

## Shopify Frontend

From `cybernest-theme`:

```bash
shopify login --store=<store>
shopify theme dev
```

Import `cybernest-theme/data/sample-products.csv` in Shopify Admin under Products > Import.

## API

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:handle`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/orders`
- `POST /api/orders`
