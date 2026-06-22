/** Decide whether to leak the generated OTP code in the response.
 *  Only exposed when delivery failed AND we're either in non-production
 *  or tests explicitly opted-in via `EXPOSE_OTP_FOR_TESTS=1`.
 */
export function shouldExposeOtpCode(
  sent: boolean,
  env: { NODE_ENV?: string; EXPOSE_OTP_FOR_TESTS?: string },
): boolean {
  if (sent) return false;
  return env.NODE_ENV !== "production" || env.EXPOSE_OTP_FOR_TESTS === "1";
}