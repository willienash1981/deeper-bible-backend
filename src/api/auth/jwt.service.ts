import * as jwt from 'jsonwebtoken';
import { JWTPayload } from '../../shared/types/auth.types';

export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string | number;
  private readonly refreshTokenExpiresIn: string | number;

  constructor() {
    if (!process.env.JWT_ACCESS_TOKEN_SECRET || !process.env.JWT_REFRESH_TOKEN_SECRET ||
        !process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || !process.env.JWT_REFRESH_TOKEN_EXPIRES_IN) {
      throw new Error('JWT environment variables for access and refresh tokens must be set.');
    }
    this.accessTokenSecret = process.env.JWT_ACCESS_TOKEN_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_TOKEN_SECRET;
    this.accessTokenExpiresIn = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN;
    this.refreshTokenExpiresIn = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN;
  }

  /**
   * Generates an access token.
   * @param payload The payload for the token.
   * @returns The generated access token.
   */
  generateAccessToken(payload: JWTPayload): string {
    const options = { expiresIn: this.accessTokenExpiresIn };
    return jwt.sign(payload as object, this.accessTokenSecret, options as jwt.SignOptions);
  }

  /**
   * Generates a refresh token.
   * @param payload The payload for the token.
   * @returns The generated refresh token.
   */
  generateRefreshToken(payload: JWTPayload): string {
    const options = { expiresIn: this.refreshTokenExpiresIn };
    return jwt.sign(payload as object, this.refreshTokenSecret, options as jwt.SignOptions);
  }

  /**
   * Verifies an access token.
   * @param token The access token to verify.
   * @returns The decoded payload.
   * @throws Error if the token is invalid or expired.
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token.');
    }
  }

  /**
   * Verifies a refresh token.
   * @param token The refresh token to verify.
   * @returns The decoded payload.
   * @throws Error if the token is invalid or expired.
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token.');
    }
  }
}