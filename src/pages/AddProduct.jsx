import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../Service - Ân/productService';
import Button from '../components/Button';
import Input from '../components/Input';
// 🌟 ĐÃ THÊM: Import thư viện ethers để tương tác với ví và Contract
import { ethers } from 'ethers';

// 🌟 ĐÃ THÊM: Điền thông tin Contract Factory của nhóm ông vào đây
const FACTORY_ADDRESS = "0xĐịa_Chỉ_Contract_ServerRentalFactory_Của_Nhóm_Ông"; 
const FACTORY_ABI = [
    // Điền ABI của hàm tạo máy chủ trong Factory của ông vào đây. Ví dụ:
    "function createRentalServer(string title, uint256 pricePerHour) public returns (address)"
];

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

        if (!window.ethereum) {
            setMessage('Vui lòng cài đặt ví MetaMask để thực hiện giao dịch Web3!');
            return;
        }

        setLoading(true);
        setMessage('Đang kết nối ví và khởi tạo giao dịch blockchain...');

        try {
            // ========================================================
            // BƯỚC 1: GỌI SMART CONTRACT FACTORY ĐỂ TẠO MÁY CHỦ ON-CHAIN
            // ========================================================
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Tạo instance tương tác với Contract Factory
            const factoryContract = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
            
            setMessage('Vui lòng xác nhận giao dịch tạo máy chủ trên MetaMask...');
            
            // Định định giá trị token gửi lên Contract nếu có (ở đây đổi giá trị theo giờ/ngày tùy contract của ông)
            const parsedPrice = ethers.parseUnits(pricePerDay.toString(), 18); 
            
            // Kích hoạt MetaMask gọi hàm deploy máy chủ con
            const tx = await factoryContract.createRentalServer(title, parsedPrice);
            
            setMessage('Giao dịch đang được xử lý trên Blockchain Sepolia...');
            const receipt = await tx.wait();

            // Lấy địa chỉ contract con (packageAddress) vừa được sinh ra từ Blockchain
            // Lưu ý: Tùy theo cách viết contract, địa chỉ có thể nằm trong logs[0].address hoặc log của Event.
            // Đoạn này lấy đại diện địa chỉ contract vừa tương tác/tạo ra từ biên lai nhận:
            const deployedPackageAddress = receipt.logs[0]?.address || receipt.to;

            if (!deployedPackageAddress) {
                throw new Error("Không lấy được địa chỉ Package Address từ Blockchain!");
            }

            setMessage('Blockchain xác nhận! Đang tiến hành lưu dữ liệu và upload ảnh...');

            // ========================================================
            // BƯỚC 2: GỬI DATA KÈM ĐỊA CHỈ CONTRACT CON LÊN BACKEND MONGODB
            // ========================================================
            // Chỉnh sửa hàm createProduct trong file productService nhận thêm biến deployedPackageAddress
            const result = await createProduct(
                title,
                description,
                pricePerDay,
                ownerAddress,
                condition,
                imageFile,
                deployedPackageAddress // <--- TRUYỀN PHÁT SÚNG QUYẾT ĐỊNH VÀO ĐÂY
            );

            if (result.success) {
                setMessage('Đăng máy chủ và đồng bộ Blockchain thành công!');
                setTimeout(() => navigate('/'), 1500);
            } else {
                setMessage('Lưu database thất bại nhưng contract đã tạo.');
            }
        } catch (err) {
            console.error(err);
            setMessage(err.reason || err.message || 'Có lỗi xảy ra trong quá trình đồng bộ Web3!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
                <h2 className="text-2xl font-bold text-white text-center">
                    Đăng Gói Máy Chủ Mới (Đồng Bộ Web3)
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
                    <p className={`text-sm text-center ${message.includes('thành công') ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {message}
                    </p>
                )}

                <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? 'Đang xử lý...' : 'Đăng Máy Chủ'}
                </Button>
            </div>
        </div>
    );
}

export default AddProduct;