import api from './api'

export const createProduct = async (title, description, pricePerDay, depositAmount, ownerAddress, imageFile) => {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('pricePerDay', pricePerDay)
    formData.append('depositAmount', depositAmount)
    formData.append('ownerAddress', ownerAddress)
    formData.append('image', imageFile)

    const response = await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
}

export const getAllProducts = async () => {
    const response = await api.get('/products')
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