import api from './api'

export const returnItem = async (returnImageFile) => {
    const formData = new FormData()
    formData.append('returnImage', returnImageFile)

    const response = await api.post('/rentals/return', formData)
    return response.data.photoHash
}