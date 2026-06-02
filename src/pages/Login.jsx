import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../Service - Ân/authService';
import Button from '../components/Button';
import Input from '../components/Input';

function Login() {
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!username || !password) {
            setMessage('Vui lòng nhập đầy đủ thông tin!');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            if (isRegister) {
                // Đăng ký
                const result = await register(username, password, walletAddress);
                if (result.success) {
                    setMessage('Đăng ký thành công! Đang chuyển trang...');
                    setTimeout(() => navigate('/'), 1500);
                }
            } else {
                // Đăng nhập
                const result = await login(username, password);
                if (result.success) {
                    setMessage('Đăng nhập thành công! Đang chuyển trang...');
                    setTimeout(() => navigate('/'), 1500);
                }
            }
        } catch (err) {
            setMessage('Có lỗi xảy ra. Kiểm tra lại thông tin!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md space-y-6">

                {/* Tiêu đề */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white">
                        {isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {isRegister ? 'Tạo tài khoản để bắt đầu thuê đồ' : 'Chào mừng quay lại!'}
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <Input
                        label="Tên đăng nhập"
                        placeholder="Nhập username..."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <Input
                        label="Mật khẩu"
                        type="password"
                        placeholder="Nhập mật khẩu..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {isRegister && (
                        <Input
                            label="Địa chỉ ví (tuỳ chọn)"
                            placeholder="0x..."
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                        />
                    )}
                </div>

                {/* Thông báo lỗi/thành công */}
                {message && (
                    <p className={`text-sm text-center ${message.includes('thành công')
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                        }`}>
                        {message}
                    </p>
                )}

                {/* Nút bấm */}
                <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? 'Đang xử lý...' : (isRegister ? 'Đăng Ký' : 'Đăng Nhập')}
                </Button>

                {/* Chuyển đổi Login/Register */}
                <p className="text-center text-slate-400 text-sm">
                    {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
                    <button
                        className="text-blue-400 ml-1 hover:underline"
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setMessage('');
                        }}
                    >
                        {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
                    </button>
                </p>

            </div>
        </div>
    );
}

export default Login;