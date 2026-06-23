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

// Đăng máy chủ mới (Đã đồng bộ dùng instance api + FormData)
export const createProduct = async (title, description, pricePerHour, ownerAddress, condition, imageFile) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('pricePerHour', pricePerHour);
  formData.append('ownerAddress', ownerAddress);
  formData.append('condition', condition);
  
  // 🌟 Chú ý: Đoạn này hãy để tên trường trùng khớp với backend nhận (ví dụ 'image' hoặc 'imageFile')
  formData.append('image', imageFile); 

  // Dùng trực tiếp instance 'api' để thừa hưởng cấu hình từ file api.js
  const response = await api.post('/products', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', 
    },
  });
  return response.data;
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