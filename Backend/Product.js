const mongoose = require('mongoose');

// Định nghĩa cấu trúc lưu trữ của một sản phẩm cho thuê (Đã chuẩn hóa theo giao diện Nhóm 2)
const ProductSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  }, // Tên món đồ
  description: { 
    type: String 
  }, // Mô tả chi tiết về tình trạng, kích cỡ, màu sắc món đồ
  
  pricePerDay: { 
    type: Number, 
    required: true 
  }, // Giá thuê tính theo ngày (Tính bằng ETH để khớp Blockchain/Frontend)
  
  depositAmount: { 
    type: Number, 
    required: true 
  }, // Số tiền đặt cọc bắt buộc (Tính bằng ETH)
  
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
  }, // Trạng thái món đồ: 'Available' hoặc 'Rented'

  // ⭐ BỔ SUNG 1: Tình trạng bàn giao thực tế (Để hiện dòng chữ màu xanh lá trên giao diện)
  condition: {
    type: String,
    default: "Mới 98% - Không sờn vải - Khóa kéo trơn tru"
  },

  // ⭐ BỔ SUNG 2: Các điều khoản phạt đền (Để hiện cái khung viền đỏ trên giao diện)
  penaltyTerms: {
    lateFee: { 
      type: String, 
      default: "+0.002 ETH / ngày" 
    }, // Trả đồ trễ hạn
    damageFee: { 
      type: String, 
      default: "Khấu trừ 50% tiền cọc" 
    }, // Rách / Thủng váy (Mức nhẹ)
    lossFee: { 
      type: String, 
      default: "Tịch thu 100% tiền cọc" 
    } // Mất đồ / Hư hỏng hoàn toàn
  }
}, {
  timestamps: true // Tự động lưu thêm mốc thời gian tạo và cập nhật món đồ
});

module.exports = mongoose.model('Product', ProductSchema);