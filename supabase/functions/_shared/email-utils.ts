import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

/**
 * Shared email utilities for all email edge functions
 * Prevents =20 quoted-printable encoding artifacts in emails
 */

/**
 * Creates a configured SMTP client for Gmail
 */
export const createSmtpClient = (email: string, password: string) => {
  return new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: {
        username: email,
        password: password,
      },
    },
  });
};

/**
 * Minifies HTML content to prevent quoted-printable encoding issues
 * Removes unnecessary whitespace that can cause =20 artifacts in emails
 */
export function minifyHtml(html: string): string {
  return html
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove whitespace between tags
    .replace(/>\s+</g, '><')
    // Remove leading/trailing whitespace on each line
    .replace(/^\s+/gm, '')
    .replace(/\s+$/gm, '')
    // Collapse multiple spaces into one
    .replace(/\s{2,}/g, ' ')
    // Remove newlines
    .replace(/\n/g, '')
    // Trim the result
    .trim();
}

/**
 * Strips HTML tags for plain text email version
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Sanitizes user input for safe inclusion in emails
 * Prevents XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
