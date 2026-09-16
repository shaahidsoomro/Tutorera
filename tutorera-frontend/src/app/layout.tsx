import ConditionalLayout from "@/components/ConditionalLayout";
import LazyWidgets from "@/components/LazyWidgets";
import LocaleBridge from "@/components/LocaleBridge";
import SkipLink from "@/components/SkipLink";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { LEGAL_OPERATOR,PLATFORM_NAME,SITE_URL,SUPPORT_EMAIL,SUPPORT_PHONE } from "@/lib/site";
import type { Metadata,Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "TUTORERA | Global Online & In-Person Tutoring Marketplace",
    template: "%s | TUTORERA",
  },
  description: "Post a tutoring requirement with your preferred budget and currency, receive offers from eligible tutors, compare profile information, and choose online or locally available in-person tuition.",
  keywords: [
    "online tutors worldwide",
    "find tutors",
    "student demand tutoring marketplace",
    "home tuition",
    "O Level tutor",
    "A Level tutor",
    "GCSE IGCSE tutors",
    "IB tutors",
    "Matric FSc tutor",
    "private tutors",
    "tutors in UAE",
    "tutors in UK",
    "tutors in Pakistan",
    "TUTORERA",
  ],
  authors: [{ name: "MENTISERA (SMC-Private) Limited" }],
  creator: "MENTISERA",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  publisher: "TUTORERA",
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
      { url: "/tutorera-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/tutorera-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "TUTORERA",
    title: "TUTORERA | Global Online & In-Person Tutoring Marketplace",
    description: "Post your tuition requirement with your preferred budget and currency. Receive offers from eligible tutors locally or worldwide and compare before choosing.",
    images: [
      {
        url: "/tutorera-logo-transparent.png",
        width: 1200,
        height: 630,
        alt: "TUTORERA by MENTISERA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TUTORERA | Global Online & In-Person Tutoring Marketplace",
    description: "Post your requirement, receive tutor offers, compare rates in the relevant currency, and choose the tutor that fits your needs.",
    images: ["/tutorera-logo-transparent.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0329B2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: PLATFORM_NAME,
        legalName: LEGAL_OPERATOR,
        url: SITE_URL,
        logo: `${SITE_URL}/tutorera-logo-transparent.png`,
        description: "Global student-led demand marketplace for online and in-person tutoring. Students post requirements with preferred budgets and eligible tutors can respond with offers.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "House 387, Street 11, Phase 5-b, Ghauri Town",
          addressLocality: "Islamabad",
          addressRegion: "Islamabad Capital Territory",
          postalCode: "44000",
          addressCountry: "PK",
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: SUPPORT_PHONE,
            contactType: "customer service",
            email: SUPPORT_EMAIL,
            availableLanguage: ["English", "Urdu", "Arabic"],
          },
        ],
        areaServed: [
          { "@type": "Place", name: "Worldwide" },
          { "@type": "Country", name: "Pakistan" },
          { "@type": "Country", name: "United Arab Emirates" },
          { "@type": "Country", name: "United Kingdom" },
        ],
        sameAs: ["https://mentisera.com"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: PLATFORM_NAME,
        description: "Global student-led tutoring marketplace connecting learners with tutor profiles and offers across supported markets.",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/tutors?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}/#service`,
        serviceType: "Online & In-Person Tutoring Marketplace",
        provider: { "@id": `${SITE_URL}/#organization` },
        description: "Student-led tutoring marketplace where students post requirements in the relevant market currency and eligible tutors can respond with customized offers.",
        areaServed: { "@type": "Place", name: "Worldwide" },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-TDJ8C953');
          `}
        </Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-7NF2DR8MG6" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7NF2DR8MG6');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <SkipLink />
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TDJ8C953" height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
        </noscript>
        <AuthProvider>
          <LocaleBridge>
            <SocketProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
              <LazyWidgets />
            </SocketProvider>
          </LocaleBridge>
        </AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#021550",
              color: "white",
              fontSize: "0.875rem",
              borderRadius: "0.5rem",
            },
            success: { iconTheme: { primary: "#16a34a", secondary: "white" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "white" } },
          }}
        />
      </body>
    </html>
  );
}
