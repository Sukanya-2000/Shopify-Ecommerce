# CyberNest Shopify Theme

## Setup
1. `npm install -g @shopify/cli`
2. `shopify login --store=<store>`
3. `shopify theme dev` — starts local preview

## Branches
- main = production (protected, PR-only merges)
- develop = integration branch
- feature/* = one branch per feature (e.g. feature/header, feature/search, feature/product-page, feature/cart, feature/megamenu)

## Structure
- /sections = homepage and page-level modules (schema-driven, editable in Theme Editor)
- /snippets = reusable partials (product-card, icons, etc.)
- /config/settings_schema.json = theme-editor-controlled global settings (colors, typography, layout)
- /templates = JSON templates referencing sections — no hardcoded page content

## Metafields / Metaobjects
(document each as it's created — see METAFIELDS.md, to be created in later days)

## Status
Day 0 complete: environment, Shopify CLI, Git repo, branch strategy, and base folder structure in place. No design system or feature code yet — that starts Day 1.
