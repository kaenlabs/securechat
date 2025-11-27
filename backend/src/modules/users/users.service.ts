import { User, IUser } from '../../models/user.model';
import { AppError } from '../../middleware/error.middleware';

export class UsersService {
  /**
   * Search users by username
   * Returns matching users with their public keys (needed for E2EE)
   */
  async searchUsers(query: string, limit: number = 20): Promise<IUser[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const users = await User.find({
      username: { $regex: query, $options: 'i' },
    })
      .limit(limit)
      .sort({ username: 1 });

    return users;
  }

  /**
   * Get user by ID
   * Returns user profile including public key for E2EE
   */
  async getUserById(userId: string): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}
