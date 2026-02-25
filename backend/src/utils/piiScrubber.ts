// Limits string length to prevent memory issues or log flooding
const clamp = (s: string, maxLen: number): string => (s.length > maxLen ? s.slice(0, maxLen) : s);

// Regex patterns for various types of PII, ordered by risk level to ensure critical data is scrubbed first
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}\b/g;
const APIKEY_RE = /\b(sk|rk|pk|api|key)_[A-Za-z0-9_-]{12,}\b/gi;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._-]{10,}\b/gi;

// Pattern to identify Finnish Social Security Number (HETU)
const HETU_RE = /\b\d{6}[-+A-Y]\d{3}[0-9A-Z]\b/g;

// Pattern to identify UUIDv7 (user id)
const UUIDV7_RE = /[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

// Pattern to identify potential addresses, combining street names with numbers and optional unit designators
const ADDRESS_RE = /\b[A-ZÅÄÖ][a-zåäö]+\s\d{1,4}(\s?[A-Z])?(\s?\d{1,3})?\b/g;

// Pattern to identify common secret key-value pairs in logs, such as "password
const SECRET_KV_RE = /\b(password|pass|pwd|secret|token|apikey|api_key)\s*([:=])\s*([^\s,;]{4,})/gi;

// Main function to scrub PII from text, applying multiple regex patterns in order of risk level
export const scrubText = (raw: string): string => {
  if (typeof raw !== "string") return "";
  
  let s = raw;

  // 1. High-risk identifiers (SSN, Email, UUID)
  s = s.replace(HETU_RE, "[SOCIAL_SECURITY_NUMBER]");
  s = s.replace(EMAIL_RE, "[EMAIL]");
  s = s.replace(UUIDV7_RE, "[USER_ID]"); 
  
  // 2. Authentication tokens and API keys
  s = s.replace(JWT_RE, "[TOKEN]");
  s = s.replace(BEARER_RE, "Bearer [TOKEN]");
  s = s.replace(APIKEY_RE, "[TOKEN]");
  
  // 3. Secret key-value pairs (preserves casing and separators like : or =)
  s = s.replace(SECRET_KV_RE, (_m, k, sep) => `${k}${sep}[REDACTED]`);

  // 4. Phone numbers (validates digit count to avoid false positives) [cite: 41]
  s = s.replace(/(\+?\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}\b/g, (m) => {
    const digits = m.replace(/[^\d]/g, "");
    return digits.length >= 8 ? "[PHONE]" : m;
  });

  // 5. Addresses and location data [cite: 42]
  s = s.replace(ADDRESS_RE, "[ADDRESS]");

  // 6. Cleanup null characters and enforce length constraints
  s = s.replace(/\u0000/g, "");
  return clamp(s, 8000); 
};

//Function to scrub PII from an array of messages
export const scrubMessages = (msgs: Array<{ role: "user" | "assistant"; content: string }>) => {
  return msgs.map((m) => ({ ...m, content: scrubText(m.content) }));
};