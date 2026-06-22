const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const http = require('http');
const path = require('path'); // Đã thêm thư viện path để xử lý file tĩnh
const { Server } = require('socket.io');
const cron = require('node-cron');
require('dotenv').config();

// Import hàm tìm kiếm và Model từ file Product.js
const { searchProducts, Product } = require('./Product'); 

const app = express();
const server = http.createServer(app);

// Cấu hình CORS cho phép Frontend kết nối HTTP và Socket
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cấu hình thư mục tĩnh công khai để có thể truy cập ảnh qua URL
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const io = new Server(server, {
  cors: { origin: "*" } 
});

// Cơ sở dữ liệu mảng tạm thời dùng để lưu tài khoản giả lập
const usersDb = []; 

// ⭐ ĐÃ SỬA: Cấu hình lưu trữ file của Multer (Chỉ khai báo DUY NHẤT một lần ở đây)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Thư mục lưu file trên server
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Tự động kết nối Database và bơm dữ liệu Máy Chủ cấu hình mẫu
async function connectDatabase() {
  try {
    console.log("⏳ Đang kết nối tới Cơ sở dữ liệu đám mây MongoDB Atlas...");
    const dbURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blockchain_rental';
    
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
          ownerAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8A9b",
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
          ownerAddress: "0x95222290DD7278Aa3Dddd389Cc1E1d165CC4BAfe",
          renterAddress: "",
          images: ["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=600&auto=format&fit=crop"],
          status: "Available",
          condition: "Hệ thống tản nhiệt nước chuyên dụng - Trung tâm dữ liệu Tier 3",
          penaltyTerms: {
            lateFee: "+0.02 ETH / giờ quá hạn thanh toán",
            damageFee: "0 (Chủ server chịu trách nhiệm bảo trì phần cứng)",
            lossFee: "Xóa sạch dữ liệu môi trường ảo hóa sau 48h quá hạn"
          }
        },
        {
          title: "Storage Cluster Decentralized - Gói Backup",
          description: "Dịch vụ lưu trữ dữ liệu lớn phi tập trung, cấu hình 10TB HDD SAS, cấu hình RAID 10 an toàn tuyệt đối.",
          pricePerHour: 0.005,
          depositAmount: 0,
          ownerAddress: "0x32133390DD7278Aa3Dddd389Cc1E1d165CC4BAfe",
          renterAddress: "",
          images: ["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=600&auto=format&fit=crop"],
          status: "Available",
          condition: "Tự động mã hóa đầu cuối - Tốc độ đọc ghi ổn định 500MB/s",
          penaltyTerms: {
            lateFee: "+0.008 ETH / ngày quá hạn thanh toán",
            damageFee: "0 (Cam kết không mất mát dữ liệu)",
            lossFee: "Đóng băng quyền truy cập dữ liệu ngay khi hết hạn hạn hợp đồng"
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

// Lắng nghe kết nối Socket từ Frontend
io.on('connection', (socket) => {
  console.log('⚡ Có thiết bị kết nối Socket thành công: ', socket.id);
});

// ⏱️ CRON JOB: Chạy tự động mỗi phút một lần để quét thời gian thuê máy
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

// ⭐ BỔ SUNG: API GET lấy toàn bộ danh sách máy chủ cho trang chủ
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    // Trả về đúng cấu trúc JSON chứa mảng dữ liệu mà Nhóm 2 cần
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách máy chủ.', error: error.message });
  }
});

// ⭐ ĐÃ BỔ SUNG: Route tìm kiếm gói sản phẩm cho Nhóm 2 bấm chuyển trang
app.get('/api/products/search', searchProducts);

// [API CHUẨN ĐẾM GIỜ] Trả về thời gian đếm ngược thực từ Database cho Dashboard Nhóm 2
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

// ⭐ ĐÃ CẬP NHẬT: Tự động ép ownerAddress về chữ thường để triệt tiêu lỗi Checksum
app.post('/api/products', upload.array('images'), async (req, res) => {
  try {
    const { title, pricePerHour, ownerAddress } = req.body;
    if (!title || !pricePerHour || !ownerAddress) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (title, pricePerHour, ownerAddress)!' });
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      // Nếu có tải ảnh thật lên từ form
      imageUrls = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
    } else {
      // Nếu không up ảnh, tự gán link Unsplash để làm ảnh backup
      imageUrls = ["https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop"];
    }
    
    const newProduct = new Product({
      ...req.body,
      pricePerHour: Number(pricePerHour),
      depositAmount: Number(req.body.depositAmount || 0),
      ownerAddress: ownerAddress.toLowerCase(), // 🎯 ÉP VỀ CHỮ THƯỜNG Ở ĐÂY
      images: imageUrls
    });
    
    await newProduct.save();
    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi đăng máy chủ.', error: error.message });
  }
});

app.put('/api/products/bulk-status', upload.none(), async (req, res) => {
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

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy máy chủ!' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết máy chủ.' });
  }
});

app.post('/api/products/:id/provision', upload.none(), async (req, res) => {
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

app.post('/api/products/:id/terminate', upload.none(), async (req, res) => {
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

app.put('/api/products/:id/status', upload.none(), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy máy chủ!' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái.' });
  }
});

app.post('/api/auth/register', upload.none(), (req, res) => {
  const { username, password, walletAddress } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
  const newUser = { id: Date.now().toString(), username, password, walletAddress: walletAddress || "" };
  usersDb.push(newUser);
  res.status(201).json({ success: true, userId: newUser.id });
});

app.post('/api/auth/login', upload.none(), (req, res) => {
  const user = usersDb.find(u => u.username === req.body.username && u.password === req.body.password);
  if (!user) return res.status(401).json({ success: false, message: 'Sai thông tin!' });
  res.status(200).json({ success: true, user });
});

app.get('/', (req, res) => {
  res.send("🚀 Server Backend Cloud Server Rental đang hoạt động mượt mà!");
});

const PORT = process.env.PORT || 9999;
server.listen(PORT, () => {
  console.log(`🤖 Hệ thống Backend đang chạy tại: http://localhost:${PORT}`);
});