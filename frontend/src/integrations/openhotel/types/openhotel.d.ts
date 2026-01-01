/**
 * TypeScript definitions for OpenHotel integration
 *
 * These types are based on OpenHotel's client types with adaptations
 * for our integration layer.
 */

// ============================================
// GEOMETRY TYPES
// ============================================

export interface Point2d {
  x: number;
  y: number;
}

export interface Point3d {
  x: number;
  y: number;
  z: number;
}

export interface Size2d {
  width: number;
  height: number;
}

// ============================================
// DIRECTION TYPES
// ============================================

export enum Direction {
  NORTH = 0,
  NORTH_EAST = 1,
  EAST = 2,
  SOUTH_EAST = 3,
  SOUTH = 4,
  SOUTH_WEST = 5,
  WEST = 6,
  NORTH_WEST = 7,
  NONE = -1,
}

export enum CrossDirection {
  NORTH = "north",
  EAST = "east",
  SOUTH = "south",
  WEST = "west",
}

// ============================================
// ROOM TYPES
// ============================================

export type RoomLayout = string[][];

export interface PrivateRoom {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerUsername: string;
  layout: RoomLayout;
  furniture: RoomFurniture[];
  users: User[];
  maxUsers?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicRoom {
  id: string;
  name: string;
  description?: string;
  layout: RoomLayout;
  furniture: RoomFurniture[];
  users: User[];
  maxUsers?: number;
}

export interface RoomInfo {
  id: string;
  name: string;
  description?: string;
  ownerUsername?: string;
  userCount: number;
  maxUsers: number;
  isPublic: boolean;
}

// ============================================
// USER/AVATAR TYPES
// ============================================

export interface User {
  accountId: string;
  username: string;
  position: Point3d;
  targetPosition?: Point3d | null;
  bodyDirection: Direction;
  headDirection?: Direction;
  skinColor?: number;
  isTyping?: boolean;
  isSitting?: boolean;
  positionUpdatedAt?: number;
}

export interface Account {
  accountId: string;
  username: string;
  badges?: Badge[];
  createdAt?: string;
}

export interface Badge {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

// ============================================
// FURNITURE TYPES
// ============================================

export enum FurnitureType {
  FURNITURE = "furniture",
  FRAME = "frame",
}

export interface RoomFurniture {
  id: string;
  furnitureId: string;
  type: FurnitureType;
  position: Point3d;
  direction: Direction;
  framePosition?: Point2d;
  state?: number;
  blocking?: boolean;
}

export interface FurnitureData {
  id: string;
  label: string;
  description?: string;
  category?: string;
  dimensions?: Size2d;
  sprites?: string[];
  states?: number;
  blocking?: boolean;
}

export interface InventoryItem {
  id: string;
  furnitureId: string;
  quantity: number;
  acquiredAt?: string;
  source?: string;
}

// ============================================
// CHAT TYPES
// ============================================

export type MessageType = "chat" | "shout" | "whisper" | "system" | "action";

export interface RoomMessage {
  id?: string;
  accountId: string;
  username?: string;
  message: string;
  type: MessageType;
  timestamp: number;
  targetAccountId?: string;
}

// ============================================
// EVENT TYPES
// ============================================

export interface WelcomeEvent {
  accountId: string;
  username: string;
}

export interface LoadRoomEvent {
  room: PrivateRoom | PublicRoom;
}

export interface AddHumanEvent {
  user: User;
}

export interface RemoveHumanEvent {
  accountId: string;
}

export interface MoveHumanEvent {
  accountId: string;
  position: Point3d;
  bodyDirection: Direction;
}

export interface AddFurnitureEvent {
  furniture: RoomFurniture;
}

export interface RemoveFurnitureEvent {
  furniture: RoomFurniture | RoomFurniture[];
}

export interface UpdateFurnitureEvent {
  furniture: RoomFurniture;
}

export interface MessageEvent {
  accountId: string;
  message: string;
  type: MessageType;
}

export interface TypingEvent {
  accountId: string;
}

// ============================================
// CONNECTION TYPES
// ============================================

export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

export interface ConnectionOptions {
  url?: string;
  protocols?: string[];
  debug?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectMaxAttempts?: number;
}

// ============================================
// ADAPTER TYPES
// ============================================

export interface AuthCredentials {
  accountId: string;
  username: string;
  metadata?: {
    sourceUserId: number;
    points: number;
    isAdmin: boolean;
    skinColor?: number;
  };
}

export interface CurrencyBalances {
  points: number;
  fatePoints: number;
  rollTickets: number;
  premiumTickets: number;
  hotelCredits: number;
}

export interface Transaction {
  id: string;
  type: string;
  creditCost: number;
  deductions: {
    fatePoints: number;
    points: number;
  };
  timestamp: string;
}

// ============================================
// HOOK RETURN TYPES
// ============================================

export interface UseOpenHotelReturn {
  isEnabled: boolean;
  connectionState: ConnectionState;
  connectionError: string | null;
  isConnected: boolean;
  isConnecting: boolean;

  hotelAccount: Account | null;
  inventory: InventoryItem[];

  currentRoom: PrivateRoom | null;
  roomUsers: User[];
  roomFurniture: RoomFurniture[];
  roomMessages: RoomMessage[];

  connect: () => Promise<boolean>;
  disconnect: () => void;
  joinRoom: (roomId: string) => Promise<PrivateRoom>;
  leaveRoom: () => void;
  sendMessage: (text: string, type?: MessageType) => void;
  moveToTile: (position: Point3d) => void;
  placeFurniture: (furnitureId: string, position: Point3d, direction?: Direction) => void;
  pickupFurniture: (furnitureId: string) => void;
}

export interface UseHotelRoomReturn {
  room: PrivateRoom | null;
  layout: RoomLayout | null;
  dimensions: Size2d;
  bounds: { minX: number; maxX: number; minY: number; maxY: number } | null;

  users: User[];
  furniture: RoomFurniture[];
  myAvatar: User | null;

  tiles: TileData[];
  hoveredTile: Point3d | null;
  selectedFurniture: RoomFurniture | null;

  joinRoom: (roomId: string) => Promise<PrivateRoom>;
  leaveRoom: () => void;
  moveToTile: (position: Point3d) => void;
  placeFurniture: (furnitureId: string, position: Point3d, direction?: Direction) => void;
  pickupFurniture: (furnitureId: string) => void;

  handleTileClick: (position: Point3d) => void;
  handleTileHover: (position: Point3d) => void;
  handleTileLeave: () => void;
  handleFurnitureClick: (furniture: RoomFurniture) => void;

  getScreenPosition: (position: Point3d) => Point2d;
  getIsometricPosition: (screenPos: Point2d, height?: number) => Point3d;
  getZIndex: (position: Point3d, offset?: number) => number;
  isWalkable: (position: Point3d) => boolean;
  getTileHeight: (position: Point3d) => number;
  getFurnitureAt: (position: Point3d) => RoomFurniture[];
  getUsersAt: (position: Point3d) => User[];
  isPositionOccupied: (position: Point3d) => boolean;
}

export interface TileData {
  position: Point3d;
  height: number;
  isSpawn: boolean;
  screenPosition: Point2d;
  zIndex: number;
  isHovered: boolean;
  isOccupied: boolean;
}

export interface UseHotelChatReturn {
  messages: FormattedMessage[];
  inputValue: string;
  isTyping: boolean;
  typingUsers: { accountId: string; username: string }[];
  whisperTarget: string | null;

  sendMessage: (text?: string) => boolean;
  handleInputChange: (value: string) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  setWhisperTarget: (target: string | null) => void;

  commandHelp: Record<string, string>;
}

export interface FormattedMessage extends RoomMessage {
  username: string;
  isOwn: boolean;
  formattedTime: string;
}
