require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const nodemailer = require("nodemailer"); // ✅ Nodemailer added

const app = express();
const PORT = process.env.PORT || 5000;

// ================= 1. MIDDLEWARES =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/image", express.static(path.join(__dirname, "public/image")));

if (!fs.existsSync("./public/image")) {
    fs.mkdirSync("./public/image", { recursive: true });
}

// ================= 2. MODELS =================
const User = require("./model/User"); 
const Category = require("./model/Category");
const Product = require("./model/AddProduct"); 
const Blog = require("./model/Blog");

// ✅ NEW: Review Model
const Review = mongoose.models.Review || mongoose.model("Review", new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    userName: String,
    rating: { type: Number, required: true },
    comment: String,
    status: { type: String, default: "Pending" }, // Pending, Approved
    createdAt: { type: Date, default: Date.now }
}));

// ✅ NEW: Contact Inquiry Model
const ContactInquiry = mongoose.models.ContactInquiry || mongoose.model("ContactInquiry", new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
    status: { type: String, default: "Pending" }, 
    createdAt: { type: Date, default: Date.now }
}));

// --- Inline Models ---
const Chef = mongoose.models.Chef || mongoose.model("Chef", new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true },
    image: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}));

const Slider = mongoose.models.Slider || mongoose.model("Slider", new mongoose.Schema({
    title: String, subtitle: String, image: { type: String, required: true },
    restaurantId: { type: String, default: "ArchiRestaurant" },
    createdAt: { type: Date, default: Date.now }
}));

const FlashDeal = mongoose.models.FlashDeal || mongoose.model("FlashDeal", new mongoose.Schema({
    restaurantId: { type: String, required: true, default: "ArchiRestaurant" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    discountPercentage: { type: Number, required: true },
    endTime: { type: Date, required: true }
}, { timestamps: true }));

const Order = mongoose.models.Order || mongoose.model("Order", new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [{ productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, name: String, price: Number, quantity: Number, image: String }],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: "Confirmed" }, 
    address: String,
    contactName: String,
    contactPhone: String,
    paymentMethod: { type: String, default: "COD" }, // ✅ Added Payment Method
    createdAt: { type: Date, default: Date.now }
}));

const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }]
}));

const Booking = mongoose.models.Booking || mongoose.model("Booking", new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: String,
    email: String,
    guests: Number,
    date: { type: String, required: true },
    time: { type: String, required: true },
    tableNumber: { type: Number, required: true },
    status: { type: String, default: "Confirmed" },
    cancelReason: { type: String, default: "" }, 
    createdAt: { type: Date, default: Date.now }
}));

// ✅ PRIVATE EVENT MODEL
const EventBooking = mongoose.models.EventBooking || mongoose.model("EventBooking", new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: String,
    email: String,
    phone: String,
    eventType: String, 
    guests: Number,
    eventDate: String,
    eventTime: String,
    specialRequest: String,
    status: { type: String, default: "Pending" }, 
    createdAt: { type: Date, default: Date.now }
}));

// ✅ NODEMAILER TRANSPORTER SETUP (Fixed with TLS and .env)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    },
    tls: {
        rejectUnauthorized: false // 👈 FIXED: certificate chain error fix
    }
});

// ================= 3. MULTER CONFIG =================
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, "public/image"); },
    filename: (req, file, cb) => { cb(null, Date.now() + "-" + file.originalname); },
});
const upload = multer({ storage });

// ================= 4. ROUTES =================

// ✅ CUSTOMER REVIEW ROUTES
app.post("/api/reviews/add", async (req, res) => {
    try {
        const newReview = new Review(req.body);
        await newReview.save();
        res.status(201).json({ message: "Review sent for approval! ✨" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/reviews/product/:id", async (req, res) => {
    try {
        const reviews = await Review.find({ productId: req.params.id, status: "Approved" }).sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/admin/reviews/all", async (req, res) => {
    try {
        const reviews = await Review.find().populate("productId").sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/admin/reviews/approve/:id", async (req, res) => {
    try {
        await Review.findByIdAndUpdate(req.params.id, { status: "Approved" });
        res.json({ message: "Review Approved!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/admin/reviews/:id", async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ message: "Review Deleted Successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ ADMIN DASHBOARD DYNAMIC STATS ROUTE
app.get("/api/admin/stats", async (req, res) => {
    try {
        const [userCount, productCount, pendingBookings, eventInquiries, totalOrders] = await Promise.all([
            User.countDocuments(),
            Product.countDocuments({ restaurantId: "ArchiRestaurant" }),
            Booking.countDocuments({ status: "Confirmed" }),
            EventBooking.countDocuments(),
            Order.find()
        ]);

        const totalRevenue = totalOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        res.json({
            users: userCount,
            products: productCount,
            bookings: pendingBookings,
            events: eventInquiries,
            revenue: totalRevenue.toLocaleString('en-IN'),
            orderCount: totalOrders.length
        });
    } catch (err) {
        res.status(500).json({ error: "Dashboard stats error!" });
    }
});

// ✅ FORGOT PASSWORD & DIRECT LOGIN LOGIC
const otpStore = new Map(); 

app.post("/api/forgot-password/send-otp", async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Elite membership not found." });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(email, otp);

        const mailOptions = {
            from: `"Archi Luxury Dining" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Archi Security: Your Elite Access Code',
            html: `
                <div style="font-family: 'Marcellus', serif; background-color: #050505; color: #fff; padding: 50px; text-align: center; border: 2px solid #f3cf7a;">
                    <h1 style="color: #f3cf7a; letter-spacing: 5px;">ARCHI</h1>
                    <h3>Access Verification</h3>
                    <p>Namaste,</p>
                    <p>Aapne account access ke liye request ki hai. Niche diya gaya code use karein:</p>
                    <div style="font-size: 32px; letter-spacing: 10px; color: #f3cf7a; margin: 30px 0; border: 1px dashed #f3cf7a; padding: 15px;">
                        <strong>${otp}</strong>
                    </div>
                    <p>Ye code Reset Password aur Direct Login dono ke liye valid hai.</p>
                    <p style="margin-top: 40px; font-size: 12px; color: #f3cf7a;">BEYOND DINING — AN ARCHITECTURAL EXPERIENCE</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        res.json({ message: "OTP Sent Successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/forgot-password/verify-otp-login", async (req, res) => {
    const { email, otp } = req.body;
    if (otpStore.get(email) === otp) {
        otpStore.delete(email);
        const user = await User.findOne({ email }).select("-password");
        res.json({ message: "Login Successful", user });
    } else {
        res.status(400).json({ message: "Invalid OTP code." });
    }
});

app.post("/api/forgot-password/reset-password", async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (otpStore.get(email) === otp) {
            otpStore.delete(email);
            await User.findOneAndUpdate({ email }, { password: newPassword });
            res.json({ message: "Password updated successfully! Please login." });
        } else {
            res.status(400).json({ message: "Invalid OTP code." });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Auth ---
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const newUser = new User({ name, email, phone, password });
        await newUser.save();
        res.status(201).json({ message: "Welcome to Archi!", user: newUser });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.password !== password) return res.status(401).json({ message: "Invalid Credentials" });
        res.json({ user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- User Profile Routes ---
app.get("/api/user/profile/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        res.json(user);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/user/update/:id", async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { name, email, phone, address } },
            { new: true }
        ).select("-password");
        res.json(updatedUser);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Chefs ---
app.post("/api/chefs/add", upload.single("image"), async (req, res) => {
    try {
        const newChef = new Chef({ name: req.body.name, role: req.body.role, image: req.file.filename });
        await newChef.save();
        res.status(201).json(newChef);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/chefs", async (req, res) => {
    const chefs = await Chef.find().sort({ createdAt: -1 });
    res.json(chefs);
});

app.put("/api/chefs/:id", upload.single("image"), async (req, res) => {
    try {
        const { name, role } = req.body;
        let updateData = { name, role };
        if (req.file) {
            updateData.image = req.file.filename;
            const old = await Chef.findById(req.params.id);
            if (old?.image) {
                const p = path.join(__dirname, "public/image", old.image);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
        }
        const updated = await Chef.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/chefs/:id", async (req, res) => {
    try {
        const chef = await Chef.findByIdAndDelete(req.params.id);
        if (chef?.image) {
            const p = path.join(__dirname, "public/image", chef.image);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        res.json({ message: "Chef deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Category ---
app.get("/api/category/:restaurantId", async (req, res) => {
    try {
        const categories = await Category.find({ restaurantId: req.params.restaurantId });
        res.json(categories);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/category/add", upload.single("image"), async (req, res) => {
    try {
        const { name, restaurantId } = req.body;
        if (!name || !req.file) return res.status(400).json({ message: "Name and image required" });
        const newCat = new Category({ name, restaurantId: restaurantId || "ArchiRestaurant", image: req.file.filename });
        await newCat.save();
        res.status(201).json(newCat);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/category/:id", upload.single("image"), async (req, res) => {
    try {
        const { name } = req.body;
        let updateData = { name };
        if (req.file) {
            updateData.image = req.file.filename;
            const oldCat = await Category.findById(req.params.id);
            if (oldCat?.image) {
                const p = path.join(__dirname, "public/image", oldCat.image);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
        }
        const updated = await Category.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/category/:id", async (req, res) => {
    try {
        const cat = await Category.findByIdAndDelete(req.params.id);
        if (cat?.image) {
            const p = path.join(__dirname, "public/image", cat.image);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        res.json({ message: "Category deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Product ---
app.get("/api/product/:restaurantId", async (req, res) => {
    try {
        const products = await Product.find({ restaurantId: req.params.restaurantId });
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/product/add", upload.single("image"), async (req, res) => {
    try {
        const newProduct = new Product({ ...req.body, image: req.file.filename });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/product/update/:id", upload.single("image"), async (req, res) => {
    try {
        const { name, price, description, category, restaurantId } = req.body;
        let updateData = { name, price: Number(price), description, category, restaurantId };
        if (req.file) {
            updateData.image = req.file.filename;
            const oldProduct = await Product.findById(req.params.id);
            if (oldProduct?.image) {
                const oldPath = path.join(__dirname, "public/image", oldProduct.image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
        res.json(updatedProduct);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/product/delete/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (product?.image) {
            const p = path.join(__dirname, "public/image", product.image);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        res.json({ message: "Product Deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Slider ---
app.post("/api/slider/add", upload.single("image"), async (req, res) => {
    try {
        const newSlide = new Slider({ ...req.body, image: req.file.filename });
        await newSlide.save();
        res.status(201).json(newSlide);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/slider/:restaurantId", async (req, res) => {
    const slides = await Slider.find({ restaurantId: req.params.restaurantId });
    res.json(slides);
});

app.put("/api/slider/:id", upload.single("image"), async (req, res) => {
    try {
        const { title, subtitle } = req.body;
        let updateData = { title, subtitle };
        if (req.file) {
            updateData.image = req.file.filename;
            const old = await Slider.findById(req.params.id);
            if (old?.image) {
                const p = path.join(__dirname, "public/image", old.image);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
        }
        const updated = await Slider.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/slider/:id", async (req, res) => {
    try {
        const slide = await Slider.findByIdAndDelete(req.params.id);
        if (slide?.image) {
            const p = path.join(__dirname, "public/image", slide.image);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        res.json({ message: "Slider deleted successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Flash Deal ---
app.get("/api/flash-deal/all/:restaurantId", async (req, res) => {
    try {
        const now = new Date();
        const deals = await FlashDeal.find({ 
            restaurantId: req.params.restaurantId,
            endTime: { $gt: now } 
        }).populate("product");
        res.json(deals);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/flash-deal/update", async (req, res) => {
    try {
        const { restaurantId, productId, discountPercentage, endTime, dealId } = req.body;
        const dealData = {
            restaurantId: restaurantId || "ArchiRestaurant",
            product: new mongoose.Types.ObjectId(productId),
            discountPercentage: Number(discountPercentage),
            endTime: new Date(endTime)
        };

        if (dealId) {
            const updated = await FlashDeal.findByIdAndUpdate(dealId, dealData, { new: true }).populate("product");
            res.json(updated);
        } else {
            const newDeal = new FlashDeal(dealData);
            await newDeal.save();
            const populated = await FlashDeal.findById(newDeal._id).populate("product");
            res.json(populated);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/flash-deal/delete/:id", async (req, res) => {
    try {
        await FlashDeal.findByIdAndDelete(req.params.id);
        res.json({ message: "Flash Deal Stopped Successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Blog ---
app.post("/api/blog/add", upload.single("image"), async (req, res) => {
    try {
        const newBlog = new Blog({ title: req.body.title, content: req.body.content, image: req.file.filename });
        await newBlog.save();
        res.status(201).json({ message: "Blog Added" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/blogs", async (req, res) => {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
});

app.put("/api/blog/update/:id", upload.single("image"), async (req, res) => {
    try {
        let updateData = { title: req.body.title, content: req.body.content };
        if (req.file) {
            updateData.image = req.file.filename;
            const old = await Blog.findById(req.params.id);
            if (old?.image) fs.unlinkSync(`./public/image/${old.image}`);
        }
        const updated = await Blog.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/blog/delete/:id", async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (blog?.image) fs.unlinkSync(`./public/image/${blog.image}`);
        res.json({ message: "Blog Deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ✅ UPDATED ORDER ROUTE WITH AUTO-EMAIL ---
app.post("/api/order/add", async (req, res) => {
    try {
        const { userId, items, totalAmount, address, contactName, contactPhone, paymentMethod } = req.body;
        
        // 1. Database mein order save karo
        const newOrder = new Order({
            userId, items, totalAmount, address, contactName, contactPhone, paymentMethod
        });
        await newOrder.save();

        // 2. User ko Email bhejo (Luxury Template)
        const user = await User.findById(userId);
        if (user && user.email) {
            try {
                const itemsHtml = items.map(item => `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #222;">${item.name} x ${item.quantity}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #222; text-align: right;">₹${item.price * item.quantity}</td>
                    </tr>
                `).join('');

                const mailOptions = {
                    from: `"Archi Luxury Dining" <${process.env.EMAIL_USER}>`,
                    to: user.email,
                    subject: '🍽️ Order Confirmed: Your Feast is Being Prepared!',
                    html: `
                        <div style="font-family: 'Marcellus', serif; background-color: #050505; color: #fff; padding: 40px; border: 2px solid #f3cf7a;">
                            <h1 style="color: #f3cf7a; text-align: center; letter-spacing: 5px;">ARCHI</h1>
                            <h3 style="text-align: center; text-transform: uppercase; border-bottom: 1px solid #f3cf7a; padding-bottom: 10px;">Order Confirmation</h3>
                            <p>Namaste ${contactName},</p>
                            <p>Humne aapka order receive kar liya hai. Hamare chefs ne aapki architectural selection taiyaar karni shuru kar di hai.</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; color: #ccc;">
                                <thead>
                                    <tr style="color: #f3cf7a;">
                                        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #f3cf7a;">DELICACY</th>
                                        <th style="text-align: right; padding: 10px; border-bottom: 2px solid #f3cf7a;">PRICE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>

                            <div style="text-align: right; color: #f3cf7a; font-size: 20px; margin-top: 20px;">
                                <strong>TOTAL: ₹${totalAmount}</strong>
                            </div>

                            <div style="margin-top: 30px; padding: 15px; background: rgba(243, 207, 122, 0.05); border: 1px dashed #f3cf7a;">
                                <p style="margin: 0; font-size: 12px; color: #f3cf7a;">DELIVERY HUB:</p>
                                <p style="margin: 5px 0 0 0; color: #fff;">${address}</p>
                                <p style="margin: 5px 0 0 0; color: #888; font-size: 11px;">Payment: ${paymentMethod}</p>
                            </div>

                            <p style="text-align: center; margin-top: 40px; font-size: 11px; color: #666; letter-spacing: 2px;">BEYOND DINING — AN ARCHITECTURAL EXPERIENCE</p>
                        </div>
                    `
                };
                await transporter.sendMail(mailOptions);
                console.log("✅ Order Email Sent to:", user.email);
            } catch (emailErr) {
                console.error("⚠️ Order Email Error:", emailErr.message);
            }
        }

        res.status(201).json({ message: "Order Placed Successfully", order: newOrder });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.get("/api/orders/user/:userId", async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/orders/status/:id", async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(updatedOrder);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TABLE BOOKING ROUTES (Now with Auto-Email) ---
app.post("/api/booking/add", async (req, res) => {
    try {
        const { name, email, tableNumber, guests, date, time } = req.body;
        const newBooking = new Booking(req.body);
        await newBooking.save();

        try {
            const mailOptions = {
                from: `"Archi Luxury Dining" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: '🍽️ Reserved: Your Table at Archi',
                html: `
                    <div style="font-family: 'Marcellus', serif; background-color: #050505; color: #fff; padding: 50px; text-align: center; border: 2px solid #f3cf7a;">
                        <h1 style="color: #f3cf7a; letter-spacing: 5px;">ARCHI</h1>
                        <h3 style="text-transform: uppercase;">Table Reservation Confirmed</h3>
                        <p style="font-size: 18px;">Namaste ${name},</p>
                        <p>Humne aapki table successfully reserve kar li hai. Archi mein aapka swagat hai.</p>
                        <div style="background: rgba(243, 207, 122, 0.1); padding: 20px; border: 1px solid #f3cf7a; margin: 30px auto; width: 80%;">
                            <p><strong>Table Number:</strong> #${tableNumber}</p>
                            <p><strong>Guests:</strong> ${guests} Persons</p>
                            <p><strong>Date:</strong> ${date}</p>
                            <p><strong>Time:</strong> ${time}</p>
                        </div>
                        <p>Note: Ye reservation 3 ghante ke liye valid hai.</p>
                        <p style="margin-top: 40px; font-size: 12px; color: #f3cf7a;">BEYOND DINING — AN ARCHITECTURAL EXPERIENCE</p>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
            console.log("✅ Booking Email Sent to:", email);
        } catch (emailErr) { console.error("⚠️ Booking Mail Fail:", emailErr.message); }

        res.status(201).json({ message: "Table Reserved! ✨", booking: newBooking });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/booking/all", async (req, res) => {
    try {
        const bookings = await Booking.find({ status: "Confirmed" }).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/booking/admin/all", async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/booking/cancel/:id", async (req, res) => {
    try {
        const { reason } = req.body;
        const updatedBooking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status: "Cancelled", cancelReason: reason || "No reason provided" },
            { new: true }
        );
        res.json({ message: "Booking Cancelled Successfully", updatedBooking });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ PRIVATE EVENT ROUTES (Modified with Nodemailer + .env credentials)
app.post("/api/events/book", async (req, res) => {
    try {
        const { email, userName, eventType, eventDate, guests } = req.body;
        
        // 1. Save to Database First (Critical)
        const newEvent = new EventBooking(req.body);
        await newEvent.save();

        // 2. Separate Email Block (If email fails, API doesn't crash)
        try {
            const mailOptions = {
                from: `"Archi Luxury Dining" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: '🥂 Confirmation: Your Elite Celebration at Archi',
                html: `
                    <div style="font-family: 'Marcellus', serif; background-color: #050505; color: #fff; padding: 50px; text-align: center; border: 2px solid #f3cf7a;">
                        <h1 style="color: #f3cf7a; letter-spacing: 5px;">ARCHI</h1>
                        <h3 style="text-transform: uppercase;">Celebration Inquiry Received</h3>
                        <p style="font-size: 18px;">Namaste ${userName},</p>
                        <p>Humne aapki <strong>${eventType}</strong> ki inquiry receive kar li hai.</p>
                        <div style="background: rgba(243, 207, 122, 0.1); padding: 20px; border: 1px solid #f3cf7a; margin: 30px auto; width: 80%;">
                            <p><strong>Event Date:</strong> ${eventDate}</p>
                            <p><strong>Guests:</strong> ${guests}</p>
                        </div>
                        <p>Hamara Elite Concierge team jald hi aapse contact karegi details finalize karne ke liye.</p>
                        <p style="margin-top: 40px; font-size: 12px; color: #f3cf7a;">BEYOND DINING — AN ARCHITECTURAL EXPERIENCE</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log("✅ Confirmation Email Dispatched successfully.");
        } catch (emailErr) {
            console.error("⚠️ Email Error (Booking still saved):", emailErr.message);
        }

        res.status(201).json({ message: "Inquiry Sent Successfully!", event: newEvent });
    } catch (err) { 
        console.error("🔥 Server Error:", err.message);
        res.status(500).json({ error: "Something went wrong on the server." }); 
    }
});

app.get("/api/events/all", async (req, res) => {
    try {
        const events = await EventBooking.find().sort({ createdAt: -1 });
        res.json(events);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ Admin Status Update Route with Auto-Email Notification
app.put("/api/events/status/:id", async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await EventBooking.findByIdAndUpdate(req.params.id, { status }, { new: true });

        // 📧 Send Email to User when Status is changed by Admin
        try {
            const mailOptions = {
                from: `"Archi Luxury Dining" <${process.env.EMAIL_USER}>`,
                to: updated.email,
                subject: status === "Confirmed" ? '✨ Archi: Your Celebration is Confirmed!' : 'Update: Your Inquiry at Archi',
                html: `
                    <div style="font-family: 'Marcellus', serif; background-color: #050505; color: #fff; padding: 50px; text-align: center; border: 2px solid #f3cf7a;">
                        <h1 style="color: #f3cf7a; letter-spacing: 5px;">ARCHI</h1>
                        <div style="margin: 20px 0;">
                            <h2 style="text-transform: uppercase; color: ${status === 'Confirmed' ? '#28a745' : '#dc3545'}">Event Status: ${status}</h2>
                        </div>
                        <p style="font-size: 16px;">Namaste ${updated.userName},</p>
                        <p>${status === "Confirmed" 
                            ? "Humne aapki enquiry finalize kar di hai! Hamara manager aapse jald hi call par contact karegi details finalize karne ke liye." 
                            : "Hume khed hai ki hum abhi aapka event schedule nahi kar pa rahe hain. Dusri date ke liye humein contact karein."}
                        </p>
                        <div style="background: rgba(243, 207, 122, 0.1); padding: 15px; border: 1px solid #f3cf7a; margin: 20px auto; width: 70%;">
                            <p><strong>Event Type:</strong> ${updated.eventType}</p>
                            <p><strong>Proposed Date:</strong> ${updated.eventDate}</p>
                        </div>
                        <p style="margin-top: 40px; font-size: 12px; color: #f3cf7a;">Luxury is in each detail. — Archi</p>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
            console.log(`✅ Status update email sent to: ${updated.email}`);
        } catch (emailErr) {
            console.error("⚠️ Status email failed but DB updated:", emailErr.message);
        }

        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Wishlist ---
app.post("/api/wishlist/toggle", async (req, res) => {
    const { userId, productId } = req.body;
    try {
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [productId] });
        } else {
            const index = wishlist.products.indexOf(productId);
            if (index === -1) wishlist.products.push(productId);
            else wishlist.products.splice(index, 1);
        }
        await wishlist.save();
        res.json({ message: "Wishlist Updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/wishlist/:userId", async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userId: req.params.userId }).populate("products");
        res.json(wishlist ? wishlist.products : []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ CONTACT FORM API (Enhanced with DB Saving)
app.post("/api/contact/send", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: "Bhai, saari details bharna zaroori hai!" });
        }

        // 1. Save to Database for Admin Panel
        const newInquiry = new ContactInquiry({ name, email, subject, message });
        await newInquiry.save();

        // 📧 Email to Admin (Tujhe message milega)
        const adminMailOptions = {
            from: `"Archi Website" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `📩 New Contact Inquiry: ${subject}`,
            html: `
                <div style="font-family: 'Montserrat', sans-serif; background: #0a0a0a; color: #fff; padding: 40px; border: 1px solid #f3cf7a;">
                    <h2 style="color: #f3cf7a; border-bottom: 1px solid #333; padding-bottom: 10px;">New Message from Archi Website</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <div style="background: #111; padding: 20px; border-radius: 5px; margin-top: 20px;">
                        <p style="color: #ccc;"><strong>Message:</strong></p>
                        <p>${message}</p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(adminMailOptions);

        // 📧 Confirmation Email to User
        const userMailOptions = {
            from: `"Archi Luxury Dining" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Namaste! We received your message.',
            html: `<p>Bhai ${name}, humein aapka message mil gaya hai. Hamari team jald hi aapse contact karegi. Dhanyawad!</p>`
        };
        await transporter.sendMail(userMailOptions);

        res.json({ message: "Message sent and saved successfully!" });
    } catch (err) {
        console.error("Contact API Error:", err.message);
        res.status(500).json({ error: "Message nahi gaya bhai, server check karo." });
    }
});

// ✅ GET ALL INQUIRIES FOR ADMIN
app.get("/api/admin/inquiries", async (req, res) => {
    try {
        const inquiries = await ContactInquiry.find().sort({ createdAt: -1 });
        res.json(inquiries);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ UPDATE INQUIRY STATUS
app.put("/api/admin/inquiries/status/:id", async (req, res) => {
    try {
        const updated = await ContactInquiry.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ DELETE INQUIRY ROUTE
app.delete("/api/admin/inquiries/:id", async (req, res) => {
    try {
        await ContactInquiry.findByIdAndDelete(req.params.id);
        res.json({ message: "Inquiry Deleted Successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ================= 5. DB START =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB Connected 📦");
    // ✅ Verify email server login
    transporter.verify((error, success) => {
        if (error) console.log("❌ Email Server Login Failed:", error.message);
        else console.log("🚀 Email Server is Ready!");
    });
    app.listen(PORT, () => console.log(`Archi Server Running: http://localhost:${PORT} ✅`));
  })
  .catch(err => console.error("DB Connection Error ❌", err));