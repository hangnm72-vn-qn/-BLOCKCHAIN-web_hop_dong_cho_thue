const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

console.log("🔑 Kiểm tra Token Pinata:", process.env.PINATA_JWT ? "Đã tìm thấy Key!" : "❌ KHÔNG tìm thấy Key!");
const app = express();

// Cơ sở dữ liệu mảng tạm thời dùng để lưu tài khoản giả lập (Khai báo trên đầu)
const usersDb = []; 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Cấu hình upload ảnh/tài liệu tạm thời vào bộ nhớ RAM trước khi đẩy lên IPFS
const upload = multer({ storage: multer.memoryStorage() });

// 2. Import Model Sản phẩm (Thiết bị/Máy chủ) chuẩn
const Product = require('./Product');

// 3. Tự động kết nối Database và bơm dữ liệu Máy Chủ cấu hình mẫu
async function connectDatabase() {
  try {
    console.log("⏳ Đang kết nối tới Cơ sở dữ liệu đám mây MongoDB Atlas...");
    // Thêm option family: 4 để ép Node.js dùng IPv4 kết nối cho ổn định mạng local
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("🎉 Đã kết nối Cơ sở dữ liệu đám mây thành công! (Bao đậu đồ án)");

    // TỰ ĐỘNG BƠM DỮ LIỆU CLOUD SERVER MẪU VÀO DATABASE
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log("🖥️ Chưa có cấu hình máy chủ, tiến hành nạp 3 cụm Cloud Server mẫu...");
      await Product.insertMany([
        {
          title: "Cloud Server Compute Optimized - Gói Basic",
          description: "Cấu hình 4 vCPU, 16GB RAM, 100GB NVMe SSD. Phù hợp cho deploy ứng dụng Web, API Server hiệu năng trung bình.",
          pricePerHour: 0.002,
          depositAmount: 0,   
          ownerAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d83A9b",
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
    console.error("❌ Lỗi kết nối Database MongoDB Atlas:", err);
  }
}
connectDatabase();

// ==========================================
// 🚀 ĐẶT CÁC ROUTE ĐƯỜNG DẪN TĨNH LÊN TRÊN ĐỂ TRÁNH LỖI 404 🚀
// ==========================================

// [API] Lấy danh sách tất cả các gói máy chủ đang cho thuê
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách máy chủ.' });
  }
});

// [API] Cập nhật trạng thái hàng loạt cho nhiều máy chủ cùng lúc (ĐÃ FIX LỖI HOA/THƯỜNG)
app.put('/api/products/bulk-status', upload.none(), async (req, res) => {
  try {
    const { ids, status } = req.body; 
    console.log(`🔄 Đang yêu cầu cập nhật hàng loạt trạng thái sang: "${status}"`);

    if (!status) return res.status(400).json({ success: false, message: 'Thiếu trường status trong body!' });
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng truyền lên một mảng danh sách các _id' });
    }

    // Chuẩn hóa toàn bộ mảng ID về chữ thường để khớp tuyệt đối với DB
    const sanitizedIds = ids.map(id => typeof id === 'string' ? id.toLowerCase() : id);

    const result = await Product.updateMany(
      { _id: { $in: sanitizedIds } }, 
      { $set: { status: status } }
    );

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái thành công cho các máy chủ được chọn!`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Lỗi cập nhật hàng loạt:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống Backend không thể cập nhật hàng loạt.' });
  }
});

// [API] Đăng máy chủ cho thuê + Upload cấu hình/hình ảnh lên IPFS
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { title, description, pricePerHour, depositAmount, ownerAddress, condition } = req.body;
    
    if (!title || !pricePerHour || !ownerAddress) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc (title, pricePerHour, ownerAddress)!' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hình ảnh sơ đồ thiết kế hoặc phần cứng máy chủ!' });
    }

    let imageUrl = "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop"; 

    try {
      console.log(`⏳ Đang tải hình ảnh hạ tầng "${req.file.originalname}" lên IPFS Pinata...`);
      const formData = new FormData();
      formData.append('file', req.file.buffer, { filename: req.file.originalname });

      const cleanToken = process.env.PINATA_JWT ? process.env.PINATA_JWT.trim().replace(/[<>]/g, "") : "";

      const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        maxBodyLength: 'Infinity',
        headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${cleanToken}` }
      });

      if (pinataResponse.data && pinataResponse.data.IpfsHash) {
        imageUrl = `https://gateway.pinata.cloud/ipfs/${pinataResponse.data.IpfsHash}`;
        console.log(`✅ Upload IPFS thành công! Mã CID: ${pinataResponse.data.IpfsHash}`);
      }
    } catch (pinataErr) {
      console.error("⚠️ Cảnh báo: Token Pinata lỗi, kích hoạt chế độ ảnh mockup để cứu API!");
    }

    const newProduct = new Product({
      title,
      description: description || "Không có mô tả thông số kỹ thuật chi tiết.",
      pricePerHour: Number(pricePerHour),
      depositAmount: depositAmount ? Number(depositAmount) : 0, 
      ownerAddress,
      images: [imageUrl],
      status: 'Available',
      condition: condition || "Uptime SLA 99.99% - Băng thông ổn định",
      penaltyTerms: {
        lateFee: "+0.005 ETH / giờ quá hạn thanh toán",
        damageFee: "0 (Hỗ trợ xử lý kỹ thuật miễn phí)",
        lossFee: "Thu hồi tài nguyên máy chủ sau 24h quá hạn"
      }
    });

    await newProduct.save();
    res.status(201).json({ success: true, message: 'Đăng gói dịch vụ máy chủ thành công!', data: newProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi hệ thống Backend không thể đăng gói máy chủ.' });
  }
});

// ==========================================
// 🛠️ ĐẶT CÁC ROUTE CHỨA ĐƯỜNG DẪN ĐỘNG CÓ THAM SỐ (:id) XUỐNG DƯỚI KHU VỰC NÀY 🛠️
// ==========================================

// [API] Lấy chi tiết 1 máy chủ theo ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình máy chủ này!' });
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết máy chủ.' });
  }
});

// [API] BƯỚC 3: TỰ ĐỘNG KHỞI TẠO MÁY CHỦ VÀ CẤP USER/PASS (MỚI)
app.post('/api/products/:id/provision', upload.none(), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy gói máy chủ." });

    const mockIP = `134.209.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`;
    const mockPass = Math.random().toString(36).substring(2, 12); 

    product.status = 'Pending'; // Chờ 10 phút kiểm tra thử nghiệm
    await product.save();

    res.status(200).json({
      success: true,
      message: "Kích hoạt tài nguyên máy chủ thành công! Bắt đầu 10 phút đếm ngược thử nghiệm.",
      credentials: { ip: mockIP, port: "22", username: "root", password: mockPass },
      countdown: "10 minutes"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi khởi tạo tài nguyên máy chủ." });
  }
});

// [API] BƯỚC 6: CƯỠNG CHẾ THU HỒI MÁY VÀ ĐÓNG SỔ GIAO DỊCH (MỚI)
app.post('/api/products/:id/terminate', upload.none(), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy tài nguyên máy chủ." });

    console.log(`🚨 CƯỠNG CHẾ THU HỒI: Xóa môi trường máy ảo, hủy toàn bộ User/Pass của máy ${req.params.id}...`);
    product.status = 'Available'; // Đưa máy về trạng thái trống cho người sau thuê
    await product.save();

    res.status(200).json({ success: true, message: "Đã giải phóng máy ảo về trạng thái trống (Available) thành công!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi hệ thống không thể xử lý thu hồi máy." });
  }
});

// [API] Cập nhật trạng thái thuê đơn lẻ từng máy chủ
app.put('/api/products/:id/status', upload.none(), async (req, res) => {
  try {
    const { status } = req.body; 
    if (!status) return res.status(400).json({ success: false, message: 'Thiếu trường status!' });

    const product = await Product.findByIdAndUpdate(req.params.id, { status: status }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy máy chủ!' });

    res.status(200).json({ success: true, message: `Đã cập nhật trạng thái máy chủ sang: ${product.status}`, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái máy chủ.' });
  }
});

// ==========================================
// 👤 HỆ THỐNG XÁC THỰC GIẢ LẬP TÀI KHOẢN CLOUD
// ==========================================
app.post('/api/auth/register', upload.none(), (req, res) => {
  try {
    const { username, password, walletAddress } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin đăng ký!' });
    
    const newUser = { id: Date.now().toString(), username, password, walletAddress: walletAddress || "" };
    usersDb.push(newUser);
    res.status(201).json({ success: true, message: 'Đăng ký tài khoản mạng lưới thành công!', userId: newUser.id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi hệ thống tại API Register.' });
  }
});

app.post('/api/auth/login', upload.none(), (req, res) => {
  try {
    const { username, password } = req.body;
    const user = usersDb.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ success: false, message: 'Sai thông tin tài khoản Cloud!' });
    
    res.status(200).json({ success: true, message: 'Đăng nhập hệ thống điều khiển thành công!', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi hệ thống đăng nhập.' });
  }
});

app.get('/', (req, res) => {
  res.send("🚀Server Backend của dự án Thuê Máy Chủ Phi Tập Trung (Cloud Server Rental) đang hoạt động mượt mà!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🤖 Hệ thống Backend đang chạy tại: http://localhost:${PORT}`);
});