const mongoose = require('mongoose');

// Định nghĩa cấu trúc lưu trữ của một gói dịch vụ Máy chủ (Đã chuẩn hóa theo giao diện Nhóm 2 và Luồng Nhóm 1)
const ProductSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  }, // Tên gói dịch vụ / cấu hình máy chủ (Ví dụ: Cloud Server Compute Optimized - Gói Basic)
  
  description: { 
    type: String 
  }, // Mô tả chi tiết về thông số kỹ thuật hệ thống (Ví dụ: 4 vCPU, 16GB RAM, 100GB NVMe SSD, OS Ubuntu 22.04)
  
  pricePerHour: { 
    type: Number, 
    required: true 
  }, // ĐÃ SỬA: Giá thuê tính theo GIỜ (Tính bằng ETH/Token để khớp với luồng chọn giờ thuê của Nhóm 1)
  
  depositAmount: { 
    type: Number, 
    required: true,
    default: 0
  }, // Số tiền đặt cọc (Mặc định bằng 0 vì nghiệp vụ thuê hạ tầng tự động không cần cọc tiền)
  
  images: [{ 
    type: String 
  }], // Mảng chứa các đường link ảnh sơ đồ kiến trúc hệ thống / phòng máy sau khi up lên IPFS Pinata
  
  ownerAddress: { 
    type: String, 
    required: true 
  }, // Địa chỉ ví MetaMask (0x...) của nhà cung cấp hạ tầng phần cứng máy chủ (Provider)
  
  status: { 
    type: String, 
    default: 'Available' 
  }, // ĐÃ CẬP NHẬT GHI CHÚ: Trạng thái gồm 'Available' (Sẵn sàng), 'Pending' (10p thử nghiệm), 'Active' (Đang chạy chính thức)

  // ⭐ Cam kết chất lượng dịch vụ (Hiển thị dòng chữ màu xanh lá trên giao diện người dùng)
  condition: {
    type: String,
    default: "Uptime SLA 99.99% - Băng thông 1Gbps không giới hạn - Hỗ trợ kỹ thuật phần cứng 24/7"
  },

  // ⭐ Các điều khoản xử lý vi phạm hợp đồng (Hiển thị khung viền đỏ cảnh báo trên giao diện)
  penaltyTerms: {
    lateFee: { 
      type: String, 
      default: "+0.005 ETH / giờ quá hạn thanh toán" 
    }, // Phạt quá hạn khi hết thời gian thuê mà không gia hạn hợp đồng
    damageFee: { 
      type: String, 
      default: "0 (Hỗ trợ thay thế và bảo trì phần cứng miễn phí)" 
    }, // Chính sách khi xảy ra lỗi hao mòn vật lý linh kiện tại phòng máy của nhà cung cấp
    lossFee: { 
      type: String, 
      default: "Hủy kích hoạt môi trường ảo hóa và thu hồi toàn bộ tài nguyên sau 24 giờ quá hạn" 
    } // Biện pháp xử lý tối cao khi bên thuê vi phạm điều khoản sử dụng hạ tầng
  }
}, {
  timestamps: true // Tự động lưu thêm mốc thời gian tạo và cập nhật cấu hình máy chủ
});

module.exports = mongoose.model('Product', ProductSchema);