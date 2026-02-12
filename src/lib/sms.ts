/** Phone number for SMS deep link — pending from Dinesh. */
const SMS_PHONE = "" as const;

/** Pre-filled SMS message body — pending from Dinesh. */
const SMS_BODY = "" as const;

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
