import type { Signal } from "./ruleSignalEngine";
import axios from "axios";

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
  "paypal",
  "google",
  "microsoft",
  "apple",
  "amazon",
  "facebook",
  "instagram",
  "whatsapp",
  "netflix",
  "binance",
  "coinbase",
  "linkedin",
  "github",
];

const TRUSTED_BRAND_DOMAINS: Record<string, string[]> = {
  paypal: ["paypal.com"],
  google: ["google.com"],
  microsoft: ["microsoft.com", "live.com", "outlook.com"],
  apple: ["apple.com"],
  amazon: ["amazon.com"],
  facebook: ["facebook.com"],
  instagram: ["instagram.com"],
  whatsapp: ["whatsapp.com"],
  netflix: ["netflix.com"],
  binance: ["binance.com"],
  coinbase: ["coinbase.com"],
  linkedin: ["linkedin.com"],
  github: ["github.com"],
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

function hasUnicode(hostname: string): boolean {
  return [...hostname].some((char) => char.charCodeAt(0) > 127);
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

    const trustedDomains = TRUSTED_BRAND_DOMAINS[brand] ?? [];

    const isTrusted = trustedDomains.some(
      (domain) =>
        normalizedHostname === domain ||
        normalizedHostname.endsWith(`.${domain}`),
    );

    if (!isTrusted) {
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

  /* Unicode hostname */

  if (hasUnicode(hostname)) {
    signals.push(
      createSignal(
        "Unicode domain",
        "medium",
        "The hostname contains non-ASCII Unicode characters, which can be used for visually deceptive domains.",
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

  /* 4. Brand impersonation */

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
