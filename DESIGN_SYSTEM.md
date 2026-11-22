# PulseGate Locked Design System

Theme name: **Cloudflare Dark Ops Theme**.

## 1. Core palette
Use CSS variables only in `frontend/src/index.css`.
- `--color-background: #09090B`
- `--color-surface: #141416`
- `--color-accent: #F38020`

Neutral variables may represent text, borders, muted surfaces, hover states, and disabled states.
No extra saturated colors.
No purple, indigo, blue, slate, gradients, neon glow, or glow shadows.
No purple-indigo-blue-slate gradient combinations.

## 2. Typography
Load Figtree and JetBrains Mono in `frontend/index.html` with Google Fonts.
- Figtree is for UI, headings, navigation, labels, forms, buttons, and paragraphs.
- JetBrains Mono is for IDs, keys, URLs, timestamps, badges, and JSON.
- Allowed weights are 400, 500, and 600 only.
- Never use weight 700 or higher.
- Never introduce a third font family for application UI.

## 3. Icons
Use Lucide React only.
- Button and badge icons: 16 px.
- Navigation icons: 18 px.
- strokeWidth: 1.75.
- Icons inherit currentColor.
- No raw emojis in labels, status text, buttons, or navigation.
- No Font Awesome, emoji glyphs, custom SVG icon fonts, or other libraries.

## 4. Layout and surfaces
Use compact operational surfaces, clear borders, concise labels, and restrained spacing.
No decorative marketing hero is allowed in the dashboard.
No neon glow, dramatic shadows, or gratuitous animation.
Hover and selected states must be restrained and use the variable palette.

## 5. CSS rule
Colors, fonts, weights, sizes, borders, radii, and spacing are declared as CSS variables in `frontend/src/index.css`.
Components consume variables and do not hard-code repeated hex values.
No alternate CSS theme file may override the locked variables.

## 6. Component rules
Buttons use Figtree, 400 or 500 weight, and 16 px Lucide icons.
Badges use JetBrains Mono, 400 or 500 weight, and 16 px Lucide icons.
Navigation uses Figtree and 18 px Lucide icons.
IDs and JSON use JetBrains Mono.
Keyboard focus remains clearly visible.

## 7. Stage 4 stop rule
Before Stage 4, stop and ask the user for an exact font and color scheme if not already specified.
The specified fonts and Cloudflare tokens above are locked until the user explicitly changes them.
