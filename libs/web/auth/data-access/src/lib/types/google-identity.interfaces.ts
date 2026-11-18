// The part of the Google Identity Services API (https://accounts.google.com/gsi/client) that the app uses.
export interface GoogleAccounts {
  id: GoogleIdApi;
  oauth2: GoogleOAuth2Api;
}

export interface GoogleIdApi {
  initialize(config: GoogleIdConfiguration): void;
  prompt(): void;
  cancel(): void;
  disableAutoSelect(): void;
}

export interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  nonce: string;
  auto_select: boolean;
  use_fedcm_for_prompt: boolean;
  itp_support: boolean;
  context: 'signin' | 'signup' | 'use';
}

export interface GoogleCredentialResponse {
  credential: string;
}

export interface GoogleOAuth2Api {
  initCodeClient(config: GoogleCodeClientConfiguration): GoogleCodeClient;
}

export interface GoogleCodeClientConfiguration {
  client_id: string;
  scope: string;
  ux_mode: 'popup';
  callback: (response: GoogleCodeResponse) => void;
  error_callback: (error: GoogleCodeClientError) => void;
}

export interface GoogleCodeClient {
  requestCode(): void;
}

// `error` is set when the user denied the consent.
export interface GoogleCodeResponse {
  code?: string;
  error?: string;
}

export interface GoogleCodeClientError {
  type: 'popup_failed_to_open' | 'popup_closed' | 'unknown';
}
