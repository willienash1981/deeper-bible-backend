// In a real application, this would interact with a database or Redis for persistence
const refreshTokens: string[] = [];

export class RefreshService {
  /**
   * Adds a refresh token to the store.
   * @param token The refresh token to add.
   */
  addRefreshToken(token: string): void {
    refreshTokens.push(token);
  }

  /**
   * Checks if a refresh token exists in the store.
   * @param token The refresh token to check.
   * @returns True if the token exists, false otherwise.
   */
  hasRefreshToken(token: string): boolean {
    return refreshTokens.includes(token);
  }

  /**
   * Revokes a refresh token by removing it from the store.
   * @param token The refresh token to revoke.
   * @returns True if the token was revoked, false if not found.
   */
  revokeRefreshToken(token: string): boolean {
    const index = refreshTokens.indexOf(token);
    if (index > -1) {
      refreshTokens.splice(index, 1);
      return true;
    }
    return false;
  }
}