import api from './api'

// Lấy danh sách tất cả máy chủ
export const getAllProducts = async () => {
    const response = await api.get('/products')
    return response.data.data
}

// Lấy chi tiết 1 máy chủ theo ID
export const getProductById = async (id) => {
    const response = await api.get(`/products/${id}`)
    return response.data.data
}

// Đăng gói máy chủ mới
export const createProduct = async (title, description, pricePerHour, ownerAddress, condition, imageFile) => {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('pricePerHour', pricePerHour)
    formData.append('depositAmount', 0)
    formData.append('ownerAddress', ownerAddress)
    formData.append('condition', condition)
    formData.append('images', imageFile) // Đổi từ 'image' thành 'images' theo yêu cầu mới

    const response = await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
}

// Kích hoạt tài nguyên máy sau khi on-chain rentServer thành công
export const provisionProduct = async (productId, renterAddress) => {
    const response = await api.post(`/products/${productId}/provision`, { renterAddress })
    return response.data
}

// Cập nhật trạng thái 1 máy chủ
export const updateProductStatus = async (id, status) => {
    const response = await api.put(`/products/${id}/status`, { status })
    return response.data
}

// Cập nhật trạng thái hàng loạt (nhiều máy chủ cùng lúc)
export const bulkUpdateStatus = async (ids, status) => {
    const response = await api.put('/products/bulk-status', { ids, status })
    return response.data
}
// Thêm hàm này vào cuối file productService.js để vá lỗi export
export const terminateProduct = async (id) => {
    const response = await api.post(`/products/${id}/terminate`)
    return response.data
}
// Tìm kiếm sản phẩm theo từ khóa
export const searchProducts = async (keyword) => {
    const response = await api.get('/products/search', { params: { keyword } })
    return response.data.data
}
// Lấy số giây còn lại của phiên thuê (real-time đếm ngược)
export const getSessionTime = async (productId) => {
    const response = await api.get(`/session-time/${productId}`)
    return response.data
}
// Lấy danh sách máy chủ mà 1 ví đã đăng (dành cho Chủ máy)
export const getProductsByOwner = async (ownerAddress) => {
    const allProducts = await getAllProducts()
    return allProducts.filter(p => p.ownerAddress?.toLowerCase() === ownerAddress?.toLowerCase())
}