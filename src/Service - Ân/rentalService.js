import api from './api'

export const returnItem = async (returnImageFile) => {
    const formData = new FormData()
    formData.append('returnImage', returnImageFile)

    const response = await api.post('/rentals/return', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.photoHash
}

export const updateRentalStatus = async (productId) => {
    const response = await api.put(`/products/${productId}/status`, {
        status: 'Rented'
    })
    return response.data
}