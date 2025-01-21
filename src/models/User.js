import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true }, 
  username: { type: String }, 
  firstName: { type: String }, 
  walletAddress: { type: String }, 
  }, {
  timestamps: true
});

const User = mongoose.model('User', UserSchema);

export default User;