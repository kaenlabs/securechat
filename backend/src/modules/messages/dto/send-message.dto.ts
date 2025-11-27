import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class SendMessageDto {
  /**
   * Encrypted message content
   * Client encrypts message with random session key using symmetric encryption
   */
  @IsString()
  ciphertextMessage!: string;

  /**
   * Session key encrypted with recipient's public key
   * Allows recipient to decrypt the message using their private key
   * 
   * TODO V2: For group messages, this should be an array/map of
   * encrypted session keys (one per recipient)
   */
  @IsString()
  encryptedSessionKey!: string;

  /**
   * Optional: number of seconds before message self-destructs
   * null = message never expires
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  expirySeconds?: number;
}
