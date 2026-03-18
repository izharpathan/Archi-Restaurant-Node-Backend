const mongoose = require('mongoose');

const chefSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  image: { type: String, default: '/default-chef.jpg' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chef', chefSchema);