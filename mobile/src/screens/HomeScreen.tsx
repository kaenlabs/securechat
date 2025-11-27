import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { conversationsService } from '../services/conversations.service';
import { Conversation } from '../types';

export const HomeScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
    // Poll for new conversations every 5 seconds
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      const data = await conversationsService.getUserConversations();
      setConversations(data);
      setLoading(false);
      setRefreshing(false);
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      if (loading) {
        Alert.alert('Error', 'Failed to load conversations');
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleLogout = async () => {
    await logout();
  };

  const getConversationName = (conv: Conversation): string => {
    if (conv.type === 'group') {
      return conv.groupName || 'Group Chat';
    }
    // For direct messages, show the other user's name
    const otherUser = conv.userA?.id === user?.id ? conv.userB : conv.userA;
    return otherUser?.username || 'Unknown';
  };

  const getRecipientPublicKey = (conv: Conversation): string => {
    const otherUser = conv.userA?.id === user?.id ? conv.userB : conv.userA;
    return otherUser?.publicKey || '';
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const conversationName = getConversationName(item);
    const recipientPublicKey = getRecipientPublicKey(item);
    const time = new Date(item.updatedAt).toLocaleDateString();

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() =>
          navigation.navigate('Chat', {
            conversationId: item._id,
            recipientName: conversationName,
            recipientPublicKey,
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {conversationName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.username}>{conversationName}</Text>
            <Text style={styles.time}>{time}</Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.type === 'group' ? '👥 Group chat' : '🔐 Encrypted conversation'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SecureChat 🔐</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.userInfo}>Logged in as: {user?.username}</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item._id}
          style={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>Tap 🔍 to search for users</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0F1629',
    paddingTop: 55,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  searchButton: {
    padding: 10,
    backgroundColor: '#151B33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  searchButtonText: {
    fontSize: 22,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FF4757',
    borderRadius: 12,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  userInfo: {
    padding: 12,
    backgroundColor: '#151B33',
    fontSize: 13,
    color: '#8B93B0',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A4A',
  },
  list: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 18,
    marginHorizontal: 15,
    marginVertical: 6,
    backgroundColor: '#151B33',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E2A4A',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#00D9FF',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  username: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  time: {
    fontSize: 12,
    color: '#8B93B0',
  },
  lastMessage: {
    fontSize: 14,
    color: '#8B93B0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8B93B0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8B93B0',
  },
});
