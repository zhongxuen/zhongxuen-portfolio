# Fonts for the generated résumé PDF

These five latin-subset TrueType files exist for one consumer:
`lib/resume/theme.ts`, which registers them with `@react-pdf/renderer` so the
generated résumé is set in the same three faces as the site
(docs/admin-plan.md §8.2).

They are **not** used by the website. The site loads the same families through
`next/font/google` in `app/layout.tsx`, which downloads and self-hosts them at
build time — but those files live inside `.next/` under hashed names that
nothing can reference at runtime, and `@react-pdf` cannot read a `.woff2`
anyway. Hence a second copy, in the one format the PDF renderer accepts.

| File | Family, weight | Role in the PDF |
|---|---|---|
| `SpaceGrotesk-Bold.ttf` | Space Grotesk 700 | The name at the top, and nothing else |
| `Inter-Regular.ttf` | Inter 400 | Body copy and bullets |
| `Inter-SemiBold.ttf` | Inter 600 | Role and project titles |
| `IBMPlexMono-Regular.ttf` | IBM Plex Mono 400 | Dates, contact line, tech chips |
| `IBMPlexMono-Medium.ttf` | IBM Plex Mono 500 | Section labels |

Latin subsets, ~215 KB for all five. Google Fonts' static instances, fetched
from `fonts.gstatic.com`.

## Licences

All three families are under the SIL Open Font License 1.1, which permits
bundling and redistribution:

- Inter — © The Inter Project Authors (https://github.com/rsms/inter)
- Space Grotesk — © Florian Karsten (https://github.com/floriankarsten/space-grotesk)
- IBM Plex Mono — © IBM Corp. (https://github.com/IBM/plex)

Full licence text: https://openfontlicense.org

## Replacing one

Weights are registered by filename in `lib/resume/theme.ts`. Swap a file, keep
the name, and nothing else changes. `next.config.ts` keeps this whole directory
in the résumé route's function bundle via `outputFileTracingIncludes` — nothing
statically imports a `.ttf`, so Next's tracer would otherwise leave them out.
