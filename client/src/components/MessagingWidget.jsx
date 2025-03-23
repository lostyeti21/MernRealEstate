import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';

const MessagingWidget = () => {
  const { currentUser } = useSelector((state) => state.user);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const socket = useRef();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/messages/conversations', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch conversations');
        const data = await response.json();
        setConversations(data.conversations || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError('Failed to load conversations');
        setLoading(false);
      }
    };

    try {
      socket.current = io('http://localhost:3000', {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket', 'polling']
      });

      socket.current.on('connect', () => {
        console.log('Socket connected');
        fetchConversations();
      });

      socket.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setError('Failed to connect to chat service');
      });

      socket.current.on('new_message', (data) => {
        if (!data?.message || !data.message?.sender) return;
        
        setMessages(prevMessages => {
          if (!Array.isArray(prevMessages)) return [data.message];
          
          const exists = prevMessages.some(msg => msg._id === data.message._id);
          if (exists) return prevMessages;

          const newMessages = [...prevMessages, data.message];
          return newMessages.sort((a, b) => 
            new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0)
          );
        });

        setConversations(prevConversations => {
          const updatedConversations = prevConversations.map(conv => 
            conv._id === data.conversationId 
              ? { 
                  ...conv, 
                  lastMessage: data.message.content,
                  lastMessageTime: data.message.createdAt,
                  unreadCount: (conv.unreadCount || 0) + 1
                }
              : conv
          );
          return updatedConversations.sort((a, b) => {
            const timeA = a?.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
            const timeB = b?.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
            return timeB - timeA;
          });
        });

        scrollToBottom();
      });

      return () => {
        if (socket.current) {
          socket.current.disconnect();
        }
      };
    } catch (error) {
      console.error('Error initializing socket:', error);
      setError('Failed to initialize chat connection');
    }
  }, [currentUser]);

  useEffect(() => {
    if (messages && messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/messages/conversations', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        setMessages(data.messages || []);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchMessages();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!socket.current) return;

    const handleNewMessage = (data) => {
      if (!data?.message || !data.message?.sender) return;
      
      setMessages(prevMessages => {
        const exists = prevMessages.some(msg => msg._id === data.message._id);
        if (exists) return prevMessages;

        const newMessages = [...prevMessages, data.message];
        return newMessages.sort((a, b) => 
          new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0)
        );
      });
      scrollToBottom();
    };

    socket.current.on('new_message', handleNewMessage);

    return () => {
      socket.current.off('new_message', handleNewMessage);
    };
  }, [socket.current]);

  return (
    <StyledWrapper>
      <div className="card">
        <h2 className="messages-title">
          Messages
          {conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0) > 0 && (
            <span className="unread-badge">{`Unread ${conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0)}`}</span>
          )}
        </h2>
        <div className="messages" ref={messagesContainerRef}>
          {loading ? (
            <div className="loading">Loading messages...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : !Array.isArray(conversations) || conversations.length === 0 ? (
            <div className="no-messages">No conversations yet</div>
          ) : (
            <>
              {conversations.map((conversation) => (
                conversation && (
                  <Link 
                    to={`/messages?conversation=${conversation._id}`} 
                    key={conversation._id} 
                    className="conversation-link"
                  >
                    <div className="message">
                      <div className="message-icon">
                        {conversation.participants?.[0]?.userId?.avatar ? (
                          <img src={conversation.participants[0].userId.avatar} alt="avatar" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="default-avatar">
                            {(conversation.participants?.[0]?.userId?.username || conversation.participants?.[0]?.userId?.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="message-info">
                        <div className="message-header">
                          <span className="message-title">
                            {conversation.participants?.[0]?.userId?.username || conversation.participants?.[0]?.userId?.name || 'Unknown'}
                          </span>
                          <span className="message-time">
                            {conversation.lastMessageTime ? new Date(conversation.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                          </span>
                        </div>
                        <div className="message-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{conversation.lastMessage || 'No messages yet'}</span>
                          {conversation.unreadCount > 0 && (
                            <span className="unread-count">{conversation.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .card {
    transform: scale(1);
    transition: all 0.3s ease-in-out;
    position: relative;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

    &:hover {
      transform: scale(1.02);
      z-index: 2;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      
      & ~ div > .card {
        filter: blur(2px);
        opacity: 0.85;
        transform: scale(0.98);
      }
    }
    width: 390px;
    height: 350px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 0.875rem;
    padding: 1.5rem;
    -webkit-user-drag: none;
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      Segoe UI,
      Roboto,
      Noto Sans,
      Ubuntu,
      Cantarell,
      Helvetica Neue,
      Arial,
      sans-serif,
      Apple Color Emoji,
      Segoe UI Emoji,
      Segoe UI Symbol,
      Noto Color emoji;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease-in-out;

  .messages-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1.25rem;
    color: #1a1a1a;
    letter-spacing: -0.5px;
    padding: 0.5rem 0;
    border-bottom: 2px solid #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    .unread-badge {
      background-color: #ef4444;
      color: white;
      font-size: 0.7875rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
      margin-left: auto;
    }
  }

  .messages {
    width: 100%;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 1rem;
    padding: 0 1rem;
  }

  .message {
    width: 364px;
    border: 1.5px solid rgba(0, 0, 0, 0.08);
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    display: flex;
    gap: 1rem;
    transform: scale(0);
    height: 0;
    box-shadow: 0px 4px 16px 8px rgba(0, 0, 0, 0.03);
    animation: show-message 200ms forwards;
    transform-origin: top center;
    visibility: hidden;
    transition: all 0.2s ease-in-out;
    cursor: pointer;
  }

  .message:hover {
    box-shadow: 0px 3px 16px 8px rgba(0, 0, 0, 0.07);
    transform: translateY(-2px);
  }

  .conversation-link {
    text-decoration: none;
    color: inherit;
    display: block;
    margin-bottom: 1rem;
    width: 100%;
    display: flex;
    justify-content: center;
    max-width: 364px;
  }

  .unread-count {
    background-color: #007bff;
    color: white;
    border-radius: 50%;
    padding: 2px 6px;
    font-size: 0.75rem;
    margin-left: 8px;
  }

  .message-icon {
    background: linear-gradient(135deg, rgb(255, 137, 176), rgb(126, 93, 255));
    width: 2.5rem;
    height: 2.5rem;
    min-width: 2.5rem;
    min-height: 2.5rem;
    border-radius: 1rem;
  }

  .message:nth-child(1) {
    animation-delay: calc(4 * var(--delay));
  }

  .message:nth-child(2) {
    animation-delay: calc(3 * var(--delay));
  }

  .message:nth-child(3) {
    animation-delay: calc(2 * var(--delay));
  }

  .message:nth-child(4) {
    animation-delay: var(--delay);
  }

  .message:nth-child(2) .message-icon {
    background: linear-gradient(180deg, rgb(242, 124, 40), rgb(255, 69, 243));
  }

  .message:nth-child(3) .message-icon {
    background: linear-gradient(90deg, rgb(242, 212, 40), rgb(255, 56, 56));
  }

  .message:nth-child(4) .message-icon {
    background: linear-gradient(45deg, rgb(70, 197, 255), rgb(64, 64, 255));
  }

  .message:nth-child(5) .message-icon {
    background: linear-gradient(45deg, rgb(247, 158, 85), rgb(231, 38, 249));
  }

  .message-info {
    display: flex;
    flex-direction: column;
  }

  .message-header {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: flex-start;
    line-height: 1.2;
    gap: 12px;
    user-select: none;
    -webkit-user-select: none;
    width: 100%;
  }

  .message-title {
    font-size: 1rem;
    font-weight: 600;
    word-break: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
  }

  .message-time {
    font-size: 0.875rem;
    color: #454545;
    justify-self: end;
  }

  .message-content {
    margin-top: 0.5rem;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: wrap;
    font-weight: 300;
  }

  .loading {
    text-align: center;
    color: #666;
    padding: 2rem;
  }

  .no-messages {
    text-align: center;
    color: #666;
    padding: 2rem;
  }

  @keyframes show-message {
    0% {
      transform: scale(0);
      margin-bottom: 0;
      visibility: visible;
    }
    100% {
      transform: scale(1);
      height: 100%;
      margin-bottom: 1rem;
      visibility: visible;
    }
  }
`;

export default MessagingWidget;
