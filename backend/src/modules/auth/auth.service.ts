import { User, IUser } from '../../models/user.model';
import { AppError } from '../../middleware/error.middleware';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { config } from '../../config/env.config';
import { logger } from '../../utils/logger';

/**
 * AuthService handles user registration and authentication
 * 
 * Security implementation:
 * - Passwords are hashed using Argon2id with unique salts
 * - Salts are generated using crypto.randomBytes
 * - Argon2id parameters are configured for security (see config)
 * - JWT tokens are issued on successful login
 * - Public keys are stored for E2EE, private keys NEVER touch the server
 */
export class AuthService {

  /**
   * Register a new user
   * - Checks username uniqueness
   * - Generates random salt
   * - Hashes password with Argon2id
   * - Stores user with public key
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { username, password, publicKey } = registerDto;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new AppError('Username already exists', 409);
    }

    // Generate random salt (32 bytes = 64 hex characters)
    const salt = crypto.randomBytes(32).toString('hex');

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(password + salt, {
      type: argon2.argon2id,
      memoryCost: config.argon2.memoryCost,
      timeCost: config.argon2.timeCost,
      parallelism: config.argon2.parallelism,
    });

    // Create user
    const user = await User.create({
      username,
      passwordHash,
      salt,
      publicKey,
    });

    logger.info(`User registered: ${username} (${user._id})`);

    // Generate JWT token
    const accessToken = this.generateToken(user._id.toString());

    return new AuthResponseDto(accessToken, {
      id: user._id.toString(),
      username: user.username,
      publicKey: user.publicKey,
      createdAt: user.createdAt,
    });
  }

  /**
   * Login user
   * - Retrieves user and salt from database
   * - Hashes provided password with stored salt
   * - Compares hashes using timing-safe comparison (argon2.verify)
   * - Issues JWT token on success
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Verify password by hashing with stored salt
    const isValid = await argon2.verify(user.passwordHash, password + user.salt);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    logger.info(`User logged in: ${username} (${user._id})`);

    // Generate JWT token
    const accessToken = this.generateToken(user._id.toString());

    return new AuthResponseDto(accessToken, {
      id: user._id.toString(),
      username: user.username,
      publicKey: user.publicKey,
      createdAt: user.createdAt,
    });
  }

  /**
   * Get current user by ID
   */
  async getCurrentUser(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions,
    );
  }
}
