import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [participants, setParticipants] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const socket = useRef();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Initial scroll when messages are loaded
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    if (!currentUser) {
      navigate('/sign-in');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found in localStorage');
      navigate('/sign-in');
      return;
    }

    try {
      socket.current = io('http://localhost:3000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socket.current.on('connect', () => {
        console.log('Connected to chat server');
        setError(null);
      });

      socket.current.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
        setError(`Failed to connect to chat server: ${err.message}`);
        
        if (err.message.includes('Authentication error') || err.message.includes('No token provided')) {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('token');
          navigate('/sign-in');
        }
      });

      socket.current.on('disconnect', (reason) => {
        console.log('Disconnected from chat server:', reason);
        setError('Disconnected from chat server');
      });

      socket.current.on('new_message', (data) => {
        console.log('New message received:', data);
        // Update conversations list to show new message
        setConversations(prev => {
          const updatedConversations = [...prev];
          const conversationIndex = updatedConversations.findIndex(
            conv => conv._id === data.conversationId
          );
          
          if (conversationIndex !== -1) {
            updatedConversations[conversationIndex] = {
              ...updatedConversations[conversationIndex],
              lastMessage: data.message.content,
              lastMessageTime: data.message.createdAt
            };
          }
          
          return updatedConversations;
        });

        // If this is the current conversation, add the message
        if (currentConversation?._id === data.conversationId) {
          setMessages(prev => [...prev, data.message]);
          scrollToBottom();
        }
      });

      socket.current.on('user_typing', (data) => {
        console.log('User typing:', data);
        if (currentConversation?._id === data.conversationId) {
          setIsTyping(true);
        }
      });

      socket.current.on('user_stop_typing', (data) => {
        console.log('User stopped typing:', data);
        if (currentConversation?._id === data.conversationId) {
          setIsTyping(false);
        }
      });

      socket.current.on('message_error', (data) => {
        console.error('Message error:', data);
        // toast.error(data.error || 'Failed to send message');
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
  }, [currentUser, navigate, currentConversation]);

  // Fetch participant details
  const fetchParticipantDetails = async (userId, userModel) => {
    try {
      let endpoint;
      if (userModel === 'Agent') {
        endpoint = `/api/agent/${userId}`;
      } else if (userModel === 'RealEstateCompany') {
        endpoint = `/api/company/${userId}`;
      } else {
        endpoint = `/api/user/${userId}`;
      }

      const userRes = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!userRes.ok) {
        throw new Error(`Failed to fetch user data: ${userRes.status}`);
      }

      const userData = await userRes.json();
      console.log('Fetched user data:', userData);
      return userData;
    } catch (error) {
      console.error('Error fetching participant details:', error);
      return null;
    }
  };

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || !currentUser?._id) {
          setError('Please sign in to view messages');
          return;
        }

        setLoading(true);
        setError(null);
        
        const res = await fetch('/api/messages/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch conversations');
        }

        const data = await res.json();
        
        if (data.success) {
          setConversations(data.conversations);
          
          // Process participants
          const participantsData = {};
          data.conversations.forEach(conv => {
            const otherParticipant = conv.participants?.find(
              p => p.userId && p.userId._id !== currentUser._id
            );
            
            if (otherParticipant?.userId) {
              participantsData[conv._id] = {
                name: otherParticipant.userId.username || otherParticipant.userId.name || 'Unknown User',
                avatar: otherParticipant.userId.avatar,
                userModel: otherParticipant.userModel
              };
            }
          });
          
          setParticipants(participantsData);
          setError(null);
        } else {
          throw new Error(data.message || 'Error fetching conversations');
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setError(error.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser?._id) {
      fetchConversations();
    }
  }, [currentUser?._id]);

  // Render conversation list
  const renderConversationList = () => {
    if (loading) {
      return <div className="text-center py-4">Loading conversations...</div>;
    }

    if (error) {
      return <div className="text-center py-4 text-red-500">{error}</div>;
    }

    if (!conversations.length) {
      return <div className="text-center py-4">No conversations yet</div>;
    }

    return conversations.map((conversation) => {
      const participant = participants[conversation._id];
      const listing = conversation.listingId;
      const unreadCount = conversation.unreadCount || 0;
      const isSelected = currentConversation?._id === conversation._id;
      
      return (
        <div
          key={conversation._id}
          className={`flex items-center p-3 cursor-pointer relative group transition-all duration-200 
            ${isSelected 
              ? 'bg-blue-100 hover:bg-blue-200' 
              : 'hover:bg-gray-100'}`}
          onClick={() => setCurrentConversation(conversation)}
        >
          <div className="flex-shrink-0">
            {participant?.avatar ? (
              <img
                src={participant.avatar}
                alt={participant.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                {participant?.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          <div className="ml-3 flex-grow">
            <div className="flex justify-between items-start w-full">
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-900">
                  {listing?.name || 'Untitled Listing'}
                </h3>
                <p className="text-sm text-gray-600">
                  {participant?.name || 'Unknown User'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 min-w-[60px]">
                <span className="text-xs text-gray-500">
                  {conversation.lastMessageTime && formatMessageTime(conversation.lastMessageTime)}
                </span>
                {unreadCount > 0 && (
                  <span className="flex items-center justify-center w-6 h-6 text-sm font-medium text-white bg-purple-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-gray-600 truncate max-w-[200px]">
                {conversation.lastMessage || 'No messages yet'}
              </p>
            </div>
          </div>

          {/* Delete button */}
          <button
            onClick={(e) => handleDeleteClick(conversation, e)}
            className="absolute right-2 top-2 p-1 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      );
    });
  };

  const handleDeleteClick = (conversation, e) => {
    e.stopPropagation(); // Prevent conversation selection
    setConversationToDelete(conversation);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/conversation/${conversationToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        // Remove conversation from state
        setConversations(prev => prev.filter(conv => conv._id !== conversationToDelete._id));
        
        // If this was the current conversation, clear it
        if (currentConversation?._id === conversationToDelete._id) {
          setCurrentConversation(null);
          setMessages([]);
        }
        
        // toast.success('Conversation deleted successfully');
      } else {
        throw new Error(data.message || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      // toast.error('Failed to delete conversation');
    } finally {
      setShowDeleteConfirm(false);
      setConversationToDelete(null);
    }
  };

  // When conversation changes, join the conversation room and fetch messages
  useEffect(() => {
    if (currentConversation && socket.current) {
      console.log('Joining conversation:', currentConversation._id);
      socket.current.emit('join_conversation', currentConversation._id);
      
      // Fetch messages for this conversation
      const fetchMessages = async () => {
        try {
          const res = await fetch(`/api/messages/${currentConversation._id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const data = await res.json();
          
          if (data.success) {
            console.log('Fetched messages:', data.messages);
            // Sort messages by createdAt in ascending order
            const sortedMessages = data.messages.sort((a, b) => 
              new Date(a.createdAt) - new Date(b.createdAt)
            );
            setMessages(sortedMessages);
            
            // Mark messages as read if there are unread messages
            const unreadMessages = sortedMessages.filter(
              m => !m.read && m.receiver && m.receiver.toString() === currentUser._id.toString()
            );

            if (unreadMessages.length > 0) {
              try {
                const markReadRes = await fetch('/api/messages/mark-read', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({
                    conversationId: currentConversation._id
                  })
                });

                const markReadData = await markReadRes.json();
                if (markReadData.success) {
                  // Update messages to mark them as read
                  setMessages(prevMessages => 
                    prevMessages.map(msg => 
                      msg.receiver && msg.receiver.toString() === currentUser._id.toString() 
                        ? { ...msg, read: true }
                        : msg
                    )
                  );

                  // Update conversation unread count
                  setConversations(prevConversations => 
                    prevConversations.map(conv => 
                      conv._id === currentConversation._id
                        ? { 
                            ...conv, 
                            unreadCount: { [currentUser._id]: markReadData.unreadCount }
                          }
                        : conv
                    )
                  );
                } else {
                  console.error('Failed to mark messages as read:', markReadData.message);
                }
              } catch (error) {
                console.error('Error marking messages as read:', error);
              }
            }
          } else {
            throw new Error(data.message);
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
          setError('Failed to load messages');
        }
      };
      
      fetchMessages();
    }
  }, [currentConversation, currentUser._id]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket.current) return;

    const handleNewMessage = (message) => {
      console.log('Received message:', message);
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, { ...message, read: false }];
        // Sort messages by createdAt
        return newMessages.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
      
      // Update conversation order
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => 
          conv._id === message.conversationId 
            ? { ...conv, lastMessageTime: message.createdAt, lastMessage: message.content }
            : conv
        );
        // Sort conversations by lastMessageTime
        return updatedConversations.sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
          return timeB - timeA;
        });
      });
      
      scrollToBottom();
    };

    socket.current.on('receive_message', handleNewMessage);
    
    // Handle message acknowledgment
    socket.current.on('message_sent', (sentMessage) => {
      console.log('Message sent acknowledgment:', sentMessage);
      setMessages(prevMessages => [...prevMessages, sentMessage]);
      scrollToBottom();
    });

    return () => {
      socket.current.off('receive_message', handleNewMessage);
      socket.current.off('message_sent');
    };
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation) return;

    try {
      const receiver = currentConversation.participants.find(
        p => p.userId && currentUser._id && 
            p.userId._id.toString() !== currentUser._id.toString()
      );

      if (!receiver) {
        console.error('Could not find receiver in conversation');
        setError('Failed to send message: Could not find receiver');
        return;
      }

      const messageData = {
        conversationId: currentConversation._id,
        receiverId: receiver.userId._id,
        receiverModel: receiver.userModel,
        content: newMessage,
        sender: currentUser._id,
        createdAt: new Date().toISOString()
      };

      // Add message to local state immediately with a temporary ID
      const tempMessage = {
        ...messageData,
        _id: `temp-${Date.now()}`,
        read: true,
        pending: true
      };
      
      // Add message and sort
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, tempMessage];
        return newMessages.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
      
      // Update conversation order
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => 
          conv._id === currentConversation._id 
            ? { ...conv, lastMessageTime: messageData.createdAt, lastMessage: messageData.content }
            : conv
        );
        return updatedConversations.sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
          return timeB - timeA;
        });
      });

      scrollToBottom();

      // Emit the message
      socket.current.emit('send_message', messageData, (error) => {
        if (error) {
          console.error('Error sending message:', error);
          // Remove the temporary message if there was an error
          setMessages(prevMessages => 
            prevMessages.filter(msg => msg._id !== tempMessage._id)
          );
          setError('Failed to send message');
        }
      });

      setNewMessage('');
      setTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  // Delete confirmation modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Delete Conversation</h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this conversation? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const formatMessageTime = (date) => {
    if (!date) return '';
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Format time as HH:MM
    const timeString = messageDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // If message is from today, just show time
    if (messageDate.toDateString() === today.toDateString()) {
      return timeString;
    }
    
    // If message is from yesterday, show 'Yesterday' with time
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${timeString}`;
    }
    
    // For older messages, show date and time
    return `${messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })} ${timeString}`;
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-300 overflow-y-auto">
        <div className="p-4 border-b border-gray-300">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
        </div>
        {renderConversationList()}
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-300 bg-white">
              {currentConversation && (
                <div className="flex items-center gap-3">
                  <img
                    src={participants[currentConversation._id]?.avatar || 'https://via.placeholder.com/40'}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {currentConversation.listingId?.name || 
                       currentConversation.listingId?.title || 
                       'Unknown Listing'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      with {participants[currentConversation._id]?.name || 'Unknown User'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4" 
              ref={messagesContainerRef}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ flex: 1 }} />
              {messages.map((message, idx) => {
                const isCurrentUser = message.sender && 
                  message.sender.toString() === currentUser._id.toString();
                const isUnread = !message.read && 
                  message.receiver && 
                  message.receiver.toString() === currentUser._id.toString();
                const showAvatar = idx === 0 || 
                  (messages[idx - 1].sender && message.sender &&
                   messages[idx - 1].sender.toString() !== message.sender.toString());

                return (
                  <div
                    key={message._id || `temp-${idx}`}
                    className={`flex items-end gap-2 ${
                      isCurrentUser ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {showAvatar && (
                      <img
                        src={
                          isCurrentUser
                            ? currentUser.avatar || 'https://via.placeholder.com/32'
                            : participants[currentConversation._id]?.avatar || 'https://via.placeholder.com/32'
                        }
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    {!showAvatar && <div className="w-8" />}
                    <div
                      className={`relative max-w-[70%] break-words ${
                        isCurrentUser
                          ? 'bg-blue-500 text-white rounded-l-lg rounded-tr-lg'
                          : `${
                              isUnread
                                ? 'bg-blue-50 border-2 border-blue-300 shadow-md' 
                                : 'bg-gray-100'
                            } text-gray-800 rounded-r-lg rounded-tl-lg`
                      } px-4 py-2`}
                    >
                      {/* Message content */}
                      <p className={isUnread ? 'font-medium' : 'font-normal'}>
                        {message.content}
                      </p>

                      {/* Timestamp and read status */}
                      <div
                        className={`flex items-center gap-1 text-xs mt-1 ${
                          isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        <span>{formatMessageTime(message.createdAt)}</span>
                        {isCurrentUser && (
                          <span className="ml-1">
                            {message.read ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-100" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-100" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Unread indicator dot */}
                      {isUnread && (
                        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-300 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (!typing) {
                      setTyping(true);
                      socket.current.emit('typing', {
                        conversationId: currentConversation._id
                      });
                    }
                  }}
                  onBlur={() => {
                    if (typing) {
                      setTyping(false);
                      socket.current.emit('stop_typing', {
                        conversationId: currentConversation._id
                      });
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  Send
                </button>
              </form>
              {isTyping && (
                <div className="text-xs text-gray-500 mt-1">
                  {participants[currentConversation._id]?.name} is typing...
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal />
    </div>
  );
}
