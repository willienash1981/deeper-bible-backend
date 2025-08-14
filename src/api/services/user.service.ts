import { User } from '../models/user.model';
import { Pool } from 'pg'; // Assuming PostgreSQL
import bcrypt from 'bcrypt';

export class UserService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  /**
   * Finds a user by their ID.
   * @param id The user's ID.
   * @returns The user object or null if not found.
   */
  async findUserById(id: string): Promise<User | null> {
    const result = await this.pool.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Finds a user by their email.
   * @param email The user's email.
   * @returns The user object or null if not found.
   */
  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query<User>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  /**
   * Creates a new user.
   * @param email The user's email.
   * @param password The user's plain text password.
   * @param subscriptionTier The user's subscription tier.
   * @returns The newly created user object.
   */
  async createUser(email: string, password?: string, oauthProvider?: string, oauthId?: string, subscriptionTier: 'free' | 'premium' = 'free'): Promise<User> {
    const encryptedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const result = await this.pool.query<User>(
      `INSERT INTO users (email, encrypted_password, oauth_provider, oauth_id, subscription_tier)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, encryptedPassword, oauthProvider, oauthId, subscriptionTier]
    );
    return result.rows[0];
  }

  /**
   * Updates a user's profile.
   * @param id The user's ID.
   * @param updates An object containing the fields to update.
   * @returns The updated user object or null if not found.
   */
  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User | null> {
    const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = Object.values(updates);

    if (values.length === 0) {
      return this.findUserById(id); // No updates to apply
    }

    const result = await this.pool.query<User>(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  /**
   * Deletes a user account.
   * @param id The user's ID.
   * @returns True if the user was deleted, false otherwise.
   */
  async deleteUser(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Compares a plain text password with an encrypted password.
   * @param plainPassword The plain text password.
   * @param encryptedPassword The encrypted password from the database.
   * @returns True if passwords match, false otherwise.
   */
  async comparePasswords(plainPassword: string, encryptedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, encryptedPassword);
  }

  // Placeholder for password reset functionality
  async requestPasswordReset(email: string): Promise<boolean> {
    // In a real app, this would generate a token, save it to DB, and send an email
    console.log(`Password reset requested for ${email}`);
    return true;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // In a real app, this would verify the token, hash new password, and update DB
    console.log(`Password reset for token ${token} with new password`);
    return true;
  }
}