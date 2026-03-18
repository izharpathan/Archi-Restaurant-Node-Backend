const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true },
    restaurantId: { type: String, default: "ArchiRestaurant" }
});

module.exports = mongoose.model("Category", categorySchema);