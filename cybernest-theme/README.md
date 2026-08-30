# CyberNest Shopify Theme

## Setup
1. `npm install -g @shopify/cli`
2. `shopify login --store=<store>`
3. `shopify theme dev` starts local preview

## Branches
- main = production (protected, PR-only merges)
- develop = integration branch
- feature/* = one branch per feature (e.g. feature/header, feature/search, feature/product-page, feature/cart, feature/megamenu)

## Structure
- /sections = homepage and page-level modules (schema-driven, editable in Theme Editor)
- /snippets = reusable partials (product-card, icons, etc.)
- /config/settings_schema.json = theme-editor-controlled global settings (colors, typography, layout)
- /templates = JSON templates referencing sections, no hardcoded page content
- /data/sample-products.csv = Shopify product import file with 72 CyberNest sample products

## Sample products
Import `data/sample-products.csv` in Shopify Admin under Products > Import to populate the store catalog. The theme uses Shopify collections and product Liquid objects, so no separate custom backend is required.

## Contact page
Create a Shopify page for contact information and assign the `contact` theme template. The template includes editable support details and Shopify's native contact form.

## Metafields / Metaobjects
Document each as it's created. See METAFIELDS.md.

## Status
The theme includes homepage, collection, product, cart, search, wishlist, contact, header, newsletter, trust badge, promo, department, and brand sections. Import the sample CSV and assign templates in Shopify Admin to preview a populated storefront.
