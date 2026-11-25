const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const phonePattern =
  /(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)/g;
const addressPattern =
  /\b\d{1,5}\s+[A-Za-z0-9 .'-]{3,}\s+(Street|St|Avenue|Ave|Road|Rd|Rua|R\.|Avenida|Praca|Praça)\b/gi;

// Removes detectable contact details before a resume is sent to an AI provider.
export function removeResumeContactDetails(text: string): string {
  return text
    .replace(emailPattern, "[email removed]")
    .replace(phonePattern, "[phone removed]")
    .replace(addressPattern, "[address removed]")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
