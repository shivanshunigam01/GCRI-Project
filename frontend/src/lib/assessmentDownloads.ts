import { storage } from "@/lib/storage";
import { getApiErrorMessage } from "@/lib/authUser";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(contentDisposition);
  const raw = match?.[1] || match?.[2];
  if (!raw) return fallback;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function downloadAssessmentFile(
  endpoint: string,
  fallbackFilename: string
): Promise<void> {
  const token = storage.getToken();
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let errBody: unknown = null;
    try {
      errBody = await response.json();
    } catch {
      errBody = await response.text();
    }
    const err = new Error(getApiErrorMessage({ status: response.status, data: errBody }, "Download failed")) as Error & {
      status?: number;
    };
    err.status = response.status;
    throw err;
  }

  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("content-disposition"), fallbackFilename);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadAssessmentPdf(assessmentId: string): Promise<void> {
  await downloadAssessmentFile(
    `/assessments/${assessmentId}/report`,
    `GRAICE_Report_${assessmentId}.pdf`
  );
}

export async function downloadAssessmentExcel(assessmentId: string): Promise<void> {
  await downloadAssessmentFile(
    `/assessments/${assessmentId}/export`,
    `GRAICE_Export_${assessmentId}.xlsx`
  );
}
