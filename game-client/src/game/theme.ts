/**
 * Game UI theme — shared across all client scenes and DOM overlays.
 * This is a pixel-art zombie survival game; the palette is dark, gritty,
 * and post-apocalyptic (decay, rust, aged metal) so UI stays consistent.
 */

/** Reusable color palette (hex) for Phaser, DOM, and future HUD */
export const colors = {
  // Backgrounds & panels
  bgDark: "#1a1814",
  bgPanel: "#3a2e20",
  bgPanelLight: "#5a4a35",
  bgPaper: "#9b8b74",

  // Borders & surfaces
  borderDark: "#282828",
  borderMetal: "#4a4a4a",
  borderRust: "#6b5344",

  // Accents — interactive, highlights, progress
  accentRust: "#cc5c20",
  accentRustMuted: "#a54b1a",
  accentGold: "#f0c060",
  accentGoldDim: "#e0a040",

  // Text
  textPrimary: "#f0f0f0",
  textSecondary: "#d0d0d0",
  textMuted: "#9a9a9a",
  textGold: "#f0c060",

  // Status / feedback
  statusSuccess: "#7a9a6e",
  statusWarning: "#c49450",
  statusError: "#b54a4a",
} as const;

/** Phaser text style presets — use these for labels, titles, buttons, status */
export const textStyles = {
  title: {
    fontFamily: "Arial Black",
    fontSize: 38,
    color: colors.textGold,
    stroke: colors.bgDark,
    strokeThickness: 6,
    align: "center" as const,
  },
  heading: {
    fontFamily: "Arial",
    fontSize: 24,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: "Arial",
    fontSize: 18,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontFamily: "Arial",
    fontSize: 16,
    color: colors.textSecondary,
  },
  button: {
    fontFamily: "Arial",
    fontSize: 22,
    color: colors.textPrimary,
  },
  buttonHover: {
    fontFamily: "Arial",
    fontSize: 22,
    color: colors.accentGold,
  },
  label: {
    fontFamily: "Arial",
    fontSize: 18,
    color: colors.textSecondary,
  },
  status: {
    fontFamily: "Arial",
    fontSize: 16,
    color: colors.textSecondary,
  },
  statusError: {
    fontFamily: "Arial",
    fontSize: 16,
    color: colors.statusError,
  },
} as const;
