import { IsString, IsEnum, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ConversationType } from '../../../models/conversation.model';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type!: ConversationType;

  /**
   * For direct conversations: the other user's ID
   */
  @IsOptional()
  @IsUUID()
  otherUserId?: string;

  /**
   * For group conversations: name of the group
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  groupName?: string;

  /**
   * For group conversations: array of member user IDs
   */
  @IsOptional()
  @IsUUID('4', { each: true })
  memberIds?: string[];
}
