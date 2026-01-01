/**
 * OpenHotel Test Page
 *
 * Simple test page to verify OpenHotel integration is working.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useOpenHotel, CONNECTION_STATE } from '../integrations/openhotel';
import { theme } from '../design-system';
import { OPENHOTEL_CONFIG } from '../integrations/openhotel/config';

const HotelTestPage = () => {
  const {
    isEnabled,
    connectionState,
    connectionError,
    isConnected,
    isConnecting,
    hotelAccount,
    currentRoom,
    roomUsers,
    roomMessages,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    config
  } = useOpenHotel();

  const [message, setMessage] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomList, setRoomList] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomError, setRoomError] = useState(null);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Fetch room list from the server
  const fetchRoomList = useCallback(async () => {
    setLoadingRooms(true);
    setRoomError(null);
    try {
      // Fetch both public and private rooms
      const [publicRes, privateRes] = await Promise.all([
        fetch(`${OPENHOTEL_CONFIG.httpUrl}/room/list?type=public`),
        fetch(`${OPENHOTEL_CONFIG.httpUrl}/room/list?type=private`)
      ]);

      const publicData = await publicRes.json();
      const privateData = await privateRes.json();

      const allRooms = [
        ...(publicData.rooms || []).map(r => ({ ...r, type: 'public' })),
        ...(privateData.rooms || []).map(r => ({ ...r, type: 'private' }))
      ];

      setRoomList(allRooms);

      // Auto-select first room if available
      if (allRooms.length > 0 && !roomId) {
        setRoomId(allRooms[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch room list:', error);
      setRoomError('Failed to load rooms: ' + error.message);
    } finally {
      setLoadingRooms(false);
    }
  }, [roomId]);

  // Create a new room
  const createRoom = async () => {
    if (!newRoomTitle.trim()) return;

    setCreatingRoom(true);
    setRoomError(null);
    try {
      const response = await fetch(`${OPENHOTEL_CONFIG.httpUrl}/room`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRoomTitle.trim(),
          description: 'Created from gacha game',
          layoutId: 0 // Default layout
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      setNewRoomTitle('');
      setRoomId(data.room.id);

      // Refresh room list
      await fetchRoomList();
    } catch (error) {
      console.error('Failed to create room:', error);
      setRoomError('Failed to create room: ' + error.message);
    } finally {
      setCreatingRoom(false);
    }
  };

  // Fetch rooms when connected
  useEffect(() => {
    if (isConnected) {
      fetchRoomList();
    }
  }, [isConnected, fetchRoomList]);

  const handleConnect = async () => {
    const success = await connect();
    if (success) {
      console.log('Connected to OpenHotel!');
    }
  };

  const handleJoinRoom = async () => {
    try {
      await joinRoom(roomId);
      console.log('Joined room:', roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  if (!isEnabled) {
    return (
      <Container>
        <Title>OpenHotel Integration</Title>
        <StatusCard $status="disabled">
          <StatusDot $color="error" />
          <StatusText>OpenHotel is disabled</StatusText>
          <StatusDetail>
            Set VITE_OPENHOTEL_ENABLED=true in your environment to enable.
          </StatusDetail>
        </StatusCard>
        <ConfigInfo>
          <h3>Configuration</h3>
          <pre>{JSON.stringify(config, null, 2)}</pre>
        </ConfigInfo>
      </Container>
    );
  }

  return (
    <Container>
      <Title>OpenHotel Test</Title>

      {/* Connection Status */}
      <StatusCard $status={connectionState}>
        <StatusDot $color={
          connectionState === CONNECTION_STATE.CONNECTED ? 'success' :
          connectionState === CONNECTION_STATE.CONNECTING ? 'warning' :
          connectionState === CONNECTION_STATE.ERROR ? 'error' : 'neutral'
        } />
        <StatusText>
          {connectionState === CONNECTION_STATE.CONNECTED ? 'Connected' :
           connectionState === CONNECTION_STATE.CONNECTING ? 'Connecting...' :
           connectionState === CONNECTION_STATE.ERROR ? 'Error' : 'Disconnected'}
        </StatusText>
        {connectionError && <StatusDetail>{connectionError}</StatusDetail>}
      </StatusCard>

      {/* Connection Controls */}
      <Section>
        <h3>Connection</h3>
        <ButtonGroup>
          <Button onClick={handleConnect} disabled={isConnecting || isConnected}>
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
          <Button onClick={disconnect} disabled={!isConnected} $variant="secondary">
            Disconnect
          </Button>
        </ButtonGroup>
      </Section>

      {/* Account Info */}
      {hotelAccount && (
        <Section>
          <h3>Hotel Account</h3>
          <InfoCard>
            <InfoRow>
              <InfoLabel>Account ID:</InfoLabel>
              <InfoValue>{hotelAccount.accountId}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Username:</InfoLabel>
              <InfoValue>{hotelAccount.username}</InfoValue>
            </InfoRow>
          </InfoCard>
        </Section>
      )}

      {/* Room Controls */}
      {isConnected && (
        <Section>
          <h3>Room</h3>

          {/* Room List */}
          {loadingRooms ? (
            <InfoCard>Loading rooms...</InfoCard>
          ) : roomList.length > 0 ? (
            <>
              <RoomListLabel>Available Rooms:</RoomListLabel>
              <RoomListContainer>
                {roomList.map((room) => (
                  <RoomItem
                    key={room.id}
                    $selected={roomId === room.id}
                    onClick={() => setRoomId(room.id)}
                  >
                    <RoomItemTitle>{room.title}</RoomItemTitle>
                    <RoomItemMeta>
                      <span>{room.type}</span>
                      <span>{room.userCount || 0} users</span>
                    </RoomItemMeta>
                  </RoomItem>
                ))}
              </RoomListContainer>
            </>
          ) : (
            <InfoCard>No rooms available. Create one below!</InfoCard>
          )}

          {roomError && <ErrorText>{roomError}</ErrorText>}

          {/* Join/Leave Controls */}
          <InputGroup>
            <Button onClick={handleJoinRoom} disabled={!!currentRoom || !roomId}>
              Join Room
            </Button>
            <Button onClick={leaveRoom} disabled={!currentRoom} $variant="secondary">
              Leave Room
            </Button>
            <Button onClick={fetchRoomList} disabled={loadingRooms} $variant="secondary">
              Refresh
            </Button>
          </InputGroup>

          {/* Create Room */}
          <CreateRoomSection>
            <h4>Create New Room</h4>
            <InputGroup>
              <Input
                type="text"
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                placeholder="Room name"
              />
              <Button onClick={createRoom} disabled={creatingRoom || !newRoomTitle.trim()}>
                {creatingRoom ? 'Creating...' : 'Create'}
              </Button>
            </InputGroup>
          </CreateRoomSection>

          {currentRoom && (
            <InfoCard>
              <InfoRow>
                <InfoLabel>Current Room:</InfoLabel>
                <InfoValue>{currentRoom.title || currentRoom.id}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Users:</InfoLabel>
                <InfoValue>{roomUsers.length}</InfoValue>
              </InfoRow>
            </InfoCard>
          )}
        </Section>
      )}

      {/* Chat */}
      {currentRoom && (
        <Section>
          <h3>Chat</h3>
          <ChatContainer>
            <ChatMessages>
              {roomMessages.length === 0 ? (
                <EmptyChat>No messages yet</EmptyChat>
              ) : (
                roomMessages.map((msg, i) => (
                  <ChatMessage key={i} $isSystem={msg.type === 'system'}>
                    {msg.type === 'system' ? (
                      <SystemMessage>{msg.message}</SystemMessage>
                    ) : (
                      <>
                        <ChatUser>{msg.username || msg.accountId}:</ChatUser>
                        <ChatText>{msg.message}</ChatText>
                      </>
                    )}
                  </ChatMessage>
                ))
              )}
            </ChatMessages>
            <ChatForm onSubmit={handleSendMessage}>
              <ChatInput
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <Button type="submit">Send</Button>
            </ChatForm>
          </ChatContainer>
        </Section>
      )}

      {/* Users List */}
      {currentRoom && roomUsers.length > 0 && (
        <Section>
          <h3>Users in Room ({roomUsers.length})</h3>
          <UsersList>
            {roomUsers.map((user) => (
              <UserItem key={user.accountId}>
                <UserAvatar>👤</UserAvatar>
                <UserName>{user.username || user.accountId}</UserName>
              </UserItem>
            ))}
          </UsersList>
        </Section>
      )}

      {/* Debug Info */}
      <Section>
        <h3>Server Info</h3>
        <ConfigInfo>
          <pre>URL: {config.serverUrl}</pre>
          <pre>HTTP: {config.httpUrl}</pre>
        </ConfigInfo>
      </Section>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${theme.fontSizes['2xl']};
  margin-bottom: ${theme.spacing.xl};
  color: ${theme.colors.text};
`;

const StatusCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.backgroundSecondary};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.xl};
  border: 1px solid ${props =>
    props.$status === 'connected' ? 'rgba(34, 197, 94, 0.3)' :
    props.$status === 'error' ? 'rgba(239, 68, 68, 0.3)' :
    'rgba(255, 255, 255, 0.1)'
  };
`;

const StatusDot = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${props => {
    switch (props.$color) {
      case 'success': return 'rgb(34, 197, 94)';
      case 'warning': return 'rgb(234, 179, 8)';
      case 'error': return 'rgb(239, 68, 68)';
      default: return 'rgb(156, 163, 175)';
    }
  }};
  flex-shrink: 0;
`;

const StatusText = styled.span`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
`;

const StatusDetail = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-left: auto;
`;

const Section = styled.section`
  margin-bottom: ${theme.spacing.xl};

  h3 {
    font-size: ${theme.fontSizes.lg};
    margin-bottom: ${theme.spacing.md};
    color: ${theme.colors.text};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
`;

const Button = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${props => props.$variant === 'secondary'
    ? 'rgba(255, 255, 255, 0.1)'
    : theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${theme.radius.md};
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${props => props.$variant === 'secondary'
      ? 'rgba(255, 255, 255, 0.2)'
      : theme.colors.primaryHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const InputGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-bottom: ${theme.spacing.md};
`;

const Input = styled.input`
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};
  flex: 1;

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

const InfoCard = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radius.md};
`;

const InfoRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.xs} 0;
`;

const InfoLabel = styled.span`
  color: ${theme.colors.textSecondary};
  min-width: 100px;
`;

const InfoValue = styled.span`
  color: ${theme.colors.text};
  font-family: monospace;
`;

const ConfigInfo = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(0, 0, 0, 0.3);
  border-radius: ${theme.radius.md};

  pre {
    margin: 0;
    font-size: ${theme.fontSizes.sm};
    color: ${theme.colors.textSecondary};
    white-space: pre-wrap;
    word-break: break-all;
  }
`;

const ChatContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radius.lg};
  overflow: hidden;
`;

const ChatMessages = styled.div`
  height: 200px;
  overflow-y: auto;
  padding: ${theme.spacing.md};
`;

const EmptyChat = styled.div`
  color: ${theme.colors.textSecondary};
  text-align: center;
  padding: ${theme.spacing.xl};
`;

const ChatMessage = styled.div`
  padding: ${theme.spacing.xs} 0;
  ${props => props.$isSystem && `
    color: ${theme.colors.textSecondary};
    font-style: italic;
  `}
`;

const SystemMessage = styled.span`
  color: ${theme.colors.textSecondary};
`;

const ChatUser = styled.span`
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.primary};
  margin-right: ${theme.spacing.xs};
`;

const ChatText = styled.span`
  color: ${theme.colors.text};
`;

const ChatForm = styled.form`
  display: flex;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ChatInput = styled.input`
  flex: 1;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.text};

  &:focus {
    outline: none;
    border-color: ${theme.colors.primary};
  }
`;

const UsersList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const UserItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radius.md};
`;

const UserAvatar = styled.span`
  font-size: 16px;
`;

const UserName = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
`;

// Room list styles
const RoomListLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.sm};
`;

const RoomListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: ${theme.spacing.md};
`;

const RoomItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${props => props.$selected
    ? 'rgba(99, 102, 241, 0.2)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$selected
    ? theme.colors.primary
    : 'rgba(255, 255, 255, 0.1)'};
  border-radius: ${theme.radius.md};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: ${theme.colors.primary};
  }
`;

const RoomItemTitle = styled.span`
  color: ${theme.colors.text};
  font-weight: ${theme.fontWeights.medium};
`;

const RoomItemMeta = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const CreateRoomSection = styled.div`
  margin-top: ${theme.spacing.lg};
  padding-top: ${theme.spacing.md};
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  h4 {
    font-size: ${theme.fontSizes.md};
    margin-bottom: ${theme.spacing.sm};
    color: ${theme.colors.text};
  }
`;

const ErrorText = styled.div`
  color: ${theme.colors.error || '#ef4444'};
  font-size: ${theme.fontSizes.sm};
  padding: ${theme.spacing.sm};
  background: rgba(239, 68, 68, 0.1);
  border-radius: ${theme.radius.md};
  margin-bottom: ${theme.spacing.md};
`;

export default HotelTestPage;
