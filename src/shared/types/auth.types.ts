export interface JWTPayload {
  id: string;
  email: string;
  subscription_tier: string;
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

export interface AuthUser {
  id: string;
  email: string;
  subscription_tier: string;
}
