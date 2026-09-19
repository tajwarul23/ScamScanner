import type { ExtractionResult } from "./extractEvidence";

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
const checkDirectAccountNumber = (
  evidence: CombinedEvidence
): Signal | null => {
  if (evidence.accountNumbers.length === 0) {
    return null;
  }

  return {
    id: "direct-account-number",
    label: "Bank/account number shared directly",
    severity: "medium",
    description:
      "An account number was shared directly and should be verified against the company's official payment information.",
    matchedEvidence: evidence.accountNumbers,
  };
};



//MAIN RULE ENGINE
export const ruleSignalEngine = (evidenceResults : ExtractionResult[]) : Signal[] => {

    //combining the evidence
    const evidence : CombinedEvidence = {
        names: evidenceResults.flatMap((result) => result.names),
    companies: evidenceResults.flatMap((result) => result.companies),
    amounts: evidenceResults.flatMap((result) => result.amounts),
    dates: evidenceResults.flatMap((result) => result.dates),
    claims: evidenceResults.flatMap((result) => result.claims),
    phoneNumbers: evidenceResults.flatMap(
      (result) => result.phoneNumbers
    ),
    accountNumbers: evidenceResults.flatMap(
      (result) => result.accountNumbers
    ),
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
     const directSignals = [
    checkDirectAccountNumber(evidence),
  ].filter(
    (signal): signal is Signal => signal !== null
  );

    return[
        ...keywordSignals,
        ...directSignals
    ]
}