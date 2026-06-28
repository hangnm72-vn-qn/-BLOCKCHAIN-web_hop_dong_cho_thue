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

// 🔥 SỬA THÀNH NHẬN 1 OBJECT { ... } ĐỂ KHỚP VỚI DASHBOARD.JSX
export const createProduct = async ({
    title,
    description,
    pricePerHour,
    ownerAddress,
    condition,
    username,
    password,
    images, // Nhận trường images từ Dashboard truyền sang
    packageAddress = ''
}) => {
    try {
        const formData = new FormData();

        formData.append('title', title || '');
        formData.append('description', description || '');
        formData.append('pricePerHour', pricePerHour || '');
        formData.append('depositAmount', 0);
        formData.append('ownerAddress', ownerAddress || '');
        formData.append('condition', condition || '');
        formData.append('username', username || '');
        formData.append('password', password || '');

        // Gán đúng địa chỉ contract gói máy hợp lệ
        if (packageAddress) {
            formData.append('packageAddress', packageAddress);
        }

        // Đính kèm file ảnh (Trường 'images' khớp với uploadCloud.array('images', 5) bên backend)
        if (images) {
            formData.append('images', images);
        }

        const response = await api.post('/products', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    } catch (error) {
        console.error('Lỗi gọi API createProduct:', error);
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
    return allProducts.filter(
        p => p.ownerAddress?.toLowerCase() === ownerAddress?.toLowerCase()
    );
};

// Kiểm tra xem ví này đã từng đăng máy chủ nào chưa
export const checkIsLessor = async (walletAddress) => {
    const allProducts = await getAllProducts();
    return allProducts.some(
        p => p.ownerAddress?.toLowerCase() === walletAddress?.toLowerCase()
    );
};