import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
  jettonListingPrice: { type: String, default: 10 },
  nftListingPrice: { type: String, default: 10 },
  coreChannel: { 
    id: { type: String, default: 0 }, 
    link: { type: String, default: null } 
  },
  coreChat: { 
    id: { type: String, default: 0 }, 
    link: { type: String, default: null } 
  },
  adminsList: { type: Array, default: [1196918969, 545921, -1002442392045, -1002429972793, -1002230648515, -1002039676046]},
  listingManager: { type: String, default: 'https://t.me/Little_Pugg' },
  }, {
  timestamps: true
});

const Admin = mongoose.model('Admin', AdminSchema);

export default Admin;