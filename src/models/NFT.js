import mongoose from 'mongoose';

const NftSchema = new mongoose.Schema({
  address: { type: String, unique: true, required: true },
  name: { type: String, required: true }, 
  }, {
  timestamps: true
});

const NFT = mongoose.model('NFT', NftSchema);

export default NFT;
