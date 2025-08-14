import jwt from 'jsonwebtoken';

interface JWTPayload {
  id: string;
  email: string;
  subscription_tier: string;
}

export class TokenService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor() {
    if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
      throw new Error('JWT_SECRET and JWT_EXPIRES_IN environment variables must be set.');
    }
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN;
  }

  /**
   * Generates a new JWT token.
   * @param payload The payload to include in the token.
   * @returns The generated JWT token string.
   */
  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.jwtSecret as jwt.Secret, { expiresIn: this.jwtExpiresIn });
  }

  /**
   * Verifies a JWT token.
   * @param token The JWT token string to verify.
   * @returns The decoded payload if the token is valid, otherwise throws an error.
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token.');
    }
  }
}