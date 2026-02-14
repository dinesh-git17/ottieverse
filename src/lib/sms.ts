/** Phone number for SMS deep link — pending from Dinesh. */
const SMS_PHONE = "+14378792066" as const;

/** Pre-filled SMS message body for the celebration CTA. */
const SMS_BODY = "YES. Always and FOREVER. No refunds No exchanges" as const;

/**
 * Opens the native Messages app with a pre-filled recipient and body.
 *
 * Uses the iOS `sms:` URI scheme via `window.open`. The phone number and
 * message body are defined as module-level constants at the top of this file.
 */
export function openSmsApp(): void {
  const message = encodeURIComponent(SMS_BODY);
  window.open(`sms:${SMS_PHONE}&body=${message}`, "_system");
}
