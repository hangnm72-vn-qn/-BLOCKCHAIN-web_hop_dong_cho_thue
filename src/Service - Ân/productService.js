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
    formData.append('depositAmount', 0) // Mặc định 0 theo yêu cầu mới
    formData.append('ownerAddress', ownerAddress)
    formData.append('condition', condition)
    formData.append('image', imageFile)

    const response = await api.post('/products', formData)
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