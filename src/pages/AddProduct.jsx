import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../Service - Ân/productService';
import Button from '../components/Button';
import Input from '../components/Input';

function AddProduct() {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [pricePerDay, setPricePerDay] = useState('');
    const [ownerAddress, setOwnerAddress] = useState('');
    const [condition, setCondition] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async () => {
        if (!title || !pricePerDay || !ownerAddress || !imageFile) {
            setMessage('Vui lòng điền đầy đủ thông tin và chọn ảnh!');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const result = await createProduct(
                title,
                description,
                pricePerDay,
                ownerAddress,
                condition,
                imageFile
            );

            if (result.success) {
                setMessage('Đăng máy chủ thành công!');
                setTimeout(() => navigate('/'), 1500);
            }
        } catch (err) {
            console.error(err);
            setMessage('Có lỗi xảy ra. Kiểm tra lại thông tin!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
                <h2 className="text-2xl font-bold text-white text-center">
                    Đăng Gói Máy Chủ Mới
                </h2>

                <Input
                    label="Tên gói máy chủ"
                    placeholder="Ví dụ: Cloud Server GPU Pro"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <Input
                    label="Mô tả cấu hình"
                    placeholder="Ví dụ: 8 vCPU, 32GB RAM, 500GB SSD"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                <Input
                    label="Giá thuê / giờ (Token)"
                    type="number"
                    placeholder="0.005"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                />

                <Input
                    label="Địa chỉ ví của bạn (0x...)"
                    placeholder="0x..."
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                />

                <Input
                    label="Cam kết chất lượng dịch vụ"
                    placeholder="Ví dụ: Uptime SLA 99.99%"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                />

                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Ảnh minh họa
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                        className="text-slate-300 text-sm"
                    />
                </div>

                {message && (
                    <p className={`text-sm text-center ${message.includes('thành công') ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                        {message}
                    </p>
                )}

                <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? 'Đang đăng...' : 'Đăng Máy Chủ'}
                </Button>
            </div>
        </div>
    );
}

export default AddProduct;