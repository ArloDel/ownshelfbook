# OwnShelfBook — Design System (Minimalism)

## Product context
OwnShelfBook is a single-user, offline web app (Indonesian UI copy) for cataloguing a personal comic & book collection **per volume** and arranging it on customizable **3D bookshelves** in a 3D room.

Key pages (tabs, no URL router):
1. **Ruang 3D** (default) — 3D room canvas. Two modes:
   - *Tata* (arrange): select / drag shelves, edit shelf shape in a right panel (name, rotation, width, tiers, per-tier column count & widths, depth, wood colour, duplicate, delete).
   - *Isi* (fill): click a shelf slot in 3D, tick books in the left "Belum ditata" (unplaced) list, place them; right panel shows slot capacity bar and slot contents (reorder ↑ ↓, Keluarkan).
2. **Koleksi** — all books grouped by series, filters (Jenis, Status), Tambah buku / Tambah berseri forms, Edit / Hapus per row, bulk select + delete.

Global shell: brand, two tabs, a search box (find a book → jump to it in 3D), Ekspor / Impor backup.

JTBD: "Record what I own quickly (whole series at once), then see and arrange it on shelves that look like mine."

## Visual direction — minimalism
- The **3D room is the hero**. Chrome around it should recede: fewer boxes, fewer borders, more whitespace.
- One sans-serif family everywhere. No serif headings, no decorative type.
- Monochrome UI + **one** accent used sparingly (primary action, active state, focus).
- Hierarchy by size, weight and space — not by boxes, fills or rules. Hairline dividers only where grouping by space is not enough.
- Flat: no gradients, no glow, no glassmorphism, no drop shadows except a single soft shadow on floating layers (dialog, popover, toast).
- Quiet controls: secondary buttons are text/ghost; only one solid button per view.
- Icons: none or a single thin-stroke set (1.5px) at 16px; never mix glyph styles.

## Colour
| Token | Value | Use |
|---|---|---|
| `--bg` | `#fafaf9` | page background |
| `--surface` | `#ffffff` | panels, inputs, dialogs |
| `--ink` | `#1c1b19` | primary text |
| `--muted` | `#6b6862` | secondary text (AA on bg) |
| `--faint` | `#a8a49d` | placeholders, disabled |
| `--line` | `#ebe9e5` | hairline dividers, input borders |
| `--hover` | `#f2f1ee` | row / ghost hover |
| `--accent` | `#2f5d50` | single accent: primary button, active tab underline, focus ring, selected slot |
| `--accent-ink` | `#ffffff` | text on accent |
| `--danger` | `#b3261e` | destructive text/buttons only |
| 3D canvas bg | `#f1efeb` | behind the room |

## Typography
- Family: `Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. Global `font-variant-numeric: tabular-nums`.
- Scale: 12 / 13 / 14 (base) / 16 / 20 / 28 px.
- Weights: 400 body, 500 labels & buttons, 600 headings. Headings use slight negative tracking (-0.01em).
- Labels: sentence case, 12px, `--muted`. No uppercase eyebrows.

## Spacing & layout
- 4px base: 4, 8, 12, 16, 24, 32, 48, 64.
- Top bar 56px, no bottom border; separated from content by space.
- Ruang 3D: left list 260px, right panel 300px, canvas fills the rest edge-to-edge. Side panels sit on `--bg` with no card boxes; sections inside panels separated by 24px and small 12px muted headings.
- Koleksi: single centred column max 880px; series as plain headings with count, rows 40px tall with hover fill, no row borders.

## Shape
- Radius: 6px controls, 10px floating layers (dialog/popover), 999px only for the segmented control and small tags.
- Borders 1px `--line`; inputs borderless-feeling (1px line, focus ring 2px accent at 30% alpha).

## Components
- **Primary button**: solid accent, 32px tall, 12px horizontal padding, 500 weight.
- **Ghost button**: no border, `--ink`, hover `--hover`.
- **Danger**: text `--danger`, ghost style; solid danger only inside the confirm dialog.
- **Tabs**: plain text, active = ink + 2px accent underline.
- **Segmented control** (Tata/Isi): pill track `--hover`, active segment white with soft shadow.
- **Inputs/selects**: 32px tall, `--surface`, 1px line.
- **Checkbox**: native, `accent-color: var(--accent)`.
- **Capacity bar**: 4px tall track `--line`, fill accent (danger when overflowing).
- **Tags**: 12px muted text, no pill background.
- **Dialog**: centred 400px, 10px radius, soft shadow `0 8px 32px rgba(0,0,0,.08)`.

## Motion
- 120–160ms ease-out for hover/press/focus; press scales 0.98.
- No decorative entrance animation. Respect `prefers-reduced-motion` (no camera tweening, no transitions).
