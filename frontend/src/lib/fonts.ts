import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

/** Primary UI — clean enterprise SaaS readability */
export const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/**
 * Module / page titles — Fraunces supports real bold weights
 * (Instrument Serif was display-only at 400 and read too light).
 */
export const fontDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["600", "700", "800", "900"],
});
