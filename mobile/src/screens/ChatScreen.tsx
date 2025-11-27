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
import {
  encryptWithSessionKey,
  decryptWithSessionKey,
  encryptSessionKey,
  decryptSessionKey,
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
      setMessages(decrypted);
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
        // Decrypt the session key using recipient's private key
        const sessionKey = decryptSessionKey(
          msg.encryptedSessionKey,
          msg.sender.publicKey,
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
      const sessionKey = tweetnacl.randomBytes(32);
      const sessionKeyBase64 = Buffer.from(sessionKey).toString('base64');
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
        ...prev,
        {
          ...sentMessage,
          plaintext: plaintext as string,
        },
      ]);

      setMessageText('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
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
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 28,
    color: '#007AFF',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  recipientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  encryptionStatus: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  messagesList: {
    padding: 15,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#007AFF',
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myText: {
    color: '#FFFFFF',
  },
  theirText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  timestamp: {
    fontSize: 11,
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirTimestamp: {
    color: '#999',
  },
  expiryBadge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  myExpiryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
  },
  theirExpiryBadge: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  sendButtonText: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
