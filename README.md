# Gather · Free Vinted Bundle Finder

Find sellers with multiple items from your shopping list on Vinted Germany.

**Live app:** https://gather-vinted.vercel.app

No Vinted account, API key, paid provider, proxy or browser extension is required. Vercel Hobby hosts the app within its free usage limits. No paid plan or service is configured.

## Use

1. Optionally set **List preferences** once: department, clothing sizes and minimum condition.
2. Add items with name, searchable categories, matching sizes and maximum price. **More filters** contains brand, department and condition. Own filters override list defaults; disable **Use list preferences** for fully independent item filters. **Clear sizes** allows any size for that item while keeping its other preferences; **Use list sizes** restores the clothing defaults. Shoe, hat and sock sizes remain separate.
3. Choose **Quick search** (1 page per item) or **Broader search** (up to 3 original pages plus up to 2 related first-page searches when capacity allows), beside the shopping list. The shopping list shows matching-listing counts per item; results default to sellers matching two or more items.
4. Use **Search more** to expand towards 5 original pages per item while retaining related searches, within 30 pages total. It re-runs the broader range and replaces results. Cancellation or failure preserves prior successful results.
5. Open item links from bundle cards to check availability and buy on Vinted. Cards lead with matched item names and item subtotal; fetched counts and missing items appear in details.

Each listing can satisfy only one request. Sellers are ranked by items covered, then minimum item subtotal. Shipping, buyer protection and bundle discounts are confirmed on Vinted.

## Language

Choose **Deutsch** or **English** in the header. The preference is saved in this browser and defaults to its language (German unless English is requested). Interface text is keyed in `src/messages.js`; catalogue label translations are keyed by the Germany IDs in `src/filter-translations.js`. Switching languages keeps the shopping list, native filters and results. Listing titles and user-entered keywords remain as written.

Search always uses **Vinted Germany**, EUR and its size IDs. German keywords are recommended; common English item names such as `jacket`, `bodysuit`, `trousers`, `scarf` and `beanie` map to German names offline via `src/search-terms.js`. Broader search adds curated alternatives such as Schlafanzug / Pyjama / Schlafanzüge, and Socken / Kindersocken / Stoppersocken when the native filters indicate Kids. The same size, category, brand, condition and price restrictions apply to every query. Other phrases pass through unchanged; there is no paid or general-purpose translation service.

## Filters

Filter IDs and German labels were checked against Vinted Germany’s public catalogue and visible filter menus on 2026-10-11. The snapshot is in `src/filter-options.js`.

- **Department:** Damen, Herren, Kinder. Multiple choices allowed; unchecked uses the list preference when enabled, otherwise any.
- **Category:** Search Vinted’s category tree in English or German within those departments. A specific category narrows the search instead of widening it with the parent department.
- **Size:** With Kinder selected, baby/kids clothing sizes are readily available: preemie and 44–176, plus one size and letter sizes. Children’s clothing sizes show the number first, with the age alongside. Shoes, hats and socks have their own menus. Select multiple sizes, grouped by department and item type (clothing, hats, socks, shoes, etc.). Uses actual Vinted size IDs, without guessing conversions between clothing systems.
- **Condition:** Neu, mit Etikett; Neu; Sehr gut; Gut; Zufriedenstellend. Multiple choices allowed; unchecked uses the list preference when enabled, otherwise any.
- **Brand:** Suggestions use verified Vinted brand IDs. Other typed brands use exact, case-insensitive matching on the fetched listings; this can miss listings outside those pages.
- **Price:** Maximum item price in EUR.

Native filters are sent to Vinted. Listings retain evidence of which filtered query returned them, so a result from a different department or size request cannot satisfy a filtered request just because its title matches. Explicit condition and brand requirements are also checked against listing labels. Imported records cannot verify department, category or native size IDs.

Known accessory keywords have German, French, Dutch and Italian title aliases. Other keywords must occur as a whole phrase in the title. This avoids unrelated search suggestions, but can miss translations or synonyms.

## Limits

Results cover the fetched search pages, not the whole marketplace or every seller’s wardrobe. Catalogue results expose seller IDs, so sellers display as `Seller #ID`. Responses are cached for five minutes.

This unofficial tool reads listing data embedded in public Vinted catalogue HTML, without executing its scripts. Vinted can block requests or change its page format. The app reports failures without substituting demo data or using an access bypass. Successful access does not establish Vinted authorisation. See [Vinted’s terms](https://www.vinted.de/terms-and-conditions).

## Privacy and credentials

Shopping lists, list preferences and language choice stay in your browser’s localStorage. Search keywords and filters are sent to the app server and Vinted. Live results are not saved between reloads. Item photos load from Vinted; fonts load from Google Fonts. The app does not need or store Vinted or GitHub credentials.

`.env*`, `.vercel/`, `node_modules/`, generated output and local test artifacts are excluded from Git. Hosting and GitHub credentials remain in the developer’s local authentication tools, outside this repository. Never commit credentials; use Vercel environment settings for any future server-only secret.

## Run locally

Requires Node.js 24. No dependency installation is needed.

```sh
git clone https://github.com/saarf77/gather-vinted.git
cd gather-vinted
npm start
```

Open http://127.0.0.1:4173. The local server binds to localhost. Use `PORT=4174 npm start` if needed.

## Deploy

Vercel runs `node scripts/build.mjs`, serves `public/`, and runs `api/search.mjs` as a Node function. GitHub Pages cannot run the search backend.

```sh
npx vercel --prod
```

Use Vercel Hobby for personal use. Free-plan limits can pause service; no paid fallback is configured.

## Verify

```sh
npm test
npm run build
node --check src/app.js
node --check api/search.mjs
```

Unit tests cover matching, assignment, parsing, constraints, filter query parameters, query evidence, message-key parity, filter translations, preference inheritance/overrides, separate accessory sizes, department compatibility, bilingual category search, bounded search depth and English-to-German item names. `tests/browser-smoke.cjs` is an optional integration suite requiring Playwright and installed Chrome. Run it against the local server; live results change over time.

## Import

**Import listings** accepts a JSON array of up to 1,000 listings / 1 MB, with EUR prices. Required: `id`, `sellerId`, `sellerName`, `title`, `price`. Optional: `size`, `brand`, `category`, `condition`, `url`, `currency`. Item URLs must be HTTPS Vinted Germany URLs. Import replaces loaded listings and keeps your shopping list.

```json
[{"id":"1","sellerId":"seller-1","sellerName":"Anna","title":"Wool scarf","size":"One size","condition":"Sehr gut","price":8,"currency":"EUR"}]
```

Categories appear before sizes. The selected categories automatically determine the relevant size groups, including separate groups for mixed category selections; no size-type dropdown is needed. Changing categories clears only incompatible size selections with a notice. Category filters use searchable checkboxes: select one or more acceptable Vinted categories, or leave empty for any category. Existing single-category selections remain compatible. Sock sizes stay aligned with Vinted: children use EU foot-size ranges, while adults use Vinted’s department-specific letters and foot ranges. Age labels belong to children’s clothing sizes; no age-to-foot conversion is assumed.
