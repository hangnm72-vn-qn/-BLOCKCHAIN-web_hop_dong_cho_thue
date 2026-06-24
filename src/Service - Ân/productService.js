import api from './api';

// Lấy danh sách tất cả máy chủ
export const getAllProducts = async () => {
    const response = await api.get('/products');
    return response.data.data;
};

// Lấy chi tiết 1 máy chủ theo ID
export const getProductById = async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data.data;
};

// Nhận đầy đủ 6 tham số truyền sang từ Dashboard.jsx
export const createProduct = async (title, pricePerHour, ownerAddress, imageFile, description, condition) => {
  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('pricePerHour', pricePerHour);
    formData.append('ownerAddress', ownerAddress);
    formData.append('description', description || "Máy chủ cấu hình cao phục vụ AI và ảo hóa.");
    formData.append('condition', condition || "Uptime SLA 99.99% - Băng thông 1Gbps không giới hạn");
    formData.append('depositAmount', 0); 

    // 🔥 KIỂM TRA CHÍNH XÁC ĐỐI TƯỢNG FILE TRƯỚC KHI GỬI
    if (imageFile && imageFile instanceof File) {
      console.log("✈️ FormData chuẩn bị gửi file đi:", imageFile.name);
      formData.append('images', imageFile); 
    } else {
      console.error("⚠️ Cảnh báo nguy hiểm: Biến imageFile truyền vào hàm không phải là một đối tượng File hợp lệ!", imageFile);
    }

    // Xem log trong tab Network xem FormData có 'images' chưa
    const response = await api.post('/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error("Lỗi gọi API createProduct:", error);
    throw error;
  }
};

// Kích hoạt tài nguyên máy sau khi on-chain rentServer thành công
export const provisionProduct = async (productId, renterAddress) => {
    const response = await api.post(`/products/${productId}/provision`, { renterAddress });
    return response.data;
};

// Cập nhật trạng thái 1 máy chủ
export const updateProductStatus = async (id, status) => {
    const response = await api.put(`/products/${id}/status`, { status });
    return response.data;
};

// Cập nhật trạng thái hàng loạt (nhiều máy chủ cùng lúc)
export const bulkUpdateStatus = async (ids, status) => {
    const response = await api.put('/products/bulk-status', { ids, status });
    return response.data;
};

// Chấm dứt phiên thuê máy chủ
export const terminateProduct = async (id) => {
    const response = await api.post(`/products/${id}/terminate`);
    return response.data;
};

// Tìm kiếm sản phẩm theo từ khóa
export const searchProducts = async (keyword) => {
    const response = await api.get('/products/search', { params: { keyword } });
    return response.data.data;
};

// Lấy số giây còn lại của phiên thuê (real-time đếm ngược)
export const getSessionTime = async (productId) => {
    const response = await api.get(`/session-time/${productId}`);
    return response.data;
};

// Lấy danh sách máy chủ mà 1 ví đã đăng (dành cho Chủ máy)
export const getProductsByOwner = async (ownerAddress) => {
    const allProducts = await getAllProducts()
    return allProducts.filter(p => p.ownerAddress?.toLowerCase() === ownerAddress?.toLowerCase())
}
// Kiểm tra xem ví này đã từng đăng máy chủ nào chưa
export const checkIsLessor = async (walletAddress) => {
    const allProducts = await getAllProducts();
    return allProducts.some(p => p.ownerAddress?.toLowerCase() === walletAddress.toLowerCase());
};