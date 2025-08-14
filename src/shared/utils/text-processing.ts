export class TextProcessing {
  /**
   * Sanitizes a string to prevent XSS attacks.
   * This is a basic example and might need a more robust library (e.g., DOMPurify) for production.
   * @param text The text to sanitize.
   * @returns The sanitized text.
   */
  static sanitizeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Truncates a string to a specified length and appends an ellipsis if truncated.
   * @param text The text to truncate.
   * @param maxLength The maximum length of the string.
   * @returns The truncated string.
   */
  static truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}