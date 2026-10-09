export interface IGRAICEPillar {
  id: string;
  pillarNumber: number;
  name: string;
  shortName: string;
  description: string;
  color: string;
  subdomains?: string[];
}

export const GRAICE_PILLARS: IGRAICEPillar[] = [
  {
    id: "P1",
    pillarNumber: 1,
    name: "Ethical Leadership & Accountability",
    shortName: "Ethical Leadership",
    description: "Executive oversight, board governance, formal accountability registries, and AI ethics steering committee structures.",
    color: "#2563eb",
    subdomains: [
      "1.1 Governance & Accountability",
      "1.2 Ethical Principles & Alignments",
      "1.3 Stakeholder & Executive Engagement",
    ],
  },
  {
    id: "P2",
    pillarNumber: 2,
    name: "Data Governance & Integrity",
    shortName: "Data Governance",
    description: "Training data lineage, bias detection, data quality assurance, provenance tracking, and data retention protocols.",
    color: "#0284c7",
    subdomains: [
      "2.1 Data Provenance & Lineage",
      "2.2 Quality & Bias Mitigation",
      "2.3 Privacy & Data Protection",
    ],
  },
  {
    id: "P3",
    pillarNumber: 3,
    name: "Purpose-Driven Innovation & Fairness",
    shortName: "Purpose-Driven Innovation",
    description: "Systemic fairness validation, non-discrimination assessments, societal benefit criteria, and ethical AI deployment objectives.",
    color: "#4f46e5",
    subdomains: [
      "3.1 Business Case & Benefit Justification",
      "3.2 Algorithmic Fairness",
      "3.3 Non-Discrimination Controls",
    ],
  },
  {
    id: "P4",
    pillarNumber: 4,
    name: "Human-Centric Use & Safety",
    shortName: "Human-Centric Use",
    description: "Human-in-the-loop oversight, fail-safe override protocols, psychological safety, and user harm prevention controls.",
    color: "#0d9488",
    subdomains: [
      "4.1 Human-in-the-Loop Controls",
      "4.2 Safety Guardrails & Fallbacks",
      "4.3 User Well-being & Agency",
    ],
  },
  {
    id: "P5",
    pillarNumber: 5,
    name: "Responsible Implementation & Robustness",
    shortName: "Responsible Implementation",
    description: "Adversarial vulnerability testing, CI/CD safety testing, model drift monitoring, and resilient fallback systems.",
    color: "#16a34a",
    subdomains: [
      "5.1 Adversarial & Robustness Testing",
      "5.2 Model Versioning & Deployment",
      "5.3 Incident Response & Fallbacks",
    ],
  },
  {
    id: "P6",
    pillarNumber: 6,
    name: "AI Literacy & Workforce Readiness",
    shortName: "AI Literacy & Workforce",
    description: "Workforce upskilling programs, responsible AI usage guidelines, competency tracking, and role-specific education.",
    color: "#d97706",
    subdomains: [
      "6.1 Competency Frameworks",
      "6.2 Mandatory Staff Training",
      "6.3 Responsible Usage Guidelines",
    ],
  },
  {
    id: "P7",
    pillarNumber: 7,
    name: "Transparency & Auditability",
    shortName: "Transparency & Auditability",
    description: "Audit trail logging, model explainability, external stakeholder disclosures, and regulatory compliance evidence archiving.",
    color: "#7c3aed",
    subdomains: [
      "7.1 System Documentation & Factsheets",
      "7.2 Algorithmic Explainability",
      "7.3 Audit Trails & Logging",
    ],
  },
];

export const SUBSCRIPTION_PLANS = {
  Bronze: {
    name: "Bronze Plan",
    level: "Basic Assessment",
    questionsLimit: 10,
    features: [
      "Essential controls",
      "Key readiness questions",
      "Basic reporting",
      "Ideal for small organizations",
    ],
  },
  Silver: {
    name: "Silver Plan",
    level: "Standard Assessment",
    questionsLimit: 20,
    features: [
      "Expanded control set",
      "More detailed questions",
      "Comprehensive reporting",
      "Suitable for growing organizations",
    ],
  },
  Gold: {
    name: "Gold Plan",
    level: "Advanced Assessment",
    questionsLimit: 50,
    features: [
      "Full control set",
      "In-depth questions",
      "Detailed reporting and insights",
      "Recommended for large & complex organizations",
    ],
  },
} as const;
