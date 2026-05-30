const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config();
console.log("🔑 Kiểm tra Token Pinata:", process.env.PINATA_JWT ? "Đã tìm thấy Key!" : "❌ KHÔNG tìm thấy Key!");
const app = express();

app.use(cors());
app.use(express.json());

// 1. Cấu hình upload ảnh tạm thời vào bộ nhớ RAM trước khi đẩy lên IPFS
const upload = multer({ storage: multer.memoryStorage() });

// 2. Tự động kết nối Database ảo cục bộ (Không sợ lỗi IP/Mạng chặn)
async function connectDatabase() {
  try {
    console.log("⏳ Đang khởi tạo bộ định tuyến Database cục bộ...");
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
    console.log("🎉 Đã kết nối Cơ sở dữ liệu ảo cục bộ thành công! (Bao đậu đồ án)");
  } catch (err) {
    console.error("❌ Lỗi khởi động Database:", err);
  }
}
connectDatabase();

// 3. Import Model Sản phẩm mà bạn đã làm ở Bước 3
const Product = require('./Product');

// 4. API CHÍNH: Đăng sản phẩm + Upload ảnh lên IPFS thông qua Pinata
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, pricePerDay } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn một hình ảnh sản phẩm!' });
    }

    console.log(`⏳ Đang tải hình ảnh "${req.file.originalname}" lên IPFS Pinata...`);

    // Chuẩn bị dữ liệu file gửi lên Pinata
    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: req.file.originalname });

    // Gọi API của Pinata bằng mã JWT của bạn trong file .env
    const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      maxBodyLength: 'Infinity',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      }
    });

    // Lấy mã hash hình ảnh từ IPFS trả về
    const ipfsHash = pinataResponse.data.IpfsHash;
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    console.log(`✅ Upload IPFS thành công! Mã CID: ${ipfsHash}`);

    // Lưu toàn bộ thông tin sản phẩm và link ảnh vào Database ảo
    const newProduct = new Product({
      name,
      description,
      pricePerDay,
      imageUrl
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: 'Đăng sản phẩm lên hệ thống thành công!',
      data: newProduct
    });

  } catch (error) {
    console.error('❌ Lỗi xử lý đăng sản phẩm:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống Backend không thể đăng sản phẩm.' });
  }
});
// ==========================================
// API BỔ SUNG: Xử lý Upload ảnh khi Renter trả đồ (Khớp với Bước 3 của Nhóm 1)
// ==========================================
app.post('/api/rentals/return', upload.single('returnImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Bắt buộc phải chụp ảnh tình trạng đồ khi trả!' });
    }

    console.log(`📸 Đang tải ảnh bằng chứng trả đồ "${req.file.originalname}" lên IPFS...`);

    // 1. Đóng gói file gửi lên Pinata
    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: req.file.originalname });

    const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      maxBodyLength: 'Infinity',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      }
    });

    // 2. Lấy mã Hash (CID) từ IPFS trả về
    const ipfsHash = pinataResponse.data.IpfsHash;
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    
    console.log(`✅ Đã tạo mã Hash IPFS phục vụ Smart Contract: ${ipfsHash}`);

    // 3. Trả kết quả về cho Frontend để gọi hàm returnItem(photoHash) của Nhóm 1
    res.status(200).json({
      success: true,
      message: 'Upload ảnh bằng chứng lên IPFS thành công! Hãy dùng photoHash này để gọi Smart Contract.',
      photoHash: ipfsHash, // Mã này dùng để nạp vào hàm returnItem() trên Blockchain
      imageUrl: imageUrl    // Link này để Admin click vào xem khi có tranh chấp ở Bước 6
    });

  } catch (error) {
    console.error('❌ Lỗi xử lý ảnh trả đồ:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống Backend không thể xử lý ảnh trả đồ.' });
  }
});
// Đường dẫn kiểm tra tình trạng server nhanh
app.get('/', (req, res) => {
  res.send("🚀 Server Backend của dự án Thuê Tài Sản đang hoạt động mượt mà!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🤖 Hệ thống Backend đang chạy tại: http://localhost:${PORT}`);
});