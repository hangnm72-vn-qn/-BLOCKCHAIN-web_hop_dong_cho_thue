import axios from 'axios'

const api = axios.create({
// Thay vì dự phòng về localhost:5000, ta dự phòng thẳng về link Render online luôn!
baseURL: import.meta.env.VITE_API_URL || 'https://blockchain-web-hop-dong-cho-thue.onrender.com/api',});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default api

