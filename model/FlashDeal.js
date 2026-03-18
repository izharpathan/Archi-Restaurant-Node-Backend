const mongoose = require("mongoose");

const FlashDealSchema = new mongoose.Schema({
    restaurantId: { 
        type: String, 
        required: true,
        default: "ArchiRestaurant",
        index: true // Faster searching ke liye index add kiya
    },
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", // 👈 Ensure ye wahi naam ho jo AddProduct.js mein model ka hai
        required: [true, "Bhai, product ID dena zaroori hai!"] 
    },
    discountPercentage: { 
        type: Number, 
        required: true,
        min: [1, "Discount 1% se kam nahi ho sakta"],
        max: [99, "Bhai, pura free mein thodi na doge? 99% max hai."]
    },
    endTime: { 
        type: Date, 
        required: true 
    }
}, { timestamps: true });

// Check if model already exists to avoid OverwriteModelError in development
module.exports = mongoose.models.FlashDeal || mongoose.model("FlashDeal", FlashDealSchema);