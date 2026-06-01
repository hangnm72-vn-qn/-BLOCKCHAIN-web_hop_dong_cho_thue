import api from './api'

export const createProduct = async (name, description, pricePerDay, imageFile) => {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    formData.append('pricePerDay', pricePerDay)
    formData.append('image', imageFile)

    const response = await api.post('/products', formData)
    return response.data
}

export const getAllProducts = async () => {
    const response = await api.get('/products')
    // Nhóm 3 trả về { success: true, data: [...] }
    // nên phải lấy response.data.data
    return response.data.data
}

export const getProductById = async (id) => {
    const response = await api.get(`/products/${id}`)
    return response.data.data
}

export const updateProductStatus = async (id, status) => {
    const response = await api.put(`/products/${id}/status`, { status })
    return response.data
}