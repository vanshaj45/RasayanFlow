import { io } from 'socket.io-client';
import { getToken } from '../utils/auth';

const SOCKET_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: () => ({ token: getToken() })
});

export default socket;
