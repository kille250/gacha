/**
 * useHotelChat Hook
 *
 * Provides chat functionality for OpenHotel rooms including
 * message sending, typing indicators, and chat commands.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useOpenHotel } from '../OpenHotelProvider';
import { OH_EVENT } from '../config';

/**
 * Chat message types
 */
export const MESSAGE_TYPE = {
  CHAT: 'chat',
  SHOUT: 'shout',
  WHISPER: 'whisper',
  SYSTEM: 'system',
  ACTION: 'action'
};

/**
 * Command prefix
 */
const COMMAND_PREFIX = ':';

/**
 * Built-in client commands
 */
const CLIENT_COMMANDS = {
  'help': 'Show available commands',
  'clear': 'Clear chat history',
  'shout': 'Shout a message (or use !)',
  'whisper': 'Whisper to user (/whisper username message)',
  'sit': 'Sit on current tile',
  'stand': 'Stand up',
  'wave': 'Wave animation',
  'dance': 'Dance animation'
};

/**
 * Chat Hook
 */
export function useHotelChat() {
  const {
    currentRoom,
    roomMessages,
    roomUsers,
    sendMessage: sendRoomMessage,
    getSocket,
    hotelAccount
  } = useOpenHotel();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [whisperTarget, setWhisperTarget] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Refs
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  /**
   * Parse message for commands
   */
  const parseMessage = useCallback((text) => {
    const trimmed = text.trim();

    // Check for shout (starts with !)
    if (trimmed.startsWith('!')) {
      return {
        type: MESSAGE_TYPE.SHOUT,
        content: trimmed.slice(1).trim()
      };
    }

    // Check for command (starts with :)
    if (trimmed.startsWith(COMMAND_PREFIX)) {
      const parts = trimmed.slice(1).split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      return {
        type: 'command',
        command,
        args,
        raw: trimmed
      };
    }

    // Regular chat message
    return {
      type: MESSAGE_TYPE.CHAT,
      content: trimmed
    };
  }, []);

  /**
   * Execute client-side command
   */
  const executeCommand = useCallback((command, args) => {
    switch (command) {
      case 'help':
        // Add help message to local chat
        return {
          type: 'local',
          content: Object.entries(CLIENT_COMMANDS)
            .map(([cmd, desc]) => `${COMMAND_PREFIX}${cmd} - ${desc}`)
            .join('\n')
        };

      case 'clear':
        // This should be handled by the provider
        return { type: 'clear' };

      case 'shout':
        if (args.length > 0) {
          return {
            type: MESSAGE_TYPE.SHOUT,
            content: args.join(' ')
          };
        }
        return { type: 'error', content: 'Usage: :shout <message>' };

      case 'whisper':
      case 'w':
        if (args.length >= 2) {
          const target = args[0];
          const message = args.slice(1).join(' ');
          return {
            type: MESSAGE_TYPE.WHISPER,
            target,
            content: message
          };
        }
        return { type: 'error', content: 'Usage: :whisper <username> <message>' };

      case 'sit':
        return { type: 'action', action: 'sit' };

      case 'stand':
        return { type: 'action', action: 'stand' };

      case 'wave':
        return { type: 'action', action: 'wave' };

      case 'dance':
        return { type: 'action', action: 'dance' };

      default:
        // Unknown command - might be server-side
        return { type: 'server_command', command, args };
    }
  }, []);

  /**
   * Send message
   */
  const sendMessage = useCallback((text = inputValue) => {
    if (!text.trim() || !currentRoom) return false;

    const parsed = parseMessage(text);

    // Handle command
    if (parsed.type === 'command') {
      const result = executeCommand(parsed.command, parsed.args);

      switch (result.type) {
        case 'local':
          // Local message - handled by UI
          break;

        case 'clear':
          // Clear would need to be handled by parent
          break;

        case 'error':
          // Show error locally
          break;

        case 'action':
          // Send action to server
          getSocket()?.emit(result.action, {});
          break;

        case 'server_command':
          // Forward unknown command to server
          sendRoomMessage(`${COMMAND_PREFIX}${result.command} ${result.args.join(' ')}`, 'command');
          break;

        case MESSAGE_TYPE.SHOUT:
          sendRoomMessage(result.content, MESSAGE_TYPE.SHOUT);
          break;

        case MESSAGE_TYPE.WHISPER:
          sendRoomMessage(result.content, MESSAGE_TYPE.WHISPER);
          // Would need target info
          break;
      }
    } else {
      // Regular message
      sendRoomMessage(parsed.content, parsed.type);
    }

    // Add to history
    setCommandHistory(prev => [...prev.slice(-49), text]);
    setHistoryIndex(-1);

    // Clear input
    setInputValue('');

    // Stop typing indicator
    setIsTyping(false);
    getSocket()?.emit(OH_EVENT.TYPING_END, {});
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    return true;
  }, [inputValue, currentRoom, parseMessage, executeCommand, sendRoomMessage, getSocket]);

  /**
   * Stop typing indicator
   */
  const handleStopTyping = useCallback(() => {
    if (!isTyping) return;

    setIsTyping(false);
    getSocket()?.emit(OH_EVENT.TYPING_END, {});

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [isTyping, getSocket]);

  /**
   * Start typing indicator
   */
  const handleStartTyping = useCallback(() => {
    if (isTyping) return;

    setIsTyping(true);
    getSocket()?.emit(OH_EVENT.TYPING_START, {});

    // Auto-stop after 5 seconds of no input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 5000);
  }, [isTyping, getSocket, handleStopTyping]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((value) => {
    setInputValue(value);

    // Start typing indicator
    if (value.trim() && !isTyping) {
      handleStartTyping();
    } else if (!value.trim() && isTyping) {
      handleStopTyping();
    }
  }, [isTyping, handleStartTyping, handleStopTyping]);

  /**
   * Handle key press for history navigation
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInputValue('');
      }
    } else if (e.key === 'Escape') {
      setInputValue('');
      setHistoryIndex(-1);
      handleStopTyping();
    }
  }, [sendMessage, commandHistory, historyIndex, handleStopTyping]);

  /**
   * Listen for typing events from other users
   */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const unsubStart = socket.on(OH_EVENT.TYPING_START, ({ accountId }) => {
      if (accountId !== hotelAccount?.accountId) {
        setTypingUsers(prev => new Set([...prev, accountId]));
      }
    });

    const unsubEnd = socket.on(OH_EVENT.TYPING_END, ({ accountId }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    });

    return () => {
      unsubStart?.();
      unsubEnd?.();
    };
  }, [getSocket, hotelAccount]);

  /**
   * Format message for display
   */
  const formatMessage = useCallback((message) => {
    const user = roomUsers?.find(u => u.accountId === message.accountId);

    return {
      ...message,
      username: user?.username || message.username || 'Unknown',
      isOwn: message.accountId === hotelAccount?.accountId,
      formattedTime: new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }, [roomUsers, hotelAccount]);

  /**
   * Get formatted messages
   */
  const messages = roomMessages?.map(formatMessage) || [];

  /**
   * Get typing users info
   */
  const typingUsersInfo = Array.from(typingUsers).map(accountId => {
    const user = roomUsers?.find(u => u.accountId === accountId);
    return {
      accountId,
      username: user?.username || 'Someone'
    };
  });

  return {
    // State
    messages,
    inputValue,
    isTyping,
    typingUsers: typingUsersInfo,
    whisperTarget,

    // Refs
    inputRef,

    // Actions
    sendMessage,
    handleInputChange,
    handleKeyDown,
    setWhisperTarget,

    // Utilities
    parseMessage,
    formatMessage,
    commandHelp: CLIENT_COMMANDS
  };
}

export default useHotelChat;
