export interface User {
  id: string;
  email: string;
  encrypted_password?: string; // Optional for OAuth users
  oauth_provider?: string;
  oauth_id?: string;
  subscription_tier: 'free' | 'premium';
  created_at: Date;
  updated_at: Date;
}

// In a real application, this might be a class with static methods for DB operations
// For now, it's just the interface.
