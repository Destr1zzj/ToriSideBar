## v0.6.0 — Theme System

### What's New

**🎨 Theme System**

- **4 preset themes**: Dark (default), Light, Nord, Dracula
- **Custom theme**: Pick your own background, text, and accent colors — all other colors are auto-generated
- **Instant switch**: Theme changes apply immediately without restart
- **Persistent**: Your choice is saved to localStorage

### How to Use

Open the manage panel (⚙️), scroll to **Theme**, and click a preset or select **Custom** to use the color pickers.

### Technical Notes

- All 150+ hardcoded colors in `App.css` migrated to 35 CSS variables
- New `src/themes/index.ts` — theme definitions + custom theme generator
- New `src/hooks/useTheme.ts` — theme state management with DOM variable injection
