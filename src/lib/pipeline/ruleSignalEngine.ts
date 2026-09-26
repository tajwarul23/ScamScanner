import type { ExtractionResult } from "./extractEvidence";
import { checkUrls } from "./urlChecks";

export type SignalSeverity = "low" | "medium" | "high";

export interface Signal{
    id: string,
    label: string;
    severity: SignalSeverity;
    description: string;
    matchedEvidence: string[];
};

interface CombinedEvidence {
    names: string[];
    companies: string[];
    amounts: string[];
    dates: string[];
    claims: string[];
    phoneNumbers: string[];
    accountNumbers: string[];
    transactionIds: string[];
    referenceIds: string[];
    urls: string[];
    emails: string[];
    handles: string[];
}

type SourceName = "claims" | "dates" | "amounts" | "claimsAndDates" | "claimsAndAmounts";

interface keywordRule {
    id: string;
    label: string;
    severity: SignalSeverity;
    description: string;
    keywords: string[];
    source: SourceName
}

//Matcher Function
const findMatches = (values: string[], keywords:string[]) : string[] =>{

    return values.filter((value) => keywords.some((keyword) => value.toLowerCase().includes(keyword.toLowerCase())))
}

//RULE DATA

const KEYWORD_RULE : keywordRule[] = [
     {
    id: "upfront-fee",
    label: "Upfront payment requested",
    severity: "high",
    description:
      "The message asks for a fee or payment before delivering the promised money or goods.",
    keywords: [
      "processing fee",
      "upfront",
      "advance payment",
      "activation fee",
      "release fee",
    ],
    source: "claims",
  },

  {
    id: "guaranteed-returns",
    label: "Unrealistic guaranteed returns",
    severity: "high",
    description:
      "Guaranteed returns or profits are a common investment-scam indicator.",
    keywords: [
      "guaranteed return",
      "risk-free",
      "guaranteed profit",
      "double your money",
    ],
    source: "claims",
  },

  {
    id: "urgency-pressure",
    label: "Artificial urgency",
    severity: "medium",
    description:
      "Pressure to act quickly can prevent the target from verifying the claim.",
    keywords: [
      "act now",
      "within 24 hours",
      "immediately",
      "urgent",
      "limited time",
      "expires today",
      "payment required today",
    ],
    source: "claimsAndDates",
  },

  {
    id: "sensitive-info-request",
    label: "Requests sensitive credentials",
    severity: "high",
    description:
      "The message requests sensitive information such as OTPs, PINs, CVVs, or passwords.",
    keywords: [
      "otp",
      "one-time password",
      "pin",
      "verification code",
      "cvv",
      "password",
    ],
    source: "claims",
  },

  {
    id: "gift-card-or-crypto",
    label: "Risky payment method",
    severity: "high",
    description:
      "Gift cards and cryptocurrency payments are commonly requested in scams because they are difficult to reverse.",
    keywords: [
      "gift card",
      "bitcoin",
      "crypto",
      "usdt",
      "cryptocurrency",
      "wire transfer",
    ],
    source: "claimsAndAmounts",
  },
  
]

//direct rule for checking account number
const ACCOUNT_NUMBER_ESCALATION_IDS = new Set(["upfront-fee", "urgency-pressure"]);

const checkDirectAccountNumber = (
  evidence: CombinedEvidence,
  otherSignalIds: Set<string>
): Signal | null => {
  if (evidence.accountNumbers.length === 0) {
    return null;
  }

  const isEscalated = [...ACCOUNT_NUMBER_ESCALATION_IDS].some((id) =>
    otherSignalIds.has(id)
  );

  return {
    id: "direct-account-number",
    label: "Bank/account number shared directly",
    severity: isEscalated ? "medium" : "low",
    description: isEscalated
      ? "An account number was shared directly alongside other pressure or fee-related warning signs — verify it independently before sending anything."
      : "An account number was shared directly. This is common in legitimate payment requests too, but verify it against the company's or person's official details before paying.",
    matchedEvidence: evidence.accountNumbers,
  };
};

//direct rule for transaction/reference identifiers
const checkFinancialIdentifiers = (
  evidence: CombinedEvidence
): Signal | null => {
  const matches = [...evidence.transactionIds, ...evidence.referenceIds];
  if (matches.length === 0) {
    return null;
  }

  return {
    id: "financial-identifiers-shared",
    label: "Financial identifiers shared",
    severity: "low",
    description:
      "A transaction or reference ID was shared. If a payment was already made, use this identifier to trace it with your bank/wallet provider or when reporting to authorities.",
    matchedEvidence: matches,
  };
};

//MAIN RULE ENGINE
export const ruleSignalEngine = async(evidenceResults : ExtractionResult[]) : Promise<Signal[]> => {

    //combining the evidence
    const evidence : CombinedEvidence = {
        names: evidenceResults.flatMap((result) => result.names),
    companies: evidenceResults.flatMap((result) => result.companies),
    amounts: evidenceResults.flatMap((result) => result.amounts),
    dates: evidenceResults.flatMap((result) => result.dates),
    claims: evidenceResults.flatMap((result) => result.claims),
    urls: evidenceResults.flatMap((result) => result.urls),
    phoneNumbers: evidenceResults.flatMap(
      (result) => result.phoneNumbers
    ),
    accountNumbers: evidenceResults.flatMap(
      (result) => result.accountNumbers
    ),
    transactionIds: evidenceResults.flatMap(
      (result) => result.transactionIds
    ),
    referenceIds: evidenceResults.flatMap(
      (result) => result.referenceIds
    ),
    emails: evidenceResults.flatMap((result) => result.emails),
    handles: evidenceResults.flatMap((result) => result.handles),
    }
    //prepare the source object for matcher function
    const sources : Record<SourceName, string[]> ={
         claims: evidence.claims,
    dates: evidence.dates,
    amounts: evidence.amounts,
      
    claimsAndDates: [
      ...evidence.claims,
      ...evidence.dates,
    ],

    claimsAndAmounts: [
      ...evidence.claims,
      ...evidence.amounts,
    ],
    }

    //run the keyword rule

    const keywordSignals : Signal[] = KEYWORD_RULE.flatMap(
        (rule) => {
            const matches = findMatches(sources[rule.source],rule.keywords);
            if(matches.length === 0)return[];
            return[
                {
                    id: rule.id,
          label: rule.label,
          severity: rule.severity,
          description: rule.description,
          matchedEvidence: matches,
                }
            ]
        }
    );
    //run the direct rule
    const keywordSignalIds = new Set(keywordSignals.map((s) => s.id));

     const directSignals = [
    checkDirectAccountNumber(evidence, keywordSignalIds),
    checkFinancialIdentifiers(evidence),
  ].filter(
    (signal): signal is Signal => signal !== null
  );

  const urlSignals = await checkUrls(evidence.urls);
    return[
        ...keywordSignals,
        ...directSignals,
        ...urlSignals
    ]
}