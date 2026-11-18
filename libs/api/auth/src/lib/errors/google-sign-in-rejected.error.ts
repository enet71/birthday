// The data from Google cannot sign anyone in: an invalid code or ID token. The API answers it with 401.
export class GoogleSignInRejectedError extends Error {
  public override readonly name: string = 'GoogleSignInRejectedError';
}
