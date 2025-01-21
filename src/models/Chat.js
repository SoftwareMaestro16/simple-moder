import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
  chatId: { type: String, unique: true, required: true }, 
  name: { type: String, required: true }, // chat name
  type: { type: String, required: true }, // type of chat (public или private)
  inviteLink: { type: String, required: true }, 
  jetton: {
    jettonAddress: { type: String }, 
    jettonRequirement: { type: Number }, 
  },
  nft: {
    collectionAddress: { type: String }, 
    nftRequirement: { type: Number }, 
  },
  comboCheck: { type: Boolean, default: false }, // flag combo check
  adminId: { type: String, required: true }, 
  members: { type: [String], default: [] }, // for private
 }, {
    timestamps: true
});

const Chat = mongoose.model('Chat', ChatSchema);

export default Chat;