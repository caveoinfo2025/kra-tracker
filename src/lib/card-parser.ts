/**
 * Heuristic parser that turns raw OCR text from a business card into
 * structured lead fields. Best-effort — the mobile review form lets the
 * user correct anything before saving.
 */

export interface ParsedCard {
  contactPerson: string;
  companyName: string;
  email: string;
  phone: string;
  website: string;
  title: string;        // job title / designation
  raw: string;          // full OCR text, for the "Notes" field
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE = /\b((https?:\/\/)?(www\.)?[A-Z0-9-]+\.(com|in|net|org|co|io|biz)[A-Z0-9./-]*)/i;
// Phone: international or Indian formats, at least 8 digits
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;

const TITLE_KEYWORDS = [
  "ceo", "cto", "cfo", "coo", "founder", "co-founder", "director", "manager",
  "head", "lead", "engineer", "executive", "officer", "president", "vp",
  "vice president", "sales", "marketing", "consultant", "analyst", "architect",
  "administrator", "specialist", "coordinator", "owner", "partner", "proprietor",
];

const COMPANY_SUFFIXES = [
  "pvt", "private", "ltd", "limited", "llp", "inc", "incorporated", "corp",
  "corporation", "technologies", "technology", "solutions", "systems",
  "services", "enterprises", "industries", "infotech", "infosystems", "labs",
  "group", "consulting", "associates", "& co", "company",
];

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Clean a phone candidate; keep a leading + if present. */
function normalisePhone(s: string): string {
  const hasPlus = s.trim().startsWith("+");
  const d = digitsOnly(s);
  if (d.length < 8 || d.length > 15) return "";
  return hasPlus ? `+${d}` : d;
}

export function parseBusinessCard(rawText: string): ParsedCard {
  const raw = (rawText ?? "").trim();
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // ── Email ──
  const emailMatch = raw.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0].toLowerCase() : "";

  // ── Website ──
  // Capture an explicit www./http URL. A site that matches the email domain is
  // still useful (it confirms the company domain), so we keep it.
  let website = "";
  const urlMatch = raw.match(URL_RE);
  if (urlMatch) {
    website = urlMatch[1];
  }

  // ── Phones (collect all, pick the best two) ──
  const phones: string[] = [];
  let pm: RegExpExecArray | null;
  PHONE_RE.lastIndex = 0;
  while ((pm = PHONE_RE.exec(raw)) !== null) {
    const norm = normalisePhone(pm[1]);
    if (norm && !phones.includes(norm)) phones.push(norm);
  }
  // Prefer a mobile-looking number (10 digits, India) first
  phones.sort((a, b) => {
    const am = digitsOnly(a).length === 10 ? 0 : 1;
    const bm = digitsOnly(b).length === 10 ? 0 : 1;
    return am - bm;
  });
  const phone = phones[0] ?? "";

  // ── Company: line containing a known suffix ──
  let companyName = "";
  for (const line of lines) {
    const low = line.toLowerCase();
    if (COMPANY_SUFFIXES.some((s) => low.includes(s))) {
      companyName = line;
      break;
    }
  }
  // Fallback: derive from email domain
  if (!companyName && email) {
    const domain = email.split("@")[1]?.split(".")[0];
    if (domain && !["gmail", "yahoo", "hotmail", "outlook", "rediffmail"].includes(domain)) {
      companyName = domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  }

  // ── Job title: line containing a title keyword ──
  let title = "";
  for (const line of lines) {
    const low = line.toLowerCase();
    if (TITLE_KEYWORDS.some((k) => low.includes(k)) && line.length < 50) {
      title = line;
      break;
    }
  }

  // ── Contact person: first "name-like" line ──
  // (mostly letters, 2-4 words, not the company/title/email/phone line)
  let contactPerson = "";
  for (const line of lines) {
    if (line === companyName || line === title) continue;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) { PHONE_RE.lastIndex = 0; continue; }
    PHONE_RE.lastIndex = 0;
    const words = line.split(/\s+/);
    const letters = line.replace(/[^A-Za-z]/g, "");
    const isNameLike =
      words.length >= 2 && words.length <= 4 &&
      letters.length / line.replace(/\s/g, "").length > 0.7 &&
      !COMPANY_SUFFIXES.some((s) => line.toLowerCase().includes(s));
    if (isNameLike) {
      contactPerson = line;
      break;
    }
  }
  // Fallback: very first line
  if (!contactPerson && lines.length > 0) contactPerson = lines[0];

  return {
    contactPerson,
    companyName,
    email,
    phone,
    website,
    title,
    raw,
  };
}
