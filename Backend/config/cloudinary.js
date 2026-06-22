const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Cấu hình cấu hình Cloudinary với các biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Cấu hình Multer kết nối trực tiếp với Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'trustrent_servers', // Tên thư mục sẽ hiển thị trên Cloudinary của ông
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Các định dạng ảnh cho phép
    public_id: (req, file) => 'server_' + Date.now(), // Cách đặt tên file ảnh
  },
});

const uploadCloud = multer({ storage: storage });

module.exports = uploadCloud;