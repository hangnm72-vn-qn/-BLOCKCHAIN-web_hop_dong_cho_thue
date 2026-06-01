import api from './api'

export const register = async (username, password, walletAddress) => {
    const response = await api.post('/auth/register', { username, password, walletAddress })
    return response.data
}

export const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password })
    // Nhóm 3 không dùng JWT token, chỉ trả về user
    if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    return response.data
}

export const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
}