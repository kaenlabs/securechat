import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { messagesService } from '../services/messages.service';
import { Message, DecryptedMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import * as tweetnacl from 'tweetnacl';
import * as util from 'tweetnacl-util';
import {
  encryptWithSessionKey,
  decryptWithSessionKey,
  encryptSessionKey,
  decryptSessionKey,
  generateSessionKey,
} from '../crypto/encryption';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;
type ChatRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export function ChatScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChatRouteProp>();
  const { conversationId, recipientName, recipientPublicKey } = route.params;
  const { user, privateKey } = useAuth();

  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const loadMessages = async () => {
    try {
      const encryptedMessages = await messagesService.getMessages(conversationId);
      const decrypted = await decryptMessages(encryptedMessages);
      // Reverse messages for inverted FlatList (newest at bottom)
      setMessages(decrypted.reverse());
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      if (loading) {
        Alert.alert('Error', 'Failed to load messages');
        setLoading(false);
      }
    }
  };

  const decryptMessages = async (
    encryptedMessages: Message[]
  ): Promise<DecryptedMessage[]> => {
    if (!privateKey) {
      throw new Error('Private key not available');
    }

    const decrypted: DecryptedMessage[] = [];

    for (const msg of encryptedMessages) {
      try {
        // Determine which public key to use for decryption
        // If this is my message, I encrypted it with recipient's public key
        // If this is their message, they encrypted it with my public key
        const isMyMessage = msg.sender.id === user?.id;
        const otherPartyPublicKey = isMyMessage ? recipientPublicKey : msg.sender.publicKey;
        
        // Decrypt the session key
        const sessionKey = decryptSessionKey(
          msg.encryptedSessionKey,
          otherPartyPublicKey,
          privateKey
        );

        if (!sessionKey) {
          throw new Error('Failed to decrypt session key');
        }

        // Decrypt the message using the session key
        const plaintext = decryptWithSessionKey(msg.ciphertextMessage, sessionKey);

        if (!plaintext) {
          throw new Error('Failed to decrypt message');
        }

        decrypted.push({
          ...msg,
          plaintext: plaintext as string,
        });
      } catch (error) {
        console.error('Failed to decrypt message:', msg._id, error);
        // Add placeholder for undecryptable messages
        decrypted.push({
          ...msg,
          plaintext: '[Unable to decrypt]',
        });
      }
    }

    return decrypted;
  };

  const handleSend = async () => {
    if (!messageText.trim() || !privateKey) {
      return;
    }

    setSending(true);
    try {
      // Generate a random session key and encrypt the message
      const sessionKeyBase64 = generateSessionKey();
      const ciphertext = encryptWithSessionKey(messageText.trim(), sessionKeyBase64);

      // Encrypt the session key with recipient's public key
      const encryptedSessionKey = encryptSessionKey(
        sessionKeyBase64,
        recipientPublicKey,
        privateKey
      );

      // Send to server
      const sentMessage = await messagesService.sendMessage(
        conversationId,
        ciphertext,
        encryptedSessionKey,
        undefined // No expiry for now
      );

      // Add to local state (decrypt it first)
      const sessionKeyDecrypted = decryptSessionKey(
        encryptedSessionKey,
        user!.publicKey,
        privateKey
      );
      
      if (!sessionKeyDecrypted) {
        throw new Error('Failed to decrypt own session key');
      }

      const plaintext = decryptWithSessionKey(ciphertext, sessionKeyDecrypted);

      if (!plaintext) {
        throw new Error('Failed to decrypt own message');
      }

      setMessages((prev) => [
        {
          ...sentMessage,
          plaintext: plaintext as string,
        },
        ...prev,
      ]);

      setMessageText('');
      
      // Scroll to top (which is bottom in inverted list)
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    try {
      if (deleteForEveryone) {
        await messagesService.deleteForEveryone(messageId);
      } else {
        await messagesService.deleteMessage(messageId);
      }
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete message');
    }
  };

  const showDeleteOptions = (message: DecryptedMessage) => {
    const isMine = message.sender.id === user?.id;

    Alert.alert(
      'Delete Message',
      'How do you want to delete this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete for me',
          onPress: () => handleDeleteMessage(message._id, false),
        },
        ...(isMine
          ? [
              {
                text: 'Delete for everyone',
                style: 'destructive' as const,
                onPress: () => handleDeleteMessage(message._id, true),
              },
            ]
          : []),
      ]
    );
  };

  const renderMessage = ({ item }: { item: DecryptedMessage }) => {
    const isMine = item.sender.id === user?.id;
    const time = new Date(item.sentAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={[styles.messageContainer, isMine ? styles.myMessage : styles.theirMessage]}
        onLongPress={() => showDeleteOptions(item)}
        delayLongPress={500}
      >
        <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {!isMine && (
            <Text style={styles.senderName}>{item.sender.username}</Text>
          )}
          <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
            {item.plaintext}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.timestamp, isMine ? styles.myTimestamp : styles.theirTimestamp]}>
              {time}
            </Text>
            {item.expirySeconds && (
              <Text style={[styles.expiryBadge, isMine ? styles.myExpiryBadge : styles.theirExpiryBadge]}>
                ⏱ {item.expirySeconds}s
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.recipientName}>{recipientName}</Text>
          <Text style={styles.encryptionStatus}>🔒 End-to-end encrypted</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        inverted={true}
        onContentSizeChange={() => {}}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💬</Text>
            <Text style={styles.emptyStateText}>No messages yet</Text>
            <Text style={styles.emptyStateHint}>
              Send a message to start the conversation
            </Text>
          </View>
        }
      />

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0E27',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B93B0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 18,
    backgroundColor: '#0F1629',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  backButton: {
    padding: 6,
  },
  backButtonText: {
    fontSize: 28,
    color: '#00D9FF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  recipientName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  encryptionStatus: {
    fontSize: 12,
    color: '#00FF88',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 14,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 20,
    padding: 14,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  myBubble: {
    backgroundColor: '#00D9FF',
  },
  theirBubble: {
    backgroundColor: '#151B33',
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00D9FF',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 23,
  },
  myText: {
    color: '#0A0E27',
    fontWeight: '600',
  },
  theirText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 8,
  },
  timestamp: {
    fontSize: 11,
  },
  myTimestamp: {
    color: 'rgba(10, 14, 39, 0.6)',
  },
  theirTimestamp: {
    color: '#8B93B0',
  },
  expiryBadge: {
    fontSize: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    fontWeight: '600',
  },
  myExpiryBadge: {
    backgroundColor: 'rgba(10, 14, 39, 0.2)',
    color: '#0A0E27',
  },
  theirExpiryBadge: {
    backgroundColor: '#FF4757',
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#0F1629',
    borderTopWidth: 1,
    borderTopColor: '#1E2A4A',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 2,
    borderColor: '#1E2A4A',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    fontSize: 16,
    backgroundColor: '#151B33',
    color: '#FFFFFF',
    marginRight: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00D9FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#1E2A4A',
  },
  sendButtonText: {
    fontSize: 22,
    color: '#0A0E27',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateIcon: {
    fontSize: 70,
    marginBottom: 18,
    opacity: 0.6,
  },
  emptyStateText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  emptyStateHint: {
    fontSize: 15,
    color: '#8B93B0',
    textAlign: 'center',
  },
});
