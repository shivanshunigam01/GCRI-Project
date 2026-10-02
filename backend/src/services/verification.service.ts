import dns from "node:dns/promises";

export interface DomainVerificationResult {
  isValidDomain: boolean;
  dnsResolved: boolean;
  verificationStatus: "Verified" | "Pending" | "Rejected";
  recordsFound: {
    aRecords?: string[];
    mxRecords?: string[];
  };
  diagnosticNotes: string;
}

/**
 * Executes DNS-based verification on an organization's public domain.
 * Confirms whether the domain exists, resolves to active A or MX records,
 * and handles network timeouts gracefully.
 *
 * @param domain Clean domain name (e.g. "acme-ai.com")
 * @param timeoutMs Maximum milliseconds to wait for DNS response (default 4000ms)
 */
export async function verifyDomainLegitimacy(
  domain: string,
  timeoutMs = 4000
): Promise<DomainVerificationResult> {
  // Normalize domain
  const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  // Domain syntax pre-check
  const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainRegex.test(cleanDomain)) {
    return {
      isValidDomain: false,
      dnsResolved: false,
      verificationStatus: "Rejected",
      recordsFound: {},
      diagnosticNotes: `Domain syntax is invalid: '${cleanDomain}'`,
    };
  }

  // Wrap DNS queries in a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("DNS_LOOKUP_TIMEOUT")), timeoutMs)
  );

  let aRecords: string[] = [];
  let mxRecords: string[] = [];
  let resolvedAny = false;
  let diagnosticNotes = "";

  try {
    const lookupPromise = Promise.allSettled([
      dns.resolve4(cleanDomain),
      dns.resolveMx(cleanDomain),
    ]);

    const results = await Promise.race([lookupPromise, timeoutPromise]);

    const [aResult, mxResult] = results;

    if (aResult.status === "fulfilled" && aResult.value && aResult.value.length > 0) {
      aRecords = aResult.value;
      resolvedAny = true;
    }

    if (mxResult.status === "fulfilled" && mxResult.value && mxResult.value.length > 0) {
      mxRecords = mxResult.value.map((mx) => `${mx.exchange} (pri: ${mx.priority})`);
      resolvedAny = true;
    }

    if (resolvedAny) {
      diagnosticNotes = `Domain verified successfully. Resolved ${aRecords.length} IPv4 A record(s) and ${mxRecords.length} MX record(s).`;
      return {
        isValidDomain: true,
        dnsResolved: true,
        verificationStatus: "Verified",
        recordsFound: {
          aRecords,
          mxRecords,
        },
        diagnosticNotes,
      };
    } else {
      diagnosticNotes = "Domain did not return active A or MX records on public DNS. Flagged for administrative review.";
      return {
        isValidDomain: true,
        dnsResolved: false,
        verificationStatus: "Pending",
        recordsFound: {},
        diagnosticNotes,
      };
    }
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.message === "DNS_LOOKUP_TIMEOUT") {
      diagnosticNotes = `DNS resolution timed out after ${timeoutMs}ms. Marked as Pending for administrative verification.`;
    } else if (err.code === "ENOTFOUND" || err.code === "ENODATA") {
      diagnosticNotes = `Domain not found in public DNS (${err.code}). Marked as Pending for administrative review.`;
    } else {
      diagnosticNotes = `DNS resolution error: ${err.message || "Unknown error"}. Marked as Pending.`;
    }

    return {
      isValidDomain: true,
      dnsResolved: false,
      verificationStatus: "Pending",
      recordsFound: {},
      diagnosticNotes,
    };
  }
}
