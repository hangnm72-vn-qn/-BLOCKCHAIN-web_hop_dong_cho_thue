const mongoose = require('mongoose');

// 1. Định nghĩa cấu trúc lưu trữ của một gói dịch vụ Máy chủ
const ProductSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  }, 
  description: { 
    type: String 
  }, 
  pricePerHour: { 
    type: Number, 
    required: true 
  }, 
  depositAmount: { 
    type: Number, 
    required: true,
    default: 0
  }, 
  images: [{ 
    type: String 
  }], 
  ownerAddress: { 
    type: String, 
    required: true 
  }, 
  renterAddress: { 
    type: String, 
    default: "" 
  }, 
  status: { 
    type: String, 
    default: 'Available'
  },
  packageAddress: { 
    type: String, 
    required: true  
  }, 
  condition: {
    type: String,
    default: "Uptime SLA 99.99% - Băng thông 1Gbps không giới hạn - Hỗ trợ kỹ thuật phần cứng 24/7"
  },
  username: { 
    type: String 
  }, 
  password: { 
    type: String 
  },
  
  // 🌟 Thời gian thuê chính thức (lưu bằng giây) phục vụ logic tách luồng thử nghiệm của nhóm 2
  rentalDuration: { 
    type: Number, 
    default: 3600 
  }, 

  penaltyTerms: {
    lateFee: { 
      type: String, 
      default: "+0.005 ETH / giờ quá hạn thanh toán" 
    }, 
    damageFee: { 
      type: String, 
      default: "0 (Hỗ trợ thay thế và bảo trì phần cứng miễn phí)" 
    }, 
    lossFee: { 
      type: String, 
      default: "Hủy kích hoạt môi trường ảo hóa và thu hồi toàn bộ tài nguyên sau 24 giờ quá hạn" 
    } 
  }
}, {
  timestamps: true // Định nghĩa cấu hình hệ thống nằm ở đây là chuẩn xác nhất!
});

// 2. Tạo biến Product từ Schema để các hàm bên dưới gọi trúng đối tượng truy vấn Database
const Product = mongoose.model('Product', ProductSchema);

// 3. Hàm xử lý API Tìm kiếm gói máy chủ
const searchProducts = async (req, res) => {
  try {
    const { keyword } = req.query;
    let query = {};

    if (keyword) {
      query = {
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } }
        ]
      };
    }

    const products = await Product.find(query); 
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Lỗi tìm kiếm", error: error.message });
  }
};

// 4. Gộp chung toàn bộ đối tượng cần xuất bản ra ngoài thành một cụm duy nhất
module.exports = {
  Product,
  searchProducts
};