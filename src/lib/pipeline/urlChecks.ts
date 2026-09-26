import type { Signal } from "./ruleSignalEngine";
import axios from "axios";
import { parse } from "tldts";

import { domainToUnicode } from "node:url";

const SUSPICIOUS_KEYWORDS = [
  "login",
  "signin",
  "verify",
  "verification",
  "secure",
  "account",
  "update",
  "confirm",
  "password",
  "credential",
  "wallet",
  "recover",
  "unlock",
  "suspend",
  "suspended",
  "payment",
  "invoice",
  "reward",
  "prize",
  "bonus",
];

const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".scr",
  ".bat",
  ".cmd",
  ".msi",
  ".apk",
  ".jar",
  ".vbs",
  ".ps1",
];

const BRANDS = [
  // Global
  "paypal", "google", "gmail", "youtube", "microsoft", "office365",
  "apple", "icloud", "amazon", "facebook", "messenger", "instagram",
  "whatsapp", "telegram", "tiktok", "twitter", "linkedin", "github",
  "netflix", "spotify", "dropbox", "docusign",

  // Payments & crypto
  "payoneer", "binance", "coinbase", "bybit", "kucoin", "metamask", "trustwallet",

  "hotmail", "skype", "onedrive", "sharepoint", "microsoft365",
  "yahoo", "protonmail", "snapchat", "discord", "reddit", "pinterest",
  "wetransfer", "openai", "chatgpt", "samsung", "xiaomi",

  // Shopping
  "ebay", "alibaba", "aliexpress", "temu", "shein", "walmart", "shopify",

  // Streaming & games
  "primevideo", "disneyplus", "hotstar", "hoichoi", "garena", "pubg",
  "roblox", "epicgames", "playstation", "steampowered", "steamcommunity",

  // Travel
  "airbnb", "qatarairways",

  // Payments & crypto
  "mastercard", "americanexpress", "skrill", "neteller", "revolut", "venmo",
  "westernunion", "moneygram", "remitly", "worldremit", "bitget", "mexc",

  // Delivery
  "fedex", "aramex",

  // Bangladesh
  "bkash", "nagad", "dutchbangla", "bracbank", "citybank", "islamibank",
  "sonalibank", "grameenphone", "banglalink", "teletalk", "daraz",
  "pathao", "foodpanda", "bdjobs",
  "bangladeshbank", "janatabank", "agranibank", "primebank", "ificbank",
  "hsbc", "standardchartered", "chaldal", "rokomari", "shohoz", "bikroy",
  "ekpay",
];

const TRUSTED_BRAND_DOMAINS: Record<string, string[]> = {
  google: [
    "google.com", "google.com.bd", "google.co.uk", "google.de", "google.co.in", "google.ca",
    "gmail.com", "youtube.com", "youtu.be", "g.co", "goo.gl",
    // Google's own content/CDN domains (image and file links use these)
    "googleusercontent.com", "googleapis.com", "googlevideo.com",
  ],
  youtube: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
  gmail: ["gmail.com", "google.com"],
  microsoft: [
    "microsoft.com", "live.com", "outlook.com", "office.com", "microsoftonline.com",
    "bing.com", "xbox.com", "azure.com", "microsoft365.com",
  ],
  outlook: ["outlook.com", "live.com", "office.com", "microsoft.com"],
  office365: ["office.com", "microsoft.com", "microsoftonline.com"],
  microsoft365: ["microsoft365.com", "microsoft.com", "office.com"],
  hotmail: ["hotmail.com", "live.com", "outlook.com"],
  skype: ["skype.com"],
  onedrive: ["onedrive.live.com", "onedrive.com", "1drv.ms", "live.com"],
  sharepoint: ["sharepoint.com"],
  apple: ["apple.com", "icloud.com", "me.com"],
  icloud: ["icloud.com", "apple.com"],
  amazon: [
    "amazon.com", "amazon.co.uk", "amazon.de", "amazon.in", "amazon.ca", "amazon.co.jp",
    "amazon.ae", "amazon.sg",
    // Amazon Web Services file hosting (s3.amazonaws.com links)
    "amazonaws.com",
  ],
  primevideo: ["primevideo.com", "amazon.com"],
  facebook: ["facebook.com", "facebook.net", "fb.com", "fb.me", "messenger.com", "meta.com"],
  messenger: ["messenger.com", "facebook.com"],
  instagram: ["instagram.com", "cdninstagram.com"],
  whatsapp: ["whatsapp.com", "whatsapp.net", "wa.me"],
  telegram: ["telegram.org", "telegram.me", "t.me"],
  tiktok: ["tiktok.com", "tiktokcdn.com"],
  twitter: ["twitter.com", "x.com", "t.co"],
  linkedin: ["linkedin.com", "lnkd.in"],
  github: ["github.com", "githubusercontent.com"],
  yahoo: ["yahoo.com"],
  protonmail: ["protonmail.com", "proton.me"],
  snapchat: ["snapchat.com"],
  discord: ["discord.com", "discord.gg", "discordapp.com"],
  reddit: ["reddit.com", "redd.it"],
  pinterest: ["pinterest.com"],
  wetransfer: ["wetransfer.com", "we.tl"],
  openai: ["openai.com", "chatgpt.com"],
  chatgpt: ["chatgpt.com", "openai.com"],
  samsung: ["samsung.com"],
  xiaomi: ["xiaomi.com", "mi.com"],
  netflix: ["netflix.com"],
  spotify: ["spotify.com"],
  zoom: ["zoom.us", "zoom.com"],
  dropbox: ["dropbox.com"],
  docusign: ["docusign.com", "docusign.net"],
  adobe: ["adobe.com"],
  steam: ["steampowered.com", "steamcommunity.com"],
  steampowered: ["steampowered.com", "steamcommunity.com"],
  steamcommunity: ["steamcommunity.com", "steampowered.com"],

  // ── Shopping ──
  ebay: ["ebay.com", "ebay.co.uk", "ebay.de"],
  alibaba: ["alibaba.com"],
  aliexpress: ["aliexpress.com", "aliexpress.us"],
  temu: ["temu.com"],
  shein: ["shein.com"],
  walmart: ["walmart.com"],
  shopify: ["shopify.com"],

  // ── Streaming & games ──
  disneyplus: ["disneyplus.com"],
  hotstar: ["hotstar.com"],
  hoichoi: ["hoichoi.tv"],
  garena: ["garena.com"],
  pubg: ["pubg.com", "pubgmobile.com"],
  roblox: ["roblox.com"],
  epicgames: ["epicgames.com"],
  playstation: ["playstation.com"],

  // ── Travel ──
  airbnb: ["airbnb.com"],
  qatarairways: ["qatarairways.com"],

  // ── Payments & crypto ──
  paypal: ["paypal.com", "paypal.me", "paypalobjects.com"],
  mastercard: ["mastercard.com"],
  americanexpress: ["americanexpress.com"],
  skrill: ["skrill.com"],
  neteller: ["neteller.com"],
  revolut: ["revolut.com"],
  venmo: ["venmo.com"],
  westernunion: ["westernunion.com"],
  moneygram: ["moneygram.com"],
  remitly: ["remitly.com"],
  worldremit: ["worldremit.com"],
  bitget: ["bitget.com"],
  mexc: ["mexc.com"],
  payoneer: ["payoneer.com"],
  wise: ["wise.com"],
  binance: ["binance.com"],
  coinbase: ["coinbase.com"],
  bybit: ["bybit.com"],
  okx: ["okx.com"],
  kucoin: ["kucoin.com"],
  metamask: ["metamask.io"],
  trustwallet: ["trustwallet.com"],
 
  // ── Delivery (parcel / customs scams) ──
  dhl: ["dhl.com"],
  fedex: ["fedex.com"],
  aramex: ["aramex.com"],
  ups: ["ups.com"],
  usps: ["usps.com"],
 
  // ── Bangladesh: mobile financial services ──
  bkash: ["bkash.com"],
  nagad: ["nagad.com.bd"],
  rocket: ["dutchbanglabank.com"],
  dbbl: ["dutchbanglabank.com"],
  dutchbangla: ["dutchbanglabank.com"],
  upay: ["upaybd.com"],
 
  // ── Bangladesh: banks ──
  bracbank: ["bracbank.com"],
  citybank: ["thecitybank.com"],
  ebl: ["ebl.com.bd"],
  islamibank: ["islamibankbd.com"],
  sonalibank: ["sonalibank.com.bd"],
  bangladeshbank: ["bb.org.bd"],
  janatabank: ["jb.com.bd"],
  agranibank: ["agranibank.org"],
  primebank: ["primebank.com.bd"],
  ificbank: ["ificbank.com.bd"],
  hsbc: ["hsbc.com", "hsbc.com.bd"],
  standardchartered: ["sc.com"],
 
  // ── Bangladesh: telecom ──
  grameenphone: ["grameenphone.com"],
  robi: ["robi.com.bd"],
  banglalink: ["banglalink.net"],
  teletalk: ["teletalk.com.bd"],
 
  // ── Bangladesh: e-commerce, jobs, services ──
  daraz: ["daraz.com.bd", "daraz.com"],
  pathao: ["pathao.com"],
  foodpanda: ["foodpanda.com.bd", "foodpanda.com"],
  bdjobs: ["bdjobs.com"],
  chaldal: ["chaldal.com"],
  rokomari: ["rokomari.com"],
  shohoz: ["shohoz.com"],
  bikroy: ["bikroy.com"],

  // ── Bangladesh: government payments ──
  ekpay: ["ekpay.gov.bd"],
};
/*
  lookalike map
*/
const LOOKALIKE_MAP: Record<string, string> = {
  // Numbers → letters
  "0": "o",
  "1": "l",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",

  // Cyrillic
  "а": "a",
  "е": "e",
  "о": "o",
  "р": "p",
  "с": "c",
  "х": "x",
  "у": "y",

  // Other Unicode lookalikes
  "і": "i",
  "ј": "j",
  "ԁ": "d",
  "ɡ": "g",
  "ο": "o",
  "α": "a",
  "ν": "v",
};
const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "is.gd",
  "cutt.ly",
  "shorturl.at",
  "ow.ly",
]);

function createSignal(
  label: string,
  severity: Signal["severity"],
  description: string,
  matchedEvidence: string[],
): Signal {
  return {
    id: crypto.randomUUID(),
    label,
    severity,
    description,
    matchedEvidence,
  };
}

/* -----------------------------
   1. IP ADDRESS
----------------------------- */

function isIpAddress(hostname: string): boolean {
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);

  if (ipv4) {
    return true;
  }

  return hostname.includes(":");
}

/* -----------------------------
   2. PUNYCODE / UNICODE
----------------------------- */

function hasPunycode(hostname: string): boolean {
  return hostname.split(".").some((part) => part.startsWith("xn--"));
}



/* -----------------------------
   3. EMBEDDED CREDENTIALS
----------------------------- */

function hasEmbeddedCredentials(url: URL): boolean {
  return Boolean(url.username || url.password);
}

/* -----------------------------
   4. BRAND IMPERSONATION
----------------------------- */

function getBrandImpersonation(hostname: string): string | null {
  const normalizedHostname = hostname.toLowerCase();

  for (const brand of BRANDS) {
    if (!normalizedHostname.includes(brand)) {
      continue;
    }

    if (!isTrustedBrandDomain(normalizedHostname, brand)) {
      return brand;
    }
  }

  return null;
}

/* -----------------------------
   5. DANGEROUS FILE EXTENSION
----------------------------- */

function getDangerousExtensions(url: URL): string[] {
  const pathname = url.pathname.toLowerCase();

  return DANGEROUS_EXTENSIONS.filter((extension) =>
    pathname.endsWith(extension),
  );
}

/* -----------------------------
   6. SUSPICIOUS KEYWORDS
----------------------------- */

function getSuspiciousKeywords(url: URL): string[] {
  const urlText = `${url.hostname}${url.pathname}${url.search}`.toLowerCase();

  return SUSPICIOUS_KEYWORDS.filter((keyword) => urlText.includes(keyword));
}

/* -----------------------------
   7. EXCESSIVE SUBDOMAINS
----------------------------- */

function getSubdomainCount(hostname: string): number {
  const parts = hostname.split(".");

  return Math.max(0, parts.length - 2);
}
// get domain name using tldts
function getDomainName(hostname: string): string | null {
  const parsed = parse(hostname);
  return parsed.domainWithoutSuffix ?? null;
}
//normalize lookalike
function normalizeLookalikes(value: string): string {
  return [...value].map((char) => LOOKALIKE_MAP[char] ?? char).join("");
}
//isTrustedBrandDomain
function isTrustedBrandDomain(hostname: string, brand: string): boolean {
  const trustedDomains = TRUSTED_BRAND_DOMAINS[brand] ?? [];
  return trustedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}
/*
  Decide whether a domain is close enough
  to a brand to be considered possible typosquatting.
*/
function isTyposquatting(domainName: string, brand: string): boolean {
  return normalizeLookalikes(domainName) === brand;
}
//which brand a hostname is trying to resemble


function getTypoSquattedBrand(hostname: string): string | null {
  const unicodeHost = domainToUnicode(hostname); // "xn--pypal-4ve.com" -> "pаypal.com"
  const domainName = getDomainName(unicodeHost);
  if (!domainName) return null;

  for (const brand of BRANDS) {
    if (isTrustedBrandDomain(hostname, brand)) continue;
    if (isTyposquatting(domainName, brand)) return brand;
  }
  return null;
}


//url shortener
function isUrlShortener(hostname: string): boolean {
  return URL_SHORTENERS.has(hostname);
}

/* -----------------------------
   CHECK ONE URL
----------------------------- */
function normalizeUrl(urlString: string): string {
  return /^https?:\/\//i.test(urlString) ? urlString : `http://${urlString}`;
}
function checkUrl(urlString: string): Signal[] {
  let url: URL;

  try {
    url = new URL(normalizeUrl(urlString));
  } catch {
    return [
      createSignal(
        "Malformed URL",
        "medium",
        "The extracted URL could not be parsed as a valid URL.",
        [urlString],
      ),
    ];
  }

  const hostname = url.hostname.toLowerCase();

  const signals: Signal[] = [];

  /* 1. IP address */

  if (isIpAddress(hostname)) {
    signals.push(
      createSignal(
        "IP address URL",
        "medium",
        "The URL uses an IP address instead of a domain name.",
        [urlString],
      ),
    );
  }

  /* 2. Punycode */

  if (hasPunycode(hostname)) {
    signals.push(
      createSignal(
        "Punycode domain",
        "medium",
        "The hostname uses Punycode, which can be used to create visually deceptive domains.",
        [urlString],
      ),
    );
  }
  //url shortener
  if (isUrlShortener(hostname)) {
    signals.push(
      createSignal(
        "Shortened URL",
        "low",
        "The URL uses a link-shortening service, which hides the final destination.",
        [urlString],
      ),
    );
  }

  /*  Brand impersonation */

  const impersonatedBrand = getBrandImpersonation(hostname);

  if (impersonatedBrand) {
    signals.push(
      createSignal(
        "Possible brand impersonation",
        "high",
        `The hostname contains "${impersonatedBrand}" but does not belong to a known trusted ${impersonatedBrand} domain.`,
        [urlString],
      ),
    );
  }

  /* Typosquatting — skipped if impersonation already fired */

  const typosquattedBrand = impersonatedBrand
    ? null
    : getTypoSquattedBrand(hostname);

  if (typosquattedBrand) {
    signals.push(
      createSignal(
        "Possible Typosquatting",
        "medium",
        `The domain name closely resembles the "${typosquattedBrand}" brand but is not its official domain.`,
        [urlString],
      ),
    );
  }


  



  /* 3. Embedded credentials */

  if (hasEmbeddedCredentials(url)) {
    signals.push(
      createSignal(
        "Embedded credentials",
        "high",
        "The URL contains a username or password before the hostname.",
        [urlString],
      ),
    );
  }

  



  /* 5. Dangerous file extension */

  const dangerousExtensions = getDangerousExtensions(url);

  if (dangerousExtensions.length > 0) {
    signals.push(
      createSignal(
        "Potentially dangerous file",
        "high",
        `The URL points to a potentially dangerous file type: ${dangerousExtensions.join(", ")}.`,
        [urlString],
      ),
    );
  }

  /* 6. Suspicious keywords */

  const suspiciousKeywords = getSuspiciousKeywords(url);

  if (suspiciousKeywords.length > 0) {
    signals.push(
      createSignal(
        "Suspicious URL keywords",
        "medium",
        `The URL contains suspicious keywords: ${suspiciousKeywords.join(", ")}.`,
        [urlString],
      ),
    );
  }

  /* 7. Excessive subdomains */

  const subdomainCount = getSubdomainCount(hostname);

  if (subdomainCount >= 5) {
    signals.push(
      createSignal(
        "Excessive subdomains",
        "medium",
        `The hostname contains ${subdomainCount} subdomain levels, which may indicate a deceptive URL structure.`,
        [urlString],
      ),
    );
  }

  return signals;
}

/* -----------------------------
   CHECK ALL URLs
----------------------------- */
interface SafeBrowsingResponse {
  matches?: {
    threatType: string;
    platformType: string;
    threat: {
      url: string;
    };
  }[];
}
const checkSafeBrowsing = async (url: string): Promise<Signal[]> => {
  const SAFE_BROWSING_URL = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_API}`;

  const requestBody = {
    client: { clientId: process.env.GOOGLE_CLIENT_ID, clientVersion: "1.0.0" },
    threatInfo: {
      threatTypes: [
        "MALWARE",
        "SOCIAL_ENGINEERING",
        "UNWANTED_SOFTWARE",
        "POTENTIALLY_HARMFUL_APPLICATION",
      ],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: [{ url }],
    },
  };
  try {
    const response = await axios.post<SafeBrowsingResponse>(
      SAFE_BROWSING_URL,
      requestBody,
    );
    const matches = response.data.matches ?? [];
    console.log("GOOGLE SAFE Response", response.data);

    if (matches.length === 0) return [];

    return matches.map((match) =>
      createSignal(
        "Unsafe URL",
        "high",
        `Google safe browsing identified this URL as ${match.threatType}`,
        [url],
      ),
    );
  } catch (error) {
    console.error("Safe Browsing check failed:", error);

    return [];
  }
};
export async function checkUrls(urls: string[]): Promise<Signal[]> {
  const uniqueUrls = [...new Set(urls)];

  const results = await Promise.all(
    uniqueUrls.map(async (url) => {
      const localSignal = checkUrl(url);
      const SafeBrowsingSignal = await checkSafeBrowsing(url);

      return [...localSignal, ...SafeBrowsingSignal];
    }),
  );
  return results.flat();
}
