# Design handoff — Complaint form visual refresh

**For Claude Code.** This document describes the visual design for the public
`/submit` complaint form. The reference prototype lives in this design project
at `Complaint form.html` + `complaint-form.jsx`. Apply the visual layer to the
**current** `src/app/submit/ComplaintForm.tsx` without changing logic.

---

## Operating rules — read first

1. **Do not change behaviour.** Keep every existing piece of logic in
   `ComplaintForm.tsx` exactly as it is:
   - Supabase RPC (`submit_complaint`)
   - Phone E.164 conversion, `validatePhone`, `formatPhoneDisplay`
   - QR pre-fill (`?bus=…&route=…&time=…`)
   - Photo compression (`compressImage`, 5MB limit)
   - Severity auto-assign + `is_about_steward_head` flag + Driver/Steward
     subcategory state
   - Field validation + error messages
   - Confirmation screen routing
   - Whatever new fields/state were added since this design was drafted

2. **Only touch the visual layer.** Tailwind classes, layout structure, copy
   for headings, and small reorderings that don't change what data is
   captured.

3. **If you find new fields not covered here**, style them using the same
   tokens (colors, radii, typography) and the same Field/Section primitives
   described below. Do not invent a new visual system for them.

4. **Stay on Tailwind + CSS variables already in `globals.css`.** Do not add
   new dependencies. Replace the existing `--primary`/`--background` values
   in `globals.css` with the tokens below — don't hardcode the colors per
   element.

---

## Design tokens

Replace the `:root` block of `src/app/globals.css` with the **Service**
direction (deep emerald, warm whites). This is the chosen default.

```css
:root {
  /* Surfaces */
  --background:        38 32% 93%;   /* #F4EFE5 warm cream */
  --foreground:        160 14% 10%;  /* #161F1B */
  --card:              0 0% 100%;
  --card-foreground:   160 14% 10%;
  --popover:           0 0% 100%;
  --popover-foreground:160 14% 10%;
  --muted:             40 30% 90%;   /* #F0EAD9 */
  --muted-foreground:  140 5% 44%;   /* #6B776E */
  --accent:            40 30% 90%;
  --accent-foreground: 160 14% 10%;

  /* Brand */
  --primary:           167 71% 21%;  /* #0F5D4E deep emerald */
  --primary-foreground:42 53% 95%;   /* #F7F3E9 */

  /* Lines */
  --border:            42 28% 83%;   /* #E1D9C5 */
  --input:             42 28% 83%;
  --ring:              167 71% 21%;

  --destructive:           5 60% 44%; /* #B43D2E */
  --destructive-foreground:42 53% 95%;

  --radius: 0.75rem; /* 12px — used for inputs */
}
```

Additional design-only values not in shadcn defaults:

| Purpose                  | Value                       | Tailwind                 |
|--------------------------|-----------------------------|--------------------------|
| Section card radius      | `1.125rem` (18px)           | `rounded-[18px]`         |
| Receipt / hero card radius | `1.625rem` (26px)         | `rounded-[26px]`         |
| Accent amber (suggestion)| `#B47339`                   | hardcode as `bg-[#B47339]` |
| Accent soft (chip bg)    | `#F2E4CF`                   | `bg-[#F2E4CF]`           |
| Faint text (hint, eyebrow)| `#9AA59C`                  | `text-[#9AA59C]`         |
| Border-strong (dashed)   | `#C9C0A8`                   | `border-[#C9C0A8]`       |

**Typography.** Add Geist + Geist Mono via `next/font/google` in
`layout.tsx`. Use Geist Sans everywhere; use Geist Mono for: the reference
number, the route code chip (`FSD → LHE`), the +92 prefix, time values, and
the barcode caption.

---

## Page structure

The form runs from top to bottom in this order. Sections are separated by a
dashed-rule header, not a card boundary.

1. **Trust strip** (full bleed, primary background)
   - Copy: "Goes directly to the depot manager · 24-hour response"
   - Small shield icon at left
   - 40px tall, 12px text, 500 weight

2. **Hero block**
   - Row: circular bus-mark (44px, primary bg) · "SUBHAN TRAVELS" wordmark
     (uppercase, 0.06em tracking, 17px, 700) with "Passenger complaints ·
     Faisalabad" caption · EST 2014 column at right separated by a vertical
     dashed rule
   - H1: "Tell us what happened." — 32px, 600, -0.02em tracking
   - Subtitle: "Tell us what happened — we read every message." — 14px, muted
   - Italic helper: "Hum sun rahay hain" — 12px, faint

3. **Section: "Your contact" (Taake hum aap se rabta kar sakein)** — first, because a complaint must be reachable
   - Mobile number — input with a `+92` mono prefix block at left, separated
     by a vertical rule. Hint: "WhatsApp pe reply ayegi"
   - Your name — plain input, marked optional. Hint: "Optional — agar batana chahein"

4. **Section: "Your trip" (Safar ki tafseel)**
   - **Journey strip** at the top — ticket-style card with:
     - Top row: "YOUR JOURNEY" eyebrow / date stamp (mono)
     - 3-column grid: origin code (24-26px serif/sans header) over origin
       city (10.5px uppercase muted) · road dashes with bus icon centered ·
       destination code/city, right-aligned
     - Dashed perforation
     - Bottom: Departure time + Bus number (mono, 14px)
     - Two punched-circle cutouts at vertical center on the card edges
   - Then the editable form fields in this order:
     - Route picker (custom button — route icon · name · short-code mono chip)
     - Travel date + Departure time in a `grid-cols-[1.2fr_1fr]`
     - Bus number with hash icon

5. **Section: "What happened? (Kya masla hua?)"**
   - Category grid: strict `grid-cols-2 gap-2.5`, **8 uniform tiles** (no
     full-width oddball, no row-span tricks). 92px min-height per tile.
   - Each tile: icon in a soft 38×38 rounded-md tile (top-left) over the
     label (13.5px, 600). Selected: primary bg, primary-foreground, soft
     shadow `0 6px 16px <primary>40`, with a tiny check pip top-right
   - Suggestion tile spans full width if it's the last odd cell and uses the
     amber accent (`#B47339`) instead of primary when selected
   - **Subcategory reveal** (only when category is one of DRIVER, STEWARD,
     BUS_CONDITION, DELAY_TIMING): a muted-bg card below the grid with
     uppercase eyebrow "<Category> · specifics" and a strict 2-column grid
     of subcategory pills. **Every category has 4 subcategories** (DELAY_TIMING
     now includes an "Other" item) so the grid is always 2×2 and never has
     a dangling cell.
     - Pill min-height: **76px**, padding 14px, row layout: 36×36 icon tile
       on the left + label/hint stack on the right
     - Icon tile background: `surfaceMuted` when unselected, white-at-16%
       when selected. Icon color: primary unselected, primary-foreground
       selected
     - Each pill gets its own icon (snowflake for AC, phone-off for
       phone-while-driving, frown for rude, ear for unresponsive, sparkles
       for cleanliness, armchair for seat, tablet for entertainment tablet,
       timer/pin/stops for delays, question-mark for "Other", etc.)
     - Selected pill: primary bg, primary-foreground text, soft shadow
       `0 4px 12px <primary>30`
   - **Severity bar** (always when a category is selected): a thin row with
     three 7×18px segments showing the auto-assigned level, the label
     ("High / Medium / Low priority"), the routing note ("Flagged to admin"
     etc), and a small mono "AUTO" badge at right
   - Description textarea (4 rows, 500 char cap, count in the hint).
     Placeholder: "Bus number, time, what the driver/steward did, what
     happened on the route..." — prompts the bus-specific details
   - Photo slot — 84px tall dashed-border button with camera icon in a
     muted-bg tile + "Add a photo" / "Camera · gallery · max 5 MB" caption.
     When a file is attached, swap for a 120px striped tile showing the file
     name in a mono badge with a black close pill in the top-right.

6. **Submit dock** — fixed to the bottom of the scroll area
   - 56px primary button "Submit complaint" with a chevron at right
   - Caption underneath: "Reference generated instantly · response within 24
     hours"
   - Background is a vertical fade from transparent to page bg so content
     doesn't crash into it

---

## Section / Field primitives

Build these once and reuse.

### `<FormSection>`

```
header row (dashed bottom border, 1px dashed --border):
  H2 title (18px, 600, headerFont)
  optional caption (italic, 11.5px, faint)
  optional "Optional" chip (10px uppercase, muted bg, rounded-full)
content area: flex-col gap-3.5
```

### `<Field>`

```
label row: 13px 600 label · red asterisk if required · "optional" chip if optional
children: input/control
optional hint: 11.5px, faint, 6px top margin
```

### Input styles

- Height 52px, padding `0 16px`, white bg, 1px border `--border`, radius
  12px, 16px text, font Geist
- Focus: border becomes primary, plus a 4px primary-at-10%-alpha ring (do
  this with `focus:ring-4 focus:ring-primary/10 focus:border-primary`)
- Inline left icons (calendar, hash, clock) sit at `left: 14px`, color
  muted-foreground, 16px

---

## Confirmation screen

This is the second major piece. When `confirmation` state is set, render
a paper-ticket receipt instead of the form:

1. Check icon — 60px primary circle with two concentric thin rings outside,
   centered.
2. H1 "Complaint received" — 26px, 600. Subtitle "Aap ki shikayat hum tak
   pohanch gayi hai" — 13px, muted.
3. **Receipt card** with serrated top/bottom edges (10px tall triangular SVG
   pattern, fill = surface, stroke = border):
   - Brand row: bus mark (32px) · "SUBHAN TRAVELS" + "COMPLAINT RECEIPT"
     caption · date stamp (mono) at right, separated by a 1px border
   - Route viz row (same as JourneyStrip's center) — 20px padding above and
     below
   - Perforation row: dashed rule across, with punched-circle cutouts at
     both edges (positioned to align with the card sides)
   - Reference block (centered): "REFERENCE NUMBER" eyebrow · big mono
     reference (24px primary) · italic "Screenshot to track later"
   - Trip details grid (3 cols): Date · Time · Bus, all mono
   - Barcode strip: a 32px-tall row of variable-width black bars derived
     from the reference, with the reference repeated below in mono (9.5px,
     0.3em tracking)
4. **"What happens next" card** — muted bg, 16px padding, three timeline
   steps with circle markers (28px) connected by a 1px vertical rule:
   - 1 (done, primary) — "Auto-triaged" · "Sent to the right team in seconds"
   - 2 — "We investigate" · "Within 24 hours, on WhatsApp"
   - 3 — "Resolution + follow-up" · "Plus a satisfaction check"
5. Two-up button row: Share (outline) / Track status (primary), 50px tall.
6. Tiny underline "← Back to the form" link below.

---

## Where to look in the reference

The complete renderable version is in this project:

- `Complaint form.html` — entry point + Tweaks panel
- `complaint-form.jsx` — all components
- `themes.jsx` — three direction palettes; use the `service` object as the
  source of truth for tokens
- `icons.jsx` — every icon used, all 24×24 stroked SVGs. Either copy them
  into the Next.js project as React components, or swap to `lucide-react`
  equivalents (Bus, Car, UserCheck, UtensilsCrossed, Clock, Ticket,
  AlertTriangle, Lightbulb, Camera, Check, ChevronRight, Hash, Shield,
  Share, X, MapPin, Sparkles)

---

## Things to verify after applying

- [ ] Phone +92 prefix renders mono and is visually separated from input
- [ ] Route picker shows the IATA-style short code on the right (`FSD → LHE`)
- [ ] JourneyStrip updates live as the user changes route/date/time/bus
- [ ] Tapping a category that has subcategories reveals the subcat card with
      the 280ms ease-out slide-in animation
- [ ] Selected category tile shows the primary background AND the small
      check pip in the top-right
- [ ] Suggestion / Feedback category uses amber (`#B47339`), not primary
- [ ] Description char count updates in the hint row
- [ ] Submit dock stays pinned to the bottom of the device scroll area, not
      the page
- [ ] Confirmation screen serrated edges render (SVG pattern, not background
      image) and punched-circle cutouts sit on the card's left/right edges
- [ ] All existing validation, Supabase calls, QR pre-fill, photo upload,
      severity logic, and steward-head flagging still work end-to-end

---

## Copy reference (preserve exactly)

| Where                   | English                                    | Roman Urdu                                          |
|-------------------------|--------------------------------------------|-----------------------------------------------------|
| Trust strip             | Goes directly to the depot manager · 24-hour response | —                                          |
| Hero H1                 | Tell us what happened.                     | —                                                   |
| Hero subtitle           | Tell us what happened — we read every message. | —                                               |
| Hero helper             | —                                          | Hum sun rahay hain                                  |
| Section · Your trip     | Your trip                                  | Safar ki tafseel                                    |
| Section · What happened | What happened?                             | Kya masla hua?                                      |
| Section · Your contact  | Your contact                               | Taake hum aap se rabta kar sakein                   |
| Mobile hint             | WhatsApp pe reply ayegi                    | —                                                   |
| Route hint              | Apna safar ka rasta                        | —                                                   |
| Bus number hint         | Ticket ya bus par likha number. Naa ho to "unknown" | —                                          |
| Submit dock caption     | Reference generated instantly · response within 24 hours | —                                     |
| Confirm H1              | Complaint received                         | Aap ki shikayat hum tak pohanch gayi hai            |
| Receipt label           | COMPLAINT RECEIPT · REFERENCE NUMBER       | —                                                   |
| Next-step 1             | Auto-triaged · Sent to the right team in seconds | —                                             |
| Next-step 2             | We investigate · Within 24 hours, on WhatsApp | —                                                |
| Next-step 3             | Resolution + follow-up · Plus a satisfaction check | —                                           |
