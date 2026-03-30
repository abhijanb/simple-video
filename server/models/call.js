import mongoose from 'mongoose';

const CallSchema = new mongoose.Schema({
  user1SocketId: String,
  user2SocketId: String,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
});

export default mongoose.model('Call', CallSchema);