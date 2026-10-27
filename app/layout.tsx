import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Source_Serif_4 } from "next/font/google";
import BackgroundField from "./background-field";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// Serif for names and numbers, sans for the rest.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Advisor Scout",
  description: "Find the papers, authors, and institutions shaping a research field.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${sourceSerif.variable} h-full`}>
      <body className="min-h-full text-ink">
        <ClerkProvider>
          <BackgroundField />
          <div className="relative z-10 flex min-h-full flex-col">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}
