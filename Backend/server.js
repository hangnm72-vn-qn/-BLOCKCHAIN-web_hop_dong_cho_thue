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

// 2. Import Model Sản phẩm chuẩn của bạn
const Product = require('./Product');

// 3. Tự động kết nối Database ảo cục bộ + Tự động bơm dữ liệu đầm thiết kế mẫu đúng Schema
async function connectDatabase() {
  try {
    console.log("⏳ Đang khởi tạo bộ định tuyến Database cục bộ...");
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
    console.log("🎉 Đã kết nối Cơ sở dữ liệu ảo cục bộ thành công! (Bao đậu đồ án)");

    // TỰ ĐỘNG BƠM DỮ LIỆU ĐẦM THIẾT KẾ MẪU VÀO DATABASE KHỚP THEO SCHEMA CỦA BẠN
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log("👗 Chưa có sản phẩm, tiến hành nạp 3 bộ váy thiết kế mẫu...");
      await Product.insertMany([
        {
          title: "Đầm Dạ Hội Maroon Quý Phái",
          description: "Váy thiết kế dáng dài, xẻ tà, chất liệu lụa cao cấp co giãn nhẹ. Thích hợp cho tiệc tối, sự kiện sang trọng. Size: S/M.",
          pricePerDay: 450000,
          depositAmount: 1000000,
          ownerAddress: "0x95222290DD7278Aa3Dddd389Cc1E1d165CC4BAfe",
          images: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600&auto=format&fit=crop"], // Đưa vào mảng array chuẩn
          status: "Available" // Viết hoa chữ A theo schema
        },
        {
          title: "Váy Cưới Trắng Trễ Vai Pure White",
          description: "Đầm cưới dòng Luxury, đính đá thủ công phần ngực, tùng váy xòe phồng công chúa. Size: M (có dây điều chỉnh sau lưng).",
          pricePerDay: 1200000,
          depositAmount: 3000000,
          ownerAddress: "0x95222290DD7278Aa3Dddd389Cc1E1d165CC4BAfe",
          images: ["https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=600&auto=format&fit=crop"],
          status: "Available"
        },
        {
          title: "Set Vest Nam Trọng Nhậm - Black Classic",
          description: "Bao gồm áo vest, quần tây và ghim cài áo. Form dáng Slim-fit hiện đại, chất liệu vải không nhăn. Size: L.",
          pricePerDay: 350000,
          depositAmount: 800000,
          ownerAddress: "0x32133390DD7278Aa3Dddd389Cc1E1d165CC4BAfe",
          images: ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=600&auto=format&fit=crop"],
          status: "Rented" // Viết hoa chữ R theo schema
        }
      ]);
      console.log("✅ Đã nạp dữ liệu đầm thiết kế thành công!");
    }
  } catch (err) {
    console.error("❌ Lỗi khởi động Database:", err);
  }
}
connectDatabase();

// ==========================================
// 4. API: Đăng sản phẩm + Upload ảnh lên IPFS
// ==========================================
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    // Nhận thêm depositAmount và ownerAddress từ phía Nhóm 2 gửi lên
    const { title, description, pricePerDay, depositAmount, ownerAddress } = req.body;
    
    if (!title || !pricePerDay || !depositAmount || !ownerAddress) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc (title, pricePerDay, depositAmount, ownerAddress)!' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn một hình ảnh sản phẩm!' });
    }

    console.log(`⏳ Đang tải hình ảnh "${req.file.originalname}" lên IPFS Pinata...`);

    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: req.file.originalname });

    const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      maxBodyLength: 'Infinity',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      }
    });

    const ipfsHash = pinataResponse.data.IpfsHash;
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    console.log(`✅ Upload IPFS thành công! Mã CID: ${ipfsHash}`);

    // Tạo đối tượng khớp 100% với ProductSchema của bạn
    const newProduct = new Product({
      title,
      description,
      pricePerDay,
      depositAmount,
      ownerAddress,
      images: [imageUrl], // Đẩy link ảnh vào mảng mảng mảng
      status: 'Available'
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
// 5. API: Xử lý Upload ảnh khi Renter trả đồ
// ==========================================
app.post('/api/rentals/return', upload.single('returnImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Bắt buộc phải chụp ảnh tình trạng đồ khi trả!' });
    }

    console.log(`📸 Đang tải ảnh bằng chứng trả đồ "${req.file.originalname}" lên IPFS...`);

    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: req.file.originalname });

    const pinataResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      maxBodyLength: 'Infinity',
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      }
    });

    const ipfsHash = pinataResponse.data.IpfsHash;
    const imageUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    
    console.log(`✅ Đã tạo mã Hash IPFS phục vụ Smart Contract: ${ipfsHash}`);

    res.status(200).json({
      success: true,
      message: 'Upload ảnh bằng chứng lên IPFS thành công! Hãy dùng photoHash này để gọi Smart Contract.',
      photoHash: ipfsHash,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('❌ Lỗi xử lý ảnh trả đồ:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống Backend không thể xử lý ảnh trả đồ.' });
  }
});

// ==========================================
// 6. API: Lấy danh sách tất cả sản phẩm
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
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách sản phẩm.' });
  }
});

// ==========================================
// 7. API: Lấy chi tiết 1 sản phẩm theo ID
// ==========================================
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm này!' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết sản phẩm.' });
  }
});

// ==========================================
// 8. API: Cập nhật trạng thái thuê 
// ==========================================
app.put('/api/products/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // Nhận 'Available' hoặc 'Rented'
    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      { status: status || 'Rented' }, 
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm!' });
    }

    res.status(200).json({
      success: true,
      message: `Đã cập nhật trạng thái sản phẩm sang: ${product.status}`,
      data: product
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật trạng thái sản phẩm.' });
  }
});

// ==========================================
// 9. API: Đăng ký / Đăng nhập giả lập
// ==========================================
const usersDb = []; 
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, walletAddress } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
    
    const newUser = { id: Date.now().toString(), username, password, walletAddress: walletAddress || "" };
    usersDb.push(newUser);
    res.status(201).json({ success: true, message: 'Đăng ký thành công!', userId: newUser.id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const user = usersDb.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu!' });
    
    res.status(200).json({ success: true, message: 'Đăng nhập thành công!', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
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