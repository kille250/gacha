/**
 * OpenHotel Integration
 *
 * This module provides the integration layer between your gacha game
 * and OpenHotel's social room system.
 *
 * USAGE:
 *
 * 1. Add OpenHotelProvider to your app:
 *
 *    import { OpenHotelProvider } from './integrations/openhotel';
 *
 *    function App() {
 *      return (
 *        <AuthProvider>
 *          <OpenHotelProvider>
 *            <YourApp />
 *          </OpenHotelProvider>
 *        </AuthProvider>
 *      );
 *    }
 *
 * 2. Use the hooks in your components:
 *
 *    import { useOpenHotel, useHotelRoom, useHotelChat } from './integrations/openhotel';
 *
 *    function MyRoomPage() {
 *      const { connect, joinRoom, isConnected } = useOpenHotel();
 *      const { tiles, myAvatar, handleTileClick } = useHotelRoom();
 *      const { messages, sendMessage } = useHotelChat();
 *
 *      // Render room with tiles, avatars, etc.
 *    }
 *
 * 3. Configure via environment variables:
 *
 *    VITE_OPENHOTEL_ENABLED=true
 *    VITE_OPENHOTEL_URL=ws://localhost:3005
 *    VITE_OPENHOTEL_HTTP_URL=http://localhost:3005
 *
 * LICENSE NOTE:
 * OpenHotel is licensed under CC BY-NC-SA 4.0 (non-commercial use only).
 * Ensure your usage complies with this license.
 */

// Main provider
export { OpenHotelProvider, useOpenHotel, useOpenHotelEnabled, CONNECTION_STATE } from './OpenHotelProvider';

// Hooks
export { useHotelRoom, getScreenPosition, getIsometricPosition, getZIndex } from './hooks/useHotelRoom';
export { useHotelChat, MESSAGE_TYPE } from './hooks/useHotelChat';

// Adapters
export { OpenHotelWebSocket, getOpenHotelSocket, resetOpenHotelSocket } from './adapters/websocketAdapter';
export { AuthAdapter, getAuthAdapter, resetAuthAdapter } from './adapters/authAdapter';
export { CurrencyAdapter, getCurrencyAdapter, resetCurrencyAdapter, CURRENCY_TYPE } from './adapters/currencyAdapter';
export { AvatarAdapter, getAvatarAdapter, BODY_ACTION, ARM_ACTION, SKIN_PRESETS } from './adapters/avatarAdapter';

// Configuration
export { OPENHOTEL_CONFIG, TILE_CONSTANTS, ROOM_POINT, DIRECTION, OH_EVENT } from './config';
