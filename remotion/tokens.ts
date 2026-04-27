// Standalone copy of tokens for the Remotion bundle. We use literal font stacks
// here instead of CSS variables because the Remotion bundler doesn't inherit
// the Next.js font setup.
export const T = {
  ink: {
    900: "#0B1A24",
    800: "#13262F",
    700: "#22343D",
    600: "#3B4C56",
    500: "#5C6B74",
    400: "#8B98A0",
    300: "#B7C0C6",
    200: "#DDE3E7",
    100: "#EEF1F3",
    50: "#F7F8F9",
  },
  paper: "#F4F1EA",
  paperAlt: "#EAE5DA",
  blue: { 700: "#0F4C8A", 600: "#1F6FEB", 500: "#2E83FF", 100: "#DCE8FB", 50: "#EAF1FE" },
  purple: "#6E48F0",
  resolved: "#1B7F4D",
  progress: "#C68A12",
  urgent: "#D83A1F",
  fontDisplay: "'Inter Tight', 'Inter', system-ui, sans-serif",
  fontUI: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, monospace",
} as const;
