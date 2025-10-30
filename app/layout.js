"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
const google_1 = require("next/font/google");
require("./globals.css");
const geistSans = (0, google_1.Geist)({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = (0, google_1.Geist_Mono)({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
const playfair = (0, google_1.Playfair_Display)({
    variable: "--font-playfair",
    subsets: ["latin"],
    weight: ["400", "700"],
});
exports.metadata = {
    title: "atlas of our skies",
    description: "A personal atlas of photos and skies — images, dates, and locations captured across many places.",
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
    },
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
        { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
    ],
    openGraph: {
        title: "atlas of our skies",
        description: "the heavens tell a profound story each time. it carries the weight of the world. it serves as a ever-present reminder that the world is still turning. it is the canvas of our dreams :)",
        url: "https://atlas-of-my-skies.stimmie.dev",
        siteName: "atlas of my skies",
        images: [
            {
                url: "/images/83.jpg",
                width: 1200,
                height: 630,
                alt: "atlas of my skies",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "atlas of our skies",
        description: "the heavens tell a profound story each time. it carries the weight of the world. it serves as a ever-present reminder that the world is still turning. it is the canvas of our dreams :)",
        images: ["/images/83.jpg"],
    },
};
function RootLayout({ children, }) {
    return ((0, jsx_runtime_1.jsx)("html", { lang: "en", className: `${geistSans.variable} ${geistMono.variable} ${playfair.variable}`, children: (0, jsx_runtime_1.jsx)("body", { className: "antialiased", children: children }) }));
}
//# sourceMappingURL=layout.js.map