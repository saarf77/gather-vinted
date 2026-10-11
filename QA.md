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
