import axios from 'axios'

const api = axios.create({
// Tự động lấy link online nếu có, nếu không có thì tự quay về cổng 5000 local
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', 
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default api

