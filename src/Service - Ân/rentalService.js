import api from './api'

// Lấy danh sách máy chủ mà 1 địa chỉ ví đang thuê
export const getRentedByAddress = async (renterAddress) => {
    const response = await api.get(`/products/rented-by/${renterAddress}`)
    return response.data
}

export const updateRentalStatus = async (productId) => {
    const response = await api.put(`/products/${productId}/status`, {
        status: 'Rented'
    })
    return response.data
}
