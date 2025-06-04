const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product_id: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const orderHistorySchema = new mongoose.Schema({
  order_id: { type: Number, required: true },
  amount: { type: Number, required: true, min: 0 },
  items: [orderItemSchema],
  timestamp: { type: Date, default: Date.now },
});

const loyaltyPointsSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true, index: true },
  points: { type: Number, default: 0, min: 0 },
  order_history: [orderHistorySchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

loyaltyPointsSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('LoyaltyPoints', loyaltyPointsSchema);