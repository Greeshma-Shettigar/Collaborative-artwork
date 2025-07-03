import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },    // creator name
  roomId: { type: String, required: true, unique: true }, // room ID must be unique
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Room', roomSchema);
