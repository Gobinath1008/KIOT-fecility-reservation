'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './messages.module.css';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const initialWith = searchParams.get('with');

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(initialWith || null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/messages?action=conversations');
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?with=${userId}`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchConversations();
    }, 0);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      setTimeout(() => {
        fetchMessages(selectedConversation);
      }, 0);
      // Poll for new messages every 2 seconds
      const interval = setInterval(() => {
        fetchMessages(selectedConversation);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: selectedConversation, content: messageText })
      });

      if (res.ok) {
        setMessageText('');
        await fetchMessages(selectedConversation);
        await fetchConversations();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Delete this message?')) return;

    try {
      const res = await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchMessages(selectedConversation);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // Filter conversations by search query
  const searchFilteredConversations = conversations.filter(conv =>
    conv.lastMessage?.sender?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.receiver?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Deduplicate conversations by contactId
  const filteredConversations = searchFilteredConversations.filter((conv, index, self) =>
    index === self.findIndex(c => c.contactId === conv.contactId)
  );

  const currentUser = conversations[0]?.lastMessage?.sender?._id === selectedConversation ? 
    conversations[0]?.lastMessage?.receiver : conversations[0]?.lastMessage?.sender;

  const selectedUserName = conversations.find(c => c.contactId === selectedConversation)?.lastMessage?.sender?._id === selectedConversation ?
    conversations.find(c => c.contactId === selectedConversation)?.lastMessage?.sender?.name :
    conversations.find(c => c.contactId === selectedConversation)?.lastMessage?.receiver?.name;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Conversations List */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2>Messages</h2>
          </div>

          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.conversationsList}>
            {filteredConversations.length === 0 ? (
              <div className={styles.empty}>
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const otherUser = conv.lastMessage?.sender?._id === selectedConversation ? 
                  conv.lastMessage?.receiver : conv.lastMessage?.sender;
                return (
                  <div
                    key={`conv-${conv.contactId}`}
                    className={`${styles.conversationItem} ${selectedConversation === conv.contactId ? styles.active : ''}`}
                    onClick={() => setSelectedConversation(conv.contactId)}
                  >
                    <div className={styles.avatar}>
                      {otherUser?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className={styles.conversationInfo}>
                      <div className={styles.conversationName}>{otherUser?.name}</div>
                      <div className={styles.lastMessage}>
                        {conv.lastMessage?.content?.substring(0, 40)}...
                      </div>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className={styles.unreadBadge}>{conv.unreadCount}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className={styles.chatArea}>
          {selectedConversation ? (
            <>
              <div className={styles.chatHeader}>
                <h3>{selectedUserName || 'Chat'}</h3>
              </div>

              <div className={styles.messagesContainer}>
                {loading ? (
                  <div className={styles.loadingState}>
                    <div className="spinner" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.emptyChat}>
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  <div className={styles.messagesList}>
                    {messages.map(msg => (
                      <div key={msg._id} className={`${styles.message} ${msg.sender?._id === selectedConversation ? styles.received : styles.sent}`}>
                        <div className={styles.messageContent}>
                          <p className={styles.messageText}>{msg.content}</p>
                          <div className={styles.messageFooter}>
                            <span className={styles.messageTime}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.sender?._id !== selectedConversation && (
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleDeleteMessage(msg._id)}
                                title="Delete message"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className={styles.inputArea}>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className={styles.messageInput}
                  disabled={sending}
                />
                <button type="submit" className="btn-primary" disabled={sending || !messageText.trim()}>
                  {sending ? '...' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              <div className={styles.emptyIcon}>💬</div>
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
