import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true }, 
  userName: { type: String }, 
  firstName: { type: String }, 
  walletAddress: { type: String, default: null }, 
  appWalletName: { type: String, default: null },
  }, {
  timestamps: true
});

const User = mongoose.model('User', UserSchema);

export default User;