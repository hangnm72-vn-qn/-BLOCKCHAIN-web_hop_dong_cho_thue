const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cron = require('node-cron');
require('dotenv').config();

// ==========================================
// 📦 IMPORT MODELS & CONFIGS (Đưa hết lên đầu)
// ==========================================
const { searchProducts, Product } = require('./Product'); 
const uploadCloud = require('./config/cloudinary'); // Đảm bảo ông đã tạo file này theo hướng dẫn trước

const app = express();
const server = http.createServer(app);

// Cấu hình CORS và Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình thư mục tĩnh dự phòng cho Local
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const io = new Server(server, {
  cors: { origin: "*" } 
});

const usersDb = []; 

// ==========================================
// 🗄️ KẾT NỐI DATABASE & SEED DATA MẪU
// ==========================================
async function connectDatabase() {
  try {
    console.log("⏳ Đang kết nối tới Cơ sở dữ liệu đám mây MongoDB Atlas...");
    const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blockchain_rental';
    
    await mongoose.connect(dbURI, {
      serverSelectionTimeoutMS: 10000, 
    });
    
    console.log("✅ Kết nối MongoDB Atlas thành công!");
    
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log("🖥️ Chưa có cấu hình máy chủ, tiến hành nạp dữ liệu mẫu...");
      await Product.insertMany([
        {
          title: "Cloud Server Compute Optimized - Gói Basic",
          description: "Cấu hình 4 vCPU, 16GB RAM, 100GB NVMe SSD. Phù hợp cho deploy ứng dụng Web, API Server hiệu năng trung bình.",
          pricePerHour: 0.002,
          depositAmount: 0,   
          ownerAddress: "0x71c7656ec7ab88b098defb751b7401b5f6d8a9b",
          renterAddress: "",
          images: ["https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop"],
          status: "Available",
          condition: "Uptime SLA 99.99% - Băng thông 1Gbps không giới hạn", 
          penaltyTerms: {
            lateFee: "+0.005 ETH / giờ quá hạn thanh toán",
            damageFee: "0 (Hỗ trợ kỹ thuật phần cứng miễn phí)",
            lossFee: "Hủy kích hoạt và thu hồi tài nguyên sau 24h quá hạn"
          }
        },
        {
          title: "Dedicated Server GPU High-Performance - Gói Pro AI",
          description: "Cấu hình chuyên dụng cho AI Training & Graphics: 2x NVIDIA RTX 4090, 64GB RAM, 1TB NVMe SSD Enterprise.",
          pricePerHour: 0.015,
          depositAmount: 0,
          ownerAddress: "0x95222290dd7278aa3dddd389cc1e1d165cc4bafe",
          renterAddress: "",
          images: ["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=600&auto=format&fit=crop"],
          status: "Available",
          condition: "Hệ thống tản nhiệt nước chuyên dụng - Trung tâm dữ liệu Tier 3",
          penaltyTerms: {
            lateFee: "+0.02 ETH / giờ quá hạn thanh toán",
            damageFee: "0 (Chủ server chịu trách nhiệm bảo trì phần cứng)",
            lossFee: "Xóa sạch dữ liệu môi trường ảo hóa sau 48h quá hạn"
          }
        }
      ]);
      console.log("✅ Đã nạp dữ liệu danh mục máy chủ mẫu thành công!");
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối Database MongoDB Atlas:", err.message);
  }
}
connectDatabase();

// Socket.io
io.on('connection', (socket) => {
  console.log('⚡ Có thiết bị kết nối Socket thành công: ', socket.id);
});

// ⏱️ CRON JOB quét thời gian thuê máy
cron.schedule('* * * * *', async () => {
  console.log('⏳ Cron Job đang quét các hệ thống máy chủ đang hoạt động...');
  try {
    const now = new Date();
    const fifteenMinutesInMs = 15 * 60 * 1000;
    const activeProducts = await Product.find({ status: { $in: ['Pending', 'Rented'] } });

    activeProducts.forEach(product => {
      if (product.updatedAt) {
        const startTime = new Date(product.updatedAt);
        const durationInMs = 1 * 60 * 60 * 1000; 
        const endTime = startTime.getTime() + durationInMs;
        const timeLeft = endTime - now.getTime();

        if (timeLeft > 0 && timeLeft <= fifteenMinutesInMs && timeLeft > (14 * 60 * 1000)) {
          io.emit(`warning-${product.renterAddress}`, {
            message: `Máy chủ "${product.title}" của bạn chỉ còn lại 15 phút thuê! Vui lòng gia hạn thêm giao dịch.`,
            timeLeftInMinutes: 15,
            productId: product._id
          });
          console.log(`🚨 Đã bắn cảnh báo socket cho ví: ${product.renterAddress}`);
        }
      }
    });
  } catch (error) {
    console.error("❌ Lỗi trong tiến trình chạy Cron Job:", error.message);
  }
});

// ==========================================
// 🚀 KHU VỰC CÁC ROUTE ĐƯỜNG DẪN API 🚀
// ==========================================

// 1. API GET lấy toàn bộ danh sách máy chủ
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách máy chủ.', error: error.message });
  }
});

// 2. API POST Đăng máy chủ mới - ĐÃ TÍCH HỢP CLOUDINARY HOÀN CHỈNH & SỬA LỖI CHECKSUM
app.post('/api/products', uploadCloud.single('image'), async (req, res) => {
  try {
    const { title, pricePerHour, ownerAddress } = req.body;
    
    if (!title || !pricePerHour || !ownerAddress) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (title, pricePerHour, ownerAddress)!' });
    }

    let imageUrls = [];
    if (req.file) {
      // Nếu có tải file ảnh lên thành công, lấy link online HTTPS từ Cloudinary
      imageUrls.push(req.file.path);
    } else {
      // Nếu không upload ảnh, tự gán link Unsplash dự phòng để tránh vỡ giao diện
      imageUrls.push("https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop");
    }

    const newProduct = new Product({
      ...req.body,
      pricePerHour: Number(pricePerHour),
      depositAmount: Number(req.body.depositAmount || 0),
      ownerAddress: ownerAddress.toLowerCase(), // Triệt tiêu lỗi Checksum ví 1 và ví 2
      images: imageUrls // Đồng bộ lưu dạng mảng giống data mẫu của Frontend nhóm 2
    });

    await newProduct.save();
    return res.status(201).json({ success: true, data: newProduct });

  } catch (error) {
    console.error("❌ Lỗi API Đăng máy chủ:", error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đăng máy chủ.', error: error.message });
  }
});

// 3. API Tìm kiếm gói sản phẩm
app.get('/api/products/search', searchProducts);

// 4. API Lấy thời gian đếm ngược
app.get('/api/session-time/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy thông tin máy chủ" });

    const now = new Date();
    const startTime = new Date(product.updatedAt || now);
    const durationInMs = 1 * 60 * 60 * 1000; 
    const endTime = startTime.getTime() + durationInMs;
    const timeLeftInMs = endTime - now.getTime();

    const timeLeftInSeconds = timeLeftInMs > 0 ? Math.floor(timeLeftInMs / 1000) : 0;

    return res.status(200).json({
      success: true,
      productId: product._id,
      timeLeft: timeLeftInSeconds,
      status: timeLeftInSeconds > 0 ? product.status : "Expired"
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. API Cập nhật hàng loạt trạng thái
app.put('/api/products/bulk-status', multer().none(), async (req, res) => {
  try {
    const { ids, status } = req.body; 
    if (!status) return res.status(400).json({ success: false, message: 'Thiếu trường status!' });
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng truyền một mảng ids' });
    }

    const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
    const result = await Product.updateMany({ _id: { $in: objectIds } }, { $set: { status: status } });

    res.status(200).json({ success: true, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật hàng loạt.' });
  }
});

// 6. API Lấy danh sách máy đã thuê theo Renter
app.get('/api/products/rented-by/:renterAddress', async (req, res) => {
  try {
    const { renterAddress } = req.params;
    const myRentals = await Product.find({
      renterAddress: { $regex: new RegExp(`^${renterAddress}$`, "i") },
      status: { $ne: 'Available' }
    });

    const formattedData = myRentals.map(product => {
      return {
        ...product.toObject(),
        ipAddress: `134.209.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`
      };
    });
    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách máy thuê.' });
  }
});

// 7. API Lấy danh sách máy sở hữu theo Owner
app.get('/api/products/owned-by/:ownerAddress', async (req, res) => {
  try {
    const { ownerAddress } = req.params;
    const myAssets = await Product.find({ ownerAddress: { $regex: new RegExp(`^${ownerAddress}$`, "i") } });
    const assetsWithComplaints = myAssets.map(asset => {
      return {
        ...asset.toObject(),
        complaints: asset.status !== 'Available' ? [{ issueId: "ERR_" + asset._id.toString().substring(18), content: "Lỗi kết nối cổng SSH." }] : []
      };
    });
    res.status(200).json({ success: true, data: assetsWithComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách máy sở hữu.' });
  }
});

// 8. API Lấy chi tiết 1 máy chủ
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy máy chủ!' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết máy chủ.' });
  }
});

// 9. API Khởi tạo tài nguyên máy chủ khi được thuê
app.post('/api/products/:id/provision', multer().none(), async (req, res) => {
  try {
    const { id } = req.params;
    const { renterAddress } = req.body;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy gói máy chủ." });

    product.status = 'Pending';
    if (renterAddress) product.renterAddress = renterAddress;
    await product.save();

    return res.status(200).json({ success: true, message: "Khởi tạo thành công!", ipAddress: `192.168.99.${Math.floor(Math.random() * 254)}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi khởi tạo tài nguyên máy chủ." });
  }
});

// 10. API Giải phóng máy chủ sau khi hết hạn
app.post('/api/products/:id/terminate', multer().none(), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy máy chủ." });

    product.status = 'Available'; 
    product.renterAddress = "";   
    await product.save();
    res.status(200).json({ success: true, message: "Đã giải phóng máy ảo về trạng thái Available!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi thu hồi máy." });
  }
});

// 11. API Thay đổi trạng thái thủ công
app.put('/api/products/:id/status', multer().none(), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy máy chủ!' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái.' });
  }
});

// 12. API Giả lập Auth (Đăng ký / Đăng nhập)
app.post('/api/auth/register', multer().none(), (req, res) => {
  const { username, password, walletAddress } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
  const newUser = { id: Date.now().toString(), username, password, walletAddress: walletAddress || "" };
  usersDb.push(newUser);
  res.status(201).json({ success: true, userId: newUser.id });
});

app.post('/api/auth/login', multer().none(), (req, res) => {
  const user = usersDb.find(u => u.username === req.body.username && u.password === req.body.password);
  if (!user) return res.status(401).json({ success: false, message: 'Sai thông tin!' });
  res.status(200).json({ success: true, user });
});

// API Mặc định kiểm tra Server
app.get('/', (req, res) => {
  res.send("🚀 Server Backend Cloud Server Rental đang hoạt động mượt mà ổn định!");
});

// Khởi chạy Server
const PORT = process.env.PORT || 9999;
server.listen(PORT, () => {
  console.log(`🤖 Hệ thống Backend đang chạy tại: http://localhost:${PORT}`);
});