/**
 * Escapes HTML special characters to prevent XSS attacks
 * Converts message to plain text by removing any HTML tags
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  const htmlEscapeMap: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "`": "&#x60;",
  };

  return text.replace(/[&<>"'`]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Validates message format and length
 * - Maximum 5000 characters
 * - Cannot be just whitespace
 */
export function validateMessage(msg: string): { valid: boolean; error?: string } {
  if (!msg || typeof msg !== "string") {
    return { valid: false, error: "Message must be a string" };
  }

  const trimmed = msg.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }

  if (msg.length > 5000) {
    return { valid: false, error: "Message exceeds maximum length (5000 characters)" };
  }

  return { valid: true };
}

/**
 * Sanitizes and validates a message
 * Escapes HTML and enforces length limits
 */
export function sanitizeMessage(msg: string): { sanitized: string; error?: string } {
  const validation = validateMessage(msg);
  if (!validation.valid) {
    return { sanitized: "", error: validation.error };
  }

  const escaped = escapeHtml(msg);
  return { sanitized: escaped };
}
