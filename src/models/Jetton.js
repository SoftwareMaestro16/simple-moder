import mongoose from 'mongoose';

const JettonSchema = new mongoose.Schema({
  address: { type: String, unique: true, required: true },
  name: { type: String, required: true }, 
  symbol: { type: String, required: true }, 
  decimals: { type: Number, required: true }, 
  }, {
    timestamps: true
});

const Jetton = mongoose.model('Jetton', JettonSchema);

export default Jetton;