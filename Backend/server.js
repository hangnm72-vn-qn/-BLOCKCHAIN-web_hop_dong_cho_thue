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
// 🗄️ KẾT NỐI DATABASE & SEED DATA MẪU (PHIÊN BẢN ĐÃ ĐỒNG BỘ WEB3)
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
          
          // 🔥 ĐÃ THÊM: Địa chỉ ví contract giả lập cho dữ liệu mẫu để vượt bộ lọc database
          packageAddress: "0x7371c39599880286F6bbc07465A7c8C17ba2D69F",
          
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
          
          // 🔥 ĐÃ THÊM: Địa chỉ ví contract giả lập cho dữ liệu mẫu để vượt bộ lọc database
          packageAddress: "0x8FE5a6d5EA3255BcEABB9c29b7f2C56A58EaA1fc",
          
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

// ⏱️ CRON JOB QUÉT THỜI GIAN THUÊ MÁY (ĐÃ ĐỒNG BỘ TRẠNG THÁI MỚI)
// ==========================================
cron.schedule('* * * * *', async () => {
  console.log('⏳ Cron Job đang quét các hệ thống máy chủ đang hoạt động...');
  try {
    const now = new Date();
    const fifteenMinutesInMs = 15 * 60 * 1000;
    
    // 🔥 SỬA: Tìm các máy đang bị chiếm dụng (Unavailable) thay vì trạng thái cũ
    const activeProducts = await Product.find({ status: 'Unavailable' });

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

// 1. API GET lấy toàn bộ danh sách máy chủ (🔥 ĐÃ SỬA: Ẩn mật khẩu để bảo mật)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({}).select('-password'); // Giấu password
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách máy chủ.', error: error.message });
  }
});

// 2. API POST Đăng máy chủ mới (🔥 ĐÃ SỬA: Nhận thêm username, password, condition từ form)
app.post('/api/products', (req, res, next) => {
  uploadCloud.any()(req, res, function (err) {
    if (err) {
      console.log("⚠️ LỖI UPLOAD CLOUDINARY:", err);
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log("📩 Dữ liệu nhận từ req.body:", req.body);

    // Bốc tách thêm các trường mới theo form thiết kế của Ân
    const { title, pricePerHour, ownerAddress, packageAddress, username, password, condition } = req.body;
    
    if (!title || !pricePerHour || !ownerAddress || !packageAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Thiếu thông tin bắt buộc (title, pricePerHour, ownerAddress, packageAddress)!' 
      });
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        imageUrls.push(file.path);
      });
    } else {
      imageUrls.push("https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop");
    }

    const newProduct = new Product({
      title: title,
      description: req.body.description || "Máy chủ cấu hình cao phục vụ AI và ảo hóa.",
      condition: condition || "Uptime SLA 99.99% - Băng thông 1Gbps không giới hạn",
      pricePerHour: Number(pricePerHour),
      depositAmount: Number(req.body.depositAmount || 0),
      ownerAddress: ownerAddress.trim().toLowerCase(),
      packageAddress: packageAddress.trim(), 
      renterAddress: "",
      status: "Available", // Mặc định luôn là Available khi tạo mới
      images: imageUrls,
      rentalDuration: Number(req.body.rentalDuration || 3600),
      
      // Lưu thông tin tài khoản máy chủ vào DB
      username: username || "root",
      password: password || "Admin@1234"
    });

    await newProduct.save();
    console.log("✅ Đã lưu sản phẩm mới kèm Tài khoản thành công!");
    return res.status(201).json({ success: true, data: newProduct });

  } catch (error) {
    console.error("❌ Lỗi API Đăng máy chủ:", error);
    return res.status(500).json({ success: false, message: 'Lỗi xử lý database.', error: error.message });
  }
});

// 3. API Tìm kiếm gói sản phẩm
app.get('/api/products/search', searchProducts);

// 4. API Lấy thời gian đếm ngược (🔥 ĐÃ SỬA: Tuyệt đối không lưu các status lạ vào DB sản phẩm nữa!)
app.get('/api/session-time/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy thông tin máy chủ" });

    const now = new Date();
    const startTime = new Date(product.updatedAt || now); 
    const secondsElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    const TRIAL_DEFAULT = 600; // Đổi thành 10 phút thử nghiệm theo cam kết mới = 600 giây
    const RENTAL_TOTAL = product.rentalDuration || 3600; 

    let trialTimeLeft = 0;
    let rentalTimeLeft = 0;
    let currentStatus = product.status; // Mặc định lấy từ DB lên (Available / Unavailable)

    if (secondsElapsed < TRIAL_DEFAULT) {
      trialTimeLeft = TRIAL_DEFAULT - secondsElapsed;
      rentalTimeLeft = RENTAL_TOTAL;
    } else {
      trialTimeLeft = 0;
      const rentalTimeUsed = secondsElapsed - TRIAL_DEFAULT;
      rentalTimeLeft = Math.max(0, RENTAL_TOTAL - rentalTimeUsed);
      
      if (rentalTimeLeft > 0) {
        currentStatus = "Unavailable"; // Giao diện tự hiểu là đang chạy hợp đồng chính thức
      } else {
        currentStatus = "Available";   // Tự hiểu là hết hạn
      }
    }

    // Trả về cho UI xử lý hiển thị, DB hoàn toàn sạch bóng các status Rented/Expired
    return res.status(200).json({
      trialTimeLeft: trialTimeLeft,
      rentalTimeLeft: rentalTimeLeft,
      status: currentStatus
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. API Cập nhật hàng loạt trạng thái (🔥 ĐÃ SỬA: Thêm bộ lọc chặn status bẩn)
app.put('/api/products/bulk-status', multer().none(), async (req, res) => {
  try {
    const { ids, status } = req.body; 
    if (status !== 'Available' && status !== 'Unavailable') {
      return res.status(400).json({ success: false, message: 'Chỉ chấp nhận Available hoặc Unavailable!' });
    }
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
      status: 'Unavailable' // Lọc các máy đang được thuê
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

// 8. API Lấy chi tiết 1 máy chủ (🔥 ĐÃ SỬA: Bảo mật ẩn password khi xem công khai)
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('-password'); // Ẩn mật khẩu
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy máy chủ!' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết máy chủ.' });
  }
});

// 9. API Khởi tạo tài nguyên / PROVISION (🔥 ĐÃ SỬA TIÊN QUYẾT: Trả mật khẩu thật + đúng cấu trúc Ân yêu cầu)
app.post('/api/products/:id/provision', multer().none(), async (req, res) => {
  try {
    const { id } = req.params;
    const { renterAddress, durationInSeconds } = req.body; 
    
    // Tìm máy chủ và khóa trạng thái sang Unavailable ngay lập tức
    const product = await Product.findByIdAndUpdate(
      id, 
      { 
        status: 'Unavailable',
        renterAddress: renterAddress || "",
        rentalDuration: Number(durationInSeconds || 3600),
        updatedAt: new Date() // Reset mốc tính giờ đếm ngược
      }, 
      { new: true }
    );

    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy gói máy chủ." });

    // ⏱️ LOGIC CRON/TIMEOUT TỰ ĐỘNG XỬ LÝ 10 PHÚT THEO YÊU CẦU MỤC 7
    setTimeout(async () => {
      try {
        const currentProduct = await Product.findById(id);
        // Sau 10 phút nếu khách không hủy (vẫn là Unavailable), máy chính thức đi vào giai đoạn thuê dài hạn
        if (currentProduct && currentProduct.status === 'Unavailable') {
          console.log(`[Hết 10 phút] Máy ${id} vượt qua giai đoạn thử nghiệm thành công.`);
        }
      } catch (err) {
        console.error("Lỗi đếm ngược thử nghiệm:", err);
      }
    }, 30 * 1000); // 💡 Đang để 30 giây phục vụ DEMO thực tế trên lớp cho nhanh. Lúc nộp bài sửa thành 10 * 60 * 1000.

    // Trả về chính xác cấu trúc Object JSON lồng data mà Ân yêu cầu [Mục 5]
    return res.status(200).json({ 
      success: true, 
      data: {
        username: product.username || "root",
        password: product.password || "Admin@1234", // Trả ra mật khẩu chuẩn trong DB
        ip: `192.168.99.${Math.floor(Math.random() * 254)}`,
        port: "22"
      }
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: "Lỗi khởi tạo tài nguyên máy chủ." });
  }
});

// 10. API Giải phóng máy chủ khi khách bấm hủy ngang (Hủy không thuê / hoàn máy)
app.post('/api/products/:id/terminate', multer().none(), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      { status: 'Available', renterAddress: "" }, 
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy máy chủ." });

    res.status(200).json({ success: true, message: "Đã giải phóng máy ảo về trạng thái Available!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi thu hồi máy." });
  }
});

// 11. API Thay đổi trạng thái thủ công (🔥 ĐÃ SỬA: Chặn nghiêm ngặt các status bẩn ngoại trừ 2 cái đã chốt)
app.put('/api/products/:id/status', multer().none(), async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== 'Available' && status !== 'Unavailable') {
      return res.status(400).json({ success: false, message: 'Chỉ chấp nhận truyền Available hoặc Unavailable!' });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, { status }, { new: true });
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
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy mượt mà tại cổng ${PORT}`);
});