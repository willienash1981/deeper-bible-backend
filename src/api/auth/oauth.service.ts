import { OAuth2Client } from 'google-auth-library';

export class OAuthService {
  private googleClient: OAuth2Client;

  constructor() {
    if (!process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET) {
      throw new Error('OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET environment variables must be set for OAuth.');
    }
    this.googleClient = new OAuth2Client(
      process.env.OAUTH_CLIENT_ID,
      process.env.OAUTH_CLIENT_SECRET,
      process.env.CORS_ORIGIN + '/api/auth/oauth/google/callback' // Redirect URI
    );
  }

  /**
   * Generates the URL for Google OAuth consent screen.
   * @returns The URL string.
   */
  getGoogleAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];
    return this.googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Ensures refresh token is always returned
    });
  }

  /**
   * Exchanges the authorization code for tokens.
   * @param code The authorization code received from Google.
   * @returns A Promise resolving to the tokens (access, refresh, id_token).
   */
  async getGoogleTokens(code: string) {
    const { tokens } = await this.googleClient.getToken(code);
    return tokens;
  }

  /**
   * Verifies the ID token and returns the user's payload.
   * @param idToken The ID token received from Google.
   * @returns A Promise resolving to the user's payload.
   */
  async verifyGoogleIdToken(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.OAUTH_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  }
}