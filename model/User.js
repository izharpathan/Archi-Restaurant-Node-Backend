const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: "" },
  address: { type: String, default: "Bhilwara, Rajasthan" },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: true },
}, { timestamps: true }); // Isse 'Member Since' date apne aap ban jayegi

module.exports = mongoose.model("User", userSchema);