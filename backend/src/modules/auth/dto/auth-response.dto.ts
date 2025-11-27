export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    username: string;
    publicKey: string;
    createdAt: Date;
  };

  constructor(
    accessToken: string,
    user: { id: string; username: string; publicKey: string; createdAt: Date },
  ) {
    this.accessToken = accessToken;
    this.user = user;
  }
}
