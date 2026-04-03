let ioInstance = null;

const socketHandler = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
};

const getIo = () => {
  if (!ioInstance) {
    throw new Error('Socket.IO not initialized');
  }
  return ioInstance;
};

module.exports = socketHandler;
module.exports.getIo = getIo;
