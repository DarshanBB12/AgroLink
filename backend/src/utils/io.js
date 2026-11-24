// Holds the Socket.IO instance so controllers can push realtime events without circular imports.
let ioInstance = null;
module.exports = {
  setIO: (io) => {
    ioInstance = io;
  },
  getIO: () => ioInstance,
};
