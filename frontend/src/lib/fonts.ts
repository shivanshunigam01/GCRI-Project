import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";

/** Primary UI — clean enterprise SaaS readability */
export const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/** Page titles & editorial accents */
export const fontDisplay = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
});
