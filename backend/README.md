# CyberNest Backend

Express API backed by MongoDB for CyberNest ecommerce data.

## Setup

```bash
cd backend
npm install
copy .env.example .env
npm run check
npm run seed
npm run dev
```

The local database connection is configured in `.env`. Keep that file private.

By default, development uses `DATA_STORE=json`, which writes seeded data to `backend/data/dev-db.json` and does not require Docker or MongoDB.

If you prefer MongoDB, set `DATA_STORE=mongo` in `backend/.env` and start the included database service from the repo root:

```bash
docker compose up -d mongo
```

## Endpoints

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:handle`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/orders`
- `POST /api/orders`

Admin-only product mutations:

- `POST /api/products`
- `PUT /api/products/:handle`
- `DELETE /api/products/:handle`

## Seeded Accounts

- Admin: `admin@cybernest.local` / `Password123!`
- Customer: `customer@cybernest.local` / `Password123!`
- Additional customers: `jordan.lee@example.com`, `priya.shah@example.com` / `Password123!`

## Sample Order Request

Log in first, then send a bearer token:

```json
{
  "customer": {
    "name": "Sample Customer",
    "email": "customer@cybernest.local"
  },
  "shippingAddress": {
    "line1": "100 Market Street",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "US"
  },
  "items": [
    {
      "product": "replace-with-product-id-from-get-products",
      "quantity": 2
    }
  ]
}
```
