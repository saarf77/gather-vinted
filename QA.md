# Shopper QA — 11 October 2026

Manual browser testing used the live Vercel app and an isolated local workspace with real Vinted catalogue searches. Counts are observations from that run, not guaranteed future results.

| Shopper flow | Observed result |
| --- | --- |
| Scarf + socks + beanie, Quick search | 287 real listings, 3 pages, one seller matching scarf + beanie; €8 item subtotal. |
| Same list, Search more | 799 real listings, 9 pages, five sellers matching two items. No seller covered all three. |
| Cancel another broader search | Previous five bundles remained visible with a cancellation message; Search more remained available. |
| Parent: Kids 86/92, Very good or better; Jacke ≤€12, Hose ≤€10, socks ≤€5 with their own foot size | 288 real listings, 3 pages; one seller matching jacket + trousers in native size 86, €9 subtotal. Sock sizes stayed separate. |
| Reload and DE/EN switch | List, language and preferences persisted. A Lupilu brand override and New with tags condition override persisted independently. Live results reset on reload. |
| Deliberately nonexistent keyword | Vinted supplied 96 unrelated fallback rows; Gather rejected them and showed zero matching sellers. |
| Updated rules: Kids 86/92, Shorts + Tights ≤€6 | 192 real listings, 2 pages; 124 sellers with single matches, no two-item seller. The empty bundle state offered Search more and Show all matches. German plural Strumpfhosen titles were accepted. |
| All matches and price sort | Single-item results appeared; lowest-subtotal sorting displayed €1 matches first. |
| Inherited size editing | 86/92 checked in the picker; unchecking 86 retained 92 after save/reload. Clear sizes retained Any size after reload; Use list sizes restored both defaults. |
| Category and name-based sizing | Kids bags used Any size. Name-only men's Trousers and Hemd offered their native trouser/shirt groups; T-shirt inherited general clothing sizes. |
| Mobile, 390 × 844 | Size controls fit without horizontal overflow; action spacing remained usable. |

## Fixes from this QA

- Categories without sizes could inherit hidden clothing restrictions. They now receive no inherited size IDs.
- Inherited sizes appeared in the summary but not as checked options. The picker now shows effective selections and supports a persistent per-item Any size override.
- Name-only men's trousers and shirts used general clothing sizes. They now use their separate native groups, including German Hemd.
- Name-only children's shorts, swimwear and bikini did not inherit clothing defaults. They now do.
- English requests rejected valid German singular/plural titles for sneakers, tights, rings and bras. Added explicit aliases, plus shorts terminology.

## Scope and limits

Automated validation: 64 Node tests, JavaScript syntax check and production build. Tests cover native filters, matching, unique listing assignment, query evidence, sizing, translations, parsing and search limits. Browser smoke scripts were not run; the flows above were exercised through the browser directly.

Gather compares the fetched catalogue pages. It does not exhaustively inspect every seller's wardrobe or all Vinted listings. Item URLs and real listing fields were inspected in results; checkout, payment, shipping and destination-page availability were not tested. No purchase was made. Vinted access can change or be blocked, and item availability must be checked on Vinted.

## Follow-up: pyjamas and socks

The reported two-item list used Kids size 98 pyjamas up to €10 and socks in EU 25–27 or 28–30 up to €15. A comparable search selected girls' Underwear & socks (1252) or boys' Socks (1757) within the socks item. Multiple native categories already use OR. The old shortened summary hid the branches and the difference between a parent category and a leaf.

- A saved real search contained seller 178980385's “Schlafanzüge dünn paw patrol” (€2, size 98) and “Dicke Stoppersocken” (€2, size 25–27). Strict title matching rejected the plural and compound words. Explicit aliases now recover this €4 bundle while unrelated “Sockenhalter” still fails.
- A fresh browser search after the fix fetched 549 listings on six pages and found seller 63344400 with “Merino Socken Gr. 29/30” (€3) and “Silly Santa Pyjama” (size 98, €5): €8 subtotal. Results change as Vinted listings change.
- Selected categories now show their full paths joined with “or” / “oder” in the editor and list. English/German switching and mobile wrapping were checked at 390 × 844, with no horizontal overflow.
- The empty 2+ view now explains the single-match count and that full wardrobes have not been checked.

Validation for this follow-up: 67 Node tests, JavaScript syntax check and production build.

## Follow-up: contextual query expansion

Broader search preserves its original catalogue depth and adds up to two related first-page searches when the global 30-request budget permits. Quick search stays at one page per item. Search more retains the alternatives while increasing original depth to five pages. Native category, size, condition, brand and price filters are identical on every alternative; duplicates merge by listing ID.

- Common simple EN/DE names use curated alternatives. Schlafanzug/Pyjamas searches Schlafanzug, Pyjama and Schlafanzüge. Socks/Socken with Kids context adds Kindersocken and Stoppersocken. Adult or ambiguous filters do not gain children-only terms. Qualified names such as “Paw Patrol Schlafanzug” and “red socks” remain unchanged.
- Preserved-page comparison using captured real listings: size-98 boys' pyjamas up to €10 increased from 244 to 306 matching listings; socks EU 25–27/28–30 up to €15 increased from 234 to 395. These are observations from that snapshot, not stable counts or an exhaustive search.
- Fresh browser Broader search: 762 unique listings across ten pages, 305 matching pyjama listings, 391 sock listings and one seller covering both at an €8 subtotal. The list now shows each item's matching-listing count, distinct from the number of sellers covering multiple items.
- Search more fetched 1,067 listings across 14 pages: 448 pyjama matches, 508 sock matches and two complete bundles (€4 and €8). The action disappeared at the five-original-page depth limit.
- German counts and mode descriptions and mobile wrapping at 390 × 844 were exercised in the browser. No paid service, embedding model or vector database was added. This remains curated query expansion rather than general semantic understanding.

Validation: 74 Node tests, JavaScript syntax checks and production build. Tests cover original-page preservation, complete filters and evidence, alternative-query fallback, duplicate merging, cancellation and the maximum 30 total requests.

## Follow-up: photo-first results grid

The supplied 9.85-second recording showed portrait listing images cropped into short, full-width seller rows; some displayed only carpet. Photos now retain their entire image in a 3:4 frame with `object-fit: contain`. Desktop results show several seller cards per row; bundles retain their seller grouping and use larger photos where space permits. Titles, distinct brand labels, size, translated condition and item price remain visible beneath the photos.

- A fresh real Quick search fetched 286 listings, 206 matching sellers and one two-item bundle. Desktop All matches at 1400 × 950 showed three photo columns with no horizontal overflow, including visible socks that had previously been cropped. These snapshot counts are not guarantees.
- At 390 × 844, single matches displayed in two columns with full photos. A two-item bundle spanned the row with its own two photos. No horizontal overflow.
- Lowest-price sorting, 2+ and complete-list filters, empty states, expanded details and EN/DE switching were exercised. Expanded details survived language changes.
- Photo/title/purchase links use the same validated Vinted URL. Keyboard Tab exposed a visible inset focus ring and descriptive name on both real photos and a local imported fixture with no image. No purchase or checkout action was performed.
- Automated tests cover visible metadata, safe item URLs, escaping untrusted listing text, missing metadata, duplicate catalogue title/brand fallback and accessible placeholder links.

Validation: 79 Node tests, JavaScript syntax checks and production build. Desktop and mobile proof screenshots are in ignored `artifacts/`.

## Follow-up: equal card heights

The initial grid left each card at its natural height. A live desktop reproduction measured a 74.17 px difference between two cards in the first row. The grid now stretches cards to their row height, with a flexible product area keeping collapsed seller footers aligned. Photos retain their full-image aspect ratio and listing text is not clipped.

Measured all multi-card rows after the fix: 69 rows at 1265 px desktop width, 103 rows at 1000 px tablet width and 102 rows at 390 px mobile width in German. Card-height differences and collapsed-footer bottom differences were 0 px. Details expansion/collapse remained usable and mobile had no horizontal overflow. Validation: 79 Node tests and production build.
