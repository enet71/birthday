// The user denied the consent in the Google popup.
export class GoogleConsentDeniedError extends Error {
  public override readonly name: string = 'GoogleConsentDeniedError';
}
