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

// ✅ ĐÃ SỬA HOÀN CHỈNH: Hàm tạo máy chủ kết hợp kiểm tra File và đồng bộ packageAddress
export const createProduct = async (title, description, pricePerDay, ownerAddress, condition, imageFile, packageAddress) => {
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('pricePerHour', pricePerDay); 
        formData.append('ownerAddress', ownerAddress);
        formData.append('condition', condition);
        
        // ĐÃ THÊM: Đóng gói địa chỉ ví contract vừa deploy on-chain gửi lên backend
        formData.append('packageAddress', packageAddress); 

        // 🔥 KIỂM TRA CHÍNH XÁC ĐỐI TƯỢNG FILE TRƯỚC KHI GỬI
        // Nhóm ông thống nhất dùng key là 'image' hay 'images' thì sửa lại ở backend nhé, ở đây tôi giữ 'image' theo cấu trúc form.
        if (imageFile && imageFile instanceof File) {
            console.log("✈️ FormData chuẩn bị gửi file đi:", imageFile.name);
            formData.append('image', imageFile); 
        } else {
            console.error("⚠️ Cảnh báo nguy hiểm: Biến imageFile truyền vào hàm không phải là một đối tượng File hợp lệ!", imageFile);
        }

        // Gọi API sử dụng instance 'api' đồng bộ toàn dự án
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
    const allProducts = await getAllProducts();
    return allProducts.filter(p => p.ownerAddress?.toLowerCase() === ownerAddress?.toLowerCase());
};

// Kiểm tra xem ví này đã từng đăng máy chủ nào chưa
export const checkIsLessor = async (walletAddress) => {
    const allProducts = await getAllProducts();
    return allProducts.some(p => p.ownerAddress?.toLowerCase() === walletAddress.toLowerCase());
};