const mongoose = require("mongoose");

const SliderSchema = new mongoose.Schema({
  title: { type: String },
  subtitle: { type: String },
  image: { type: String, required: true }, // File name save hoga
  restaurantId: { type: String, default: "ArchiRestaurant" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Slider", SliderSchema);