import { useSelector } from 'react-redux';
import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import * as ReactDOMClient from 'react-dom/client';

export default function Messages() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const qrRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/sign-in');
      return;
    }

    try {
      socket.current = io('http://localhost:3000', {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket', 'polling']
      });

      socket.current.on('connect', () => {
        console.log('Socket connected');
      });

      socket.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
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
  }, [currentUser, navigate]);

  useEffect(() => {
    if (!socket.current || !currentConversation) return;

    console.log('Joining conversation:', currentConversation._id);
    socket.current.emit('join_conversation', currentConversation._id);

    return () => {
      if (socket.current) {
        socket.current.emit('leave_conversation', currentConversation._id);
      }
    };
  }, [currentConversation]);

  useEffect(() => {
    if (!socket.current) return;

    const handleReceivedMessage = (data) => {
      console.log('Received message:', data);
      
      if (!data?.message || !data.message?.sender || !data.conversationId) {
        console.error('Invalid message data received:', data);
        return;
      }

      // Skip if message is from current user (will be handled by message_sent event)
      if (data.message.sender._id === currentUser._id) {
        return;
      }

      setMessages(prevMessages => {
        // Check if message already exists
        const exists = prevMessages.some(msg => 
          msg && msg._id === data.message._id
        );
        if (exists) return prevMessages;

        const newMessages = [...prevMessages, {
          ...data.message,
          read: currentConversation?._id === data.conversationId
        }];

        return newMessages.sort((a, b) => 
          new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0)
        );
      });

      // Update conversation list
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => 
          conv._id === data.conversationId 
            ? { 
                ...conv, 
                lastMessage: data.message.content,
                lastMessageTime: data.message.createdAt,
                unreadCount: currentConversation?._id !== data.conversationId 
                  ? (conv.unreadCount || 0) + 1 
                  : conv.unreadCount
              }
            : conv
        );
        return updatedConversations.sort((a, b) => {
          const timeA = a?.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
          const timeB = b?.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
          return timeB - timeA;
        });
      });

      // Mark as read if we're in the conversation
      if (currentConversation?._id === data.conversationId) {
        socket.current.emit('mark_read', {
          conversationId: data.conversationId,
          messageIds: [data.message._id]
        });
      }

      scrollToBottom();
    };

    const handleMessageSent = (data) => {
      console.log('Message sent confirmation:', data);
      
      if (!data?.success || !data?.message || !data.message?._id) {
        console.error('Invalid message sent data:', data);
        return;
      }

      setMessages(prevMessages => {
        // Remove any temporary versions of this message and filter out invalid messages
        const filteredMessages = prevMessages.filter(msg => 
          msg && msg._id && !msg._id.startsWith('temp-')
        );

        // Add the confirmed message if it doesn't exist
        const exists = filteredMessages.some(msg => 
          msg && msg._id === data.message._id
        );
        if (exists) return filteredMessages;

        const newMessages = [...filteredMessages, {
          ...data.message,
          read: true
        }];

        return newMessages.sort((a, b) => 
          new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0)
        );
      });

      // Update conversation list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id === currentConversation?._id) {
            return {
              ...conv,
              lastMessage: data.message.content,
              lastMessageTime: data.message.createdAt
            };
          }
          return conv;
        });
        return updated.sort((a, b) => {
          const timeA = a?.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
          const timeB = b?.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
          return timeB - timeA;
        });
      });

      scrollToBottom();
    };

    const handleMessageError = (error) => {
      console.error('Message error:', error);
      setError(error.error || 'Failed to send message');
    };

    socket.current.on('new_message', handleReceivedMessage);
    socket.current.on('message_sent', handleMessageSent);
    socket.current.on('message_error', handleMessageError);

    return () => {
      socket.current.off('new_message', handleReceivedMessage);
      socket.current.off('message_sent', handleMessageSent);
      socket.current.off('message_error', handleMessageError);
    };
  }, [currentConversation, currentUser]);

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
        credentials: 'include'
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

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch('/api/messages/conversations', {
          credentials: 'include'
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch conversations');
        }

        const data = await res.json();
        
        if (data.success) {
          const sortedConversations = data.conversations.sort((a, b) => {
            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
            return timeB - timeA;
          });
          
          setConversations(sortedConversations);
          
          // Check for conversation ID in URL
          const conversationId = searchParams.get('conversation');
          if (conversationId) {
            const targetConversation = sortedConversations.find(conv => conv._id === conversationId);
            if (targetConversation) {
              setCurrentConversation(targetConversation);
            }
          }
          
          const participantsData = {};
          sortedConversations.forEach(conv => {
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
  }, [currentUser?._id, searchParams]);

  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (!currentConversation || !currentUser) return;

      try {
        const unreadMessages = messages.filter(
          msg => !msg.read && msg.sender !== currentUser._id
        );

        if (unreadMessages.length === 0) return;

        const res = await fetch('/api/messages/mark-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            conversationId: currentConversation._id
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to mark messages as read');
        }

        const data = await res.json();
        if (data.success) {
          // Update local messages state to mark them as read
          setMessages(prev => prev.map(msg => ({
            ...msg,
            read: msg.sender === currentUser._id ? msg.read : true
          })));

          // Emit socket event to notify sender
          socket.current?.emit('messages_read', {
            conversationId: currentConversation._id,
            userId: currentUser._id
          });
        }
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };

    markMessagesAsRead();
  }, [currentConversation, messages, currentUser]);

  useEffect(() => {
    if (!currentConversation || !socket.current) return;

    // Fetch messages for the current conversation
    const fetchMessages = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/messages/${currentConversation._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch messages');
        }

        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      socket.current.emit('leave_conversation', currentConversation._id);
    };
  }, [currentConversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation) return;

    try {
      const receiver = currentConversation.participants.find(
        p => p.userId._id.toString() !== currentUser._id.toString()
      );

      if (!receiver) {
        console.error('Could not find message receiver');
        setError('Failed to send message: Could not find receiver');
        return;
      }

      const tempMessage = {
        _id: `temp-${Date.now()}`,
        conversationId: currentConversation._id,
        content: newMessage,
        sender: currentUser._id,
        receiver: receiver.userId._id,
        receiverModel: receiver.userModel || 'User',
        createdAt: new Date().toISOString(),
        read: true,
        pending: true
      };

      // Add temporary message to UI
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      setNewMessage('');
      scrollToBottom();

      // Send through socket
      socket.current.emit('send_message', {
        ...tempMessage,
        _id: undefined // Let server generate the real ID
      }, (error) => {
        if (error) {
          console.error('Error sending message:', error);
          setMessages(prevMessages => 
            prevMessages.filter(msg => msg._id !== tempMessage._id)
          );
          setError('Failed to send message');
        }
      });
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setError('Failed to send message');
    }
  };

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
    e.stopPropagation(); 
    setConversationToDelete(conversation);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`/api/messages/conversation/${conversationToDelete._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();
      if (data.success) {
        setConversations(prev => prev.filter(conv => conv._id !== conversationToDelete._id));
        
        if (currentConversation?._id === conversationToDelete._id) {
          setCurrentConversation(null);
          setMessages([]);
        }
      } else {
        throw new Error(data.message || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    } finally {
      setShowDeleteConfirm(false);
      setConversationToDelete(null);
    }
  };

  const handleSendQRCode = async () => {
    if (!currentConversation) return;

    try {
      // Get the verification code first
      const codeRes = await fetch('/api/code/generate', {
        credentials: 'include'
      });

      const codeData = await codeRes.json();
      if (!codeRes.ok || !codeData.code) {
        throw new Error(codeData.message || 'Could not generate code');
      }

      // Create temporary div for QR code
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      // Create root and render QR code
      const root = ReactDOMClient.createRoot(tempDiv);
      root.render(
        <QRCodeSVG
          value={`${window.location.origin}/verify-code/${currentUser._id}/${codeData.code}`}
          size={256}
          level="H"
          includeMargin={true}
          style={{ background: 'white', padding: '10px' }}
        />
      );

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get SVG element
      const svgElement = tempDiv.querySelector('svg');
      if (!svgElement) {
        root.unmount();
        document.body.removeChild(tempDiv);
        throw new Error('Failed to generate QR code SVG');
      }

      // Convert SVG to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Clean up temporary div
      root.unmount();
      document.body.removeChild(tempDiv);

      // Return promise for image loading
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      // Draw image to canvas
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      try {
        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], 'verification-qr-code.png', { type: 'image/png' });
        
        // Create FormData and upload
        const formData = new FormData();
        formData.append('image', file);
        
        const uploadRes = await fetch('/api/upload/image', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        
        if (!uploadRes.ok) {
          throw new Error('Failed to upload QR code');
        }
        
        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.url) {
          throw new Error('Failed to get QR code URL');
        }
        
        // Send message with QR code
        const receiver = currentConversation.participants.find(
          p => p.userId._id.toString() !== currentUser._id.toString()
        );

        if (!receiver) {
          throw new Error('Could not find message receiver');
        }

        const messageData = {
          conversationId: currentConversation._id,
          content: 'Scan this QR code to verify the sender',
          receiver: receiver.userId._id,
          receiverModel: receiver.userModel || 'User',
          attachment: uploadData.url,
          type: 'qr-code'
        };
        
        // Add message to local state with temporary ID
        const tempMessage = {
          ...messageData,
          _id: `temp-${Date.now()}`,
          sender: currentUser._id,
          createdAt: new Date().toISOString(),
          read: true,
          pending: true
        };
        
        setMessages(prevMessages => {
          const newMessages = [...prevMessages, tempMessage];
          return newMessages.sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );
        });
        
        scrollToBottom();
        
        // Send through socket
        socket.current.emit('send_message', messageData, (error) => {
          if (error) {
            console.error('Error sending QR code:', error);
            setMessages(prevMessages => 
              prevMessages.filter(msg => msg._id !== tempMessage._id)
            );
            setError('Failed to send QR code');
          }
        });
      } catch (error) {
        console.error('Error processing QR code:', error);
        setError('Failed to process QR code');
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code');
    }
  };

  const renderMessages = () => {
    if (loading) {
      return <div className="text-center py-4">Loading messages...</div>;
    }

    if (!messages.length) {
      return (
        <div className="text-center py-4 text-gray-500">
          No messages yet. Start the conversation!
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-4 p-4">
        <div style={{ flex: 1 }} />
        {messages.map((message, idx) => {
          const isCurrentUser = message.sender?._id === currentUser._id || 
                              message.sender === currentUser._id;
          const isUnread = !message.read && message.receiver === currentUser._id;
          const showAvatar = idx === 0 || 
            messages[idx - 1].sender !== message.sender;

          // Get the participant info based on sender
          const senderParticipant = currentConversation?.participants?.find(p => 
            (p.userId._id === (message.sender?._id || message.sender))
          );
          
          // Get sender's display name
          const senderName = senderParticipant?.userId?.username || 
                           senderParticipant?.userId?.name || 
                           'Unknown User';

          return (
            <div
              key={message._id}
              className="flex items-start w-full"
              style={{ justifyContent: isCurrentUser ? 'flex-end' : 'flex-start' }}
            >
              {!isCurrentUser && showAvatar && (
                <div className="flex-shrink-0 mr-2">
                  <img
                    src={senderParticipant?.userId?.avatar || '/default-avatar.png'}
                    alt={senderName}
                    className="w-8 h-8 rounded-full"
                  />
                </div>
              )}
              <div className="flex flex-col max-w-[50%]" style={{ alignItems: isCurrentUser ? 'flex-end' : 'flex-start' }}>
                {showAvatar && (
                  <span className="text-xs text-gray-500 mb-1">
                    {isCurrentUser ? 'You' : senderName}
                  </span>
                )}
                <div
                  className={`rounded-lg px-4 py-2 w-fit ${
                    isCurrentUser
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  } ${message.pending ? 'opacity-70' : ''}`}
                >
                  <p className="m-0 whitespace-pre-wrap break-words">{message.content}</p>
                  {message.attachment && (
                    <div className="mt-2">
                      <img
                        src={message.attachment}
                        alt="QR Code"
                        className="max-w-[200px] w-full h-auto rounded-lg"
                        style={{ maxHeight: '200px', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-xs text-gray-500">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs text-gray-500">
                      {message.read ? '• Read' : '• Sent'}
                    </span>
                  )}
                  {isUnread && !isCurrentUser && (
                    <span className="text-xs text-blue-500">• New</span>
                  )}
                </div>
              </div>
              {isCurrentUser && showAvatar && (
                <div className="flex-shrink-0 ml-2">
                  <img
                    src={currentUser.avatar || '/default-avatar.png'}
                    alt="You"
                    className="w-8 h-8 rounded-full"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

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

    const timeString = messageDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (messageDate.toDateString() === today.toDateString()) {
      return timeString;
    }
    
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${timeString}`;
    }
    
    return `${messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })} ${timeString}`;
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-1/3 border-r border-gray-300 overflow-y-auto">
        <div className="p-4 border-b border-gray-300">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
        </div>
        {renderConversationList()}
      </div>

      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            <div className="p-4 border-b border-gray-300 bg-white">
              {currentConversation && (
                <div className="flex items-center justify-between">
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
                </div>
              )}
            </div>

            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4" 
              ref={messagesContainerRef}
              style={{ display: 'flex', flexDirection: 'column' }}
            >
              {renderMessages()}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-300 bg-white relative">
              <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      if (!typing) {
                        setTyping(true);
                        socket.current.emit('user_typing', {
                          conversationId: currentConversation._id
                        });
                      }
                    }}
                    onBlur={() => {
                      if (typing) {
                        setTyping(false);
                        socket.current.emit('user_stop_typing', {
                          conversationId: currentConversation._id
                        });
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:border-blue-500 h-[65px] text-lg"
                  />
                  <button
                    type="button"
                    onClick={handleSendQRCode}
                    className="bg-gray-100 text-gray-600 px-4 rounded-lg hover:bg-gray-200 transition-colors z-10 h-[65px] flex items-center justify-center"
                    title="Send QR Code"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11V9m0 0H4m6 0h4m6 0v1m-6 0h-1m-6 0v1m6-9a9 9 0 012 12m0 9a9 9 0 012 12m9-9v1m-6 0h-1m-6 0v1m6-9a9 9 0 012 12m0 9a9 9 0 012 12" />
                    </svg>
                  </button>
                </div>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-6 py-2.5 rounded-lg hover:bg-blue-600 transition-colors z-10 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 w-full h-[65px] text-lg"
                  disabled={!newMessage.trim()}
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

      {DeleteConfirmationModal()}
    </div>
  );
}