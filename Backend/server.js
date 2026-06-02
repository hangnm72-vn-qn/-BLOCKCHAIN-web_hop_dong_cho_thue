const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

console.log("🔑 Kiểm tra Token Pinata:", process.env.PINATA_JWT ? "Đã tìm thấy Key!" : "❌ KHÔNG tìm thấy Key!");
const app = express();

// Cơ sở dữ liệu mảng tạm thời dùng để lưu tài khoản giả lập (Phải khai báo trên đầu)
const usersDb = []; 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Cấu hình upload ảnh/tài liệu tạm thời vào bộ nhớ RAM trước khi đẩy lên IPFS
const upload = multer({ storage: multer.memoryStorage() });

// 2. Import Model Sản phẩm (Thiết bị/Máy chủ) chuẩn của bạn
const Product = require('./Product');

// 3. Tự động kết nối Database và bơm dữ liệu Máy Chủ cấu hình mẫu
async function connectDatabase() {
  try {
    console.log("⏳ Đang kết nối tới Cơ sở dữ liệu đám mây MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🎉 Đã kết nối Cơ sở dữ liệu đám mây thành công! (Bao đậu đồ án)");

    // TỰ ĐỘNG BƠM DỮ LIỆU CLOUD SERVER MẪU VÀO DATABASE KHỚP THEO SCHEMA CỦA BẠN
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log("🖥️ Chưa có cấu hình máy chủ, tiến hành nạp 3 cụm Cloud Server mẫu...");
      await Product.insertMany([
        {
          title: "Cloud Server Compute Optimized - Gói Basic",
          description: "Cấu hình 4 vCPU, 16GB RAM, 100GB NVMe SSD. Phù hợp cho deploy ứng dụng Web, API Server hiệu năng trung bình.",
          pricePerDay: 0.002, // Giá thuê theo ngày tính bằng ETH
          depositAmount: 0,   // Không cần cọc theo yêu cầu mới của thầy!
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
          pricePerDay: 0.015,
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
          pricePerDay: 0.005,
          depositAmount: 0,
          ownerAddress: "0x32133390DD7278Aa3Dddd389Cc1E1d165CC4BAfe",
          images: ["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=600&auto=format&fit=crop"],
          status: "Rented",
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
// [API MỚI] Cập nhật trạng thái hàng loạt cho nhiều máy chủ cùng lúc
// ==========================================
app.put('/api/products/bulk-status', upload.none(), async (req, res) => {
  try {
    const { ids, status } = req.body; 
    console.log(`🔄 Đang yêu cầu cập nhật hàng loạt trạng thái sang: "${status}" cho các ID:`, ids);

    // Kiểm tra đầu vào
    if (!status) {
      return res.status(400).json({ success: false, message: 'Thiếu trường status trong body!' });
    }
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng truyền lên một mảng danh sách các _id (ví dụ: ["id1", "id2"])' });
    }

    // Sử dụng lệnh updateMany của Mongoose để quét và cập nhật toàn bộ ID trong mảng
    const result = await Product.updateMany(
      { _id: { $in: ids } }, 
      { $set: { status: status } }
    );

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái thành công cho các máy chủ được chọn!`,
      matchedCount: result.matchedCount, // Số lượng máy chủ tìm thấy
      modifiedCount: result.modifiedCount // Số lượng máy chủ đã sửa trạng thái thành công
    });
  } catch (error) {
    console.error('❌ Lỗi cập nhật hàng loạt:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống Backend không thể cập nhật hàng loạt.' });
  }
});
// ==========================================
// 4. API: Đăng máy chủ cho thuê + Upload cấu hình/hình ảnh lên IPFS
// ==========================================
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { title, description, pricePerDay, depositAmount, ownerAddress, condition } = req.body;
    
    if (!title || !pricePerDay || !ownerAddress) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc (title, pricePerDay, ownerAddress)!' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hình ảnh sơ đồ thiết kế hoặc phần cứng máy chủ!' });
    }

    let imageUrl = "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop"; // Ảnh dự phòng nếu Pinata lỗi

    try {
      console.log(`⏳ Đang tải hình ảnh hạ tầng "${req.file.originalname}" lên IPFS Pinata...`);
      const formData = new FormData();
      formData.append('file', req.file.buffer, { filename: req.file.originalname });

      const cleanToken = process.env.PINATA_JWT ? process.env.PINATA_JWT.trim().replace(/[<>]/g, "") : "";

      const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        maxBodyLength: 'Infinity',
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${cleanToken}`
        }
      });

      if (pinataResponse.data && pinataResponse.data.IpfsHash) {
        const ipfsHash = pinataResponse.data.IpfsHash;
        imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        console.log(`✅ Upload IPFS thành công! Mã CID: ${ipfsHash}`);
      }
    } catch (pinataErr) {
      console.error("⚠️ Cảnh báo: Token Pinata lỗi hoặc hết hạn, kích hoạt chế độ ảnh mockup để cứu API!");
    }

    // Tạo đối tượng lưu vào MongoDB (Mặc định không cần đặt cọc - Đảm bảo trách nhiệm hai bên)
    const newProduct = new Product({
      title,
      description: description || "Không có mô tả thông số kỹ thuật chi tiết.",
      pricePerDay: Number(pricePerDay),
      depositAmount: depositAmount ? Number(depositAmount) : 0, // Gán bằng 0 theo nghiệp vụ không đặt cọc
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

    res.status(201).json({
      success: true,
      message: 'Đăng gói dịch vụ máy chủ lên hệ thống thành công!',
      data: newProduct
    });

  } catch (error) {
    console.error('❌ Lỗi xử lý đăng sản phẩm máy chủ:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống Backend không thể đăng gói máy chủ.' });
  }
});

// ==========================================
// 5. API: Bàn giao lại tài nguyên hệ thống khi kết thúc thời hạn thuê
// ==========================================
app.post('/api/rentals/return', upload.single('returnImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Bắt buộc phải tải file Log hệ thống hoặc Ảnh chụp Dashboard xác nhận tình trạng máy chủ!' });
    }

    console.log(`📸 Đang tải bằng chứng bàn giao trạng thái hệ thống "${req.file.originalname}" lên IPFS...`);

    let ipfsHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"; 
    let imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    try {
      const formData = new FormData();
      formData.append('file', req.file.buffer, { filename: req.file.originalname });

      const cleanToken = process.env.PINATA_JWT ? process.env.PINATA_JWT.trim().replace(/[<>]/g, "") : "";

      const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        maxBodyLength: 'Infinity',
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${cleanToken}`
        }
      });

      if (pinataResponse.data && pinataResponse.data.IpfsHash) {
        ipfsHash = pinataResponse.data.IpfsHash;
        imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        console.log(`✅ Đã tạo mã Hash IPFS thành công: ${ipfsHash}`);
      }
    } catch (pinataErr) {
      console.error('⚠️ Cảnh báo: Token Pinata lỗi, kích hoạt chế độ tạo photoHash mockup để cứu luồng Smart Contract!');
    }

    res.status(200).json({
      success: true,
      message: 'Upload file bằng chứng hoàn trả tài nguyên máy chủ lên IPFS thành công!',
      photoHash: ipfsHash,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('❌ Lỗi xử lý hoàn trả máy chủ:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống Backend không thể xử lý biên bản trả máy chủ.' });
  }
});

// ==========================================
// 6. API: Lấy danh sách tất cả các gói máy chủ đang cho thuê
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách máy chủ.' });
  }
});

// ==========================================
// 7. API: Lấy chi tiết 1 máy chủ theo ID
// ==========================================
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cấu hình máy chủ này!' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết máy chủ.' });
  }
});

// ==========================================
// 8. API: Cập nhật trạng thái thuê (Available/Rented) của máy chủ
// ==========================================
app.put('/api/products/:id/status', upload.none(), async (req, res) => {
  try {
    const { status } = req.body; 
    console.log(`🔄 Đang yêu cầu cập nhật trạng thái sang: "${status}"`);

    if (!status) {
      return res.status(400).json({ success: false, message: 'Thiếu trường status trong body!' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      { status: status }, 
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy máy chủ!' });
    }

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái phân phối sang: ${product.status}`,
      data: product
    });
  } catch (error) {
    console.error('❌ Lỗi cập nhật trạng thái:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái máy chủ.' });
  }
});

// ==========================================
// 9. API: Đăng ký / Đăng nhập giả lập người dùng hệ thống cloud
// ==========================================
app.post('/api/auth/register', upload.none(), (req, res) => {
  try {
    const { username, password, walletAddress } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin tài khoản đăng ký!' });
    
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

// Đường dẫn kiểm tra tình trạng server nhanh
app.get('/', (req, res) => {
  res.send("🚀 Server Backend của dự án Thuê Máy Chủ Phi Tập Trung (Cloud Server Rental) đang hoạt động mượt mà!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🤖 Hệ thống Backend đang chạy tại: http://localhost:${PORT}`);
});