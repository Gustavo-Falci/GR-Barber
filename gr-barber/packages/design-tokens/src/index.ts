// Mesmos valores do design system (gr-barber-design-system.html).
// Em objetos planos, não CSS — o React Native usa StyleSheet.create
// com esses valores; o Next.js pode consumi-los direto ou expor
// como CSS custom properties num provider.

export const colors = {
  light: {
    paper: "#F3F0E7",
    paperSoft: "#FAF8F3",
    surface: "#FFFFFF",
    ink: "#202020",
    inkSoft: "#514c42",
    muted: "#8a8375",
    line: "#e6e0d3",
    accent: "#FFD900",
    accentBorder: "#FFFB7B",
    paleYellow: "#FFF3B8",
    paleBlue: "#EFF8FA",
    dark: "#1A1A1A",
    shadow: "#000000",
  },
  dark: {
    paper: "#17160F",
    paperSoft: "#252419",
    surface: "#2C2A1F",
    ink: "#F3F0E7",
    inkSoft: "#cbc4b3",
    muted: "#B0A890",
    line: "#3d3b2e",
    accent: "#FFD900", // inalterado — continua pop igual
    accentBorder: "#FFFB7B",
    paleYellow: "#3d3410",
    paleBlue: "#152329",
    dark: "#1A1A1A",
    shadow: "#F3F0E7", // sombra clara no escuro, senão some contra o fundo
  },
} as const;

export const radius = {
  sm: 11,
  md: 14,
  lg: 20,
  xl: 32,
  pill: 999,
} as const;

// deslocamento fixo, sem blur — a assinatura neobrutalista.
// No React Native isso vira uma view extra atrás (elevation
// nativo não reproduz sombra "offset"); no web é box-shadow direto.
export const shadowOffset = {
  sm: { x: 0, y: 3 },
  md: { x: 0, y: 4 },
  lg: { x: 0, y: 8 },
} as const;

export const typography = {
  display: {
    // produção: Clash Grotesk (Fontshare, licença Indie gratuita)
    fontFamily: "ClashGrotesk-Bold",
    fontWeight: "700",
  },
  body: {
    fontFamily: "Inter-Regular",
    fontWeight: "400",
  },
  bodyBold: {
    fontFamily: "Inter-SemiBold",
    fontWeight: "600",
  },
} as const;

export type ThemeMode = "light" | "dark";
export type Colors = typeof colors.light;
