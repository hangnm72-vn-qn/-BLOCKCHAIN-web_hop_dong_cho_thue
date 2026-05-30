const mongoose = require('mongoose');

// Định nghĩa cấu trúc lưu trữ của một sản phẩm cho thuê
const ProductSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  }, // Tên món đồ (Ví dụ: Váy dạ hội sequin, Máy ảnh Sony Alpha A7)
  
  description: { 
    type: String 
  }, // Mô tả chi tiết về tình trạng, kích cỡ, màu sắc món đồ
  
  pricePerDay: { 
    type: Number, 
    required: true 
  }, // Giá thuê tính theo ngày
  
  depositAmount: { 
    type: Number, 
    required: true 
  }, // Số tiền đặt cọc bắt buộc (để khóa trong Smart Contract)
  
  images: [{ 
    type: String 
  }], // Mảng chứa các đường link ảnh sau khi up lên IPFS Pinata
  
  ownerAddress: { 
    type: String, 
    required: true 
  }, // Địa chỉ ví MetaMask (0x...) của người đăng cho thuê
  
  status: { 
    type: String, 
    default: 'Available' 
  } // Trạng thái món đồ: 'Available' (Sẵn sàng cho thuê) hoặc 'Rented' (Đang được thuê)
}, {
  timestamps: true // Tự động lưu thêm mốc thời gian tạo và cập nhật món đồ
});

module.exports = mongoose.model('Product', ProductSchema);