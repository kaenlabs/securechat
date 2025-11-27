export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Search: undefined;
  Chat: {
    conversationId: string;
    recipientName: string;
    recipientPublicKey: string;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
