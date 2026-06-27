import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { getAllProducts, searchProducts } from '../Service - Ân/productService';

function Home({ walletAddress }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Lấy địa chỉ ví hiện tại để so sánh quyền sở hữu máy chủ
  const currentWallet = (walletAddress || localStorage.getItem('trustrent.walletAddress') || '').toLowerCase();

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await getAllProducts();
      setProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const handleSearch = async (keyword) => {
    setSearchKeyword(keyword);
    if (!keyword) {
      setSuggestions([]);
      return;
    }
    try {
      const results = await searchProducts(keyword);
      setSuggestions(results);
    } catch (err) {
      console.error('Lỗi tìm kiếm:', err);
    }
  };

  return (
    <div className="space-y-10">

      {/* ================== PHẦN GIỚI THIỆU NỀN TẢNG (STYLE THINKMAY ĐẬM CHẤT WEB3) ================== */}
<div className="relative overflow-hidden bg-slate-950 py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-900 mb-8 text-center">
  
  {/* Hiệu ứng ánh sáng nghệ thuật chìm phía sau tạo chiều sâu */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-10">
    <div className="absolute top-[-20%] left-[35%] w-[500px] h-[500px] rounded-full bg-blue-500 blur-[150px]"></div>
    <div className="absolute bottom-[-20%] right-[35%] w-[450px] h-[450px] rounded-full bg-emerald-500 blur-[150px]"></div>
  </div>

  {/* Khối nội dung chính được căn giữa hoàn toàn */}
  <div className="relative max-w-3xl mx-auto flex flex-col items-center gap-6">
    
    {/* Tiêu đề chính (Headline) siêu lớn, đổ màu Gradient mượt mà */}
    <h1 className="text-3xl sm:text-4xl md:text-4xl font-extrabold tracking-tight leading-tight flex flex-col gap-3">
      <span className="text-white block">
        TrustRent - Thuê Máy Chủ VPS & GPU
      </span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 block">
        An Toàn Tuyệt Đối Với Smart Contract
      </span>
    </h1>

    {/* Đoạn mô tả (Sub-headline) tinh gọn, dễ đọc */}
    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl mt-1 opacity-90">
      TrustRent kết nối trực tiếp Chủ máy và Khách hàng thông qua Hợp đồng thông minh mạng Sepolia Testnet. 
      Mọi giao dịch, bàn giao cấu hình hệ thống và quyết toán chi phí đều được tự động hóa, 
      minh bạch và loại bỏ hoàn toàn rủi ro lừa đảo.
    </p>

    {/* Các tính năng cốt lõi xếp thành một dòng nằm ngang bên dưới */}
    <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-4 text-xs font-medium text-slate-400 border-t border-slate-900 pt-6 w-full">
      <div className="flex items-center gap-1.5">
        <span className="text-emerald-400">✔</span> 10 Phút dùng thử thực tế
      </div>
      <div className="h-3 w-[1px] bg-slate-800 hidden sm:block"></div>
      <div className="flex items-center gap-1.5">
        <span className="text-emerald-400">✔</span> Hoàn tiền 100% nếu VPS lỗi
      </div>
      <div className="h-3 w-[1px] bg-slate-800 hidden sm:block"></div>
      <div className="flex items-center gap-1.5">
        <span className="text-emerald-400">✔</span> Quyết toán On-chain tự động
      </div>
    </div>

    {/* Mũi tên chỉ xuống nhấp nháy nhảy động "Khám phá ngay" */}
    <div 
      onClick={() => {
        document.getElementById('search-section')?.scrollIntoView({ 
          behavior: 'smooth', // Cuộn mượt mà không bị khựng
          block: 'start'      // Đẩy khối tìm kiếm lên đầu màn hình
        });
      }}
      className="mt-4 animate-bounce flex flex-col items-center gap-1 cursor-pointer opacity-80 hover:opacity-100 transition-opacity select-none">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Khám phá ngay
      </span>
      <span className="text-lg text-blue-400">↓</span>
    </div>
  </div>
</div>

      {/* Khu vực Tìm kiếm & Bộ lọc nhanh */}
      <div id="search-section" className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="max-w-md w-full relative">
          <div className="space-y-2">
            <label className="block text-base font-extrabold uppercase tracking-wider text-slate-100">
              Tìm kiếm gói máy chủ
            </label>
          <Input
            type="text"
            placeholder="Nhập tên gói, ram... (Ví dụ: GPU RTX 3090)"
            value={searchKeyword}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>      
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
              {suggestions.map((item) => (
                <div
                  key={item._id}
                  onClick={() => navigate(`/product/${item._id}`)}
                  className="px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0"
                >
                  {item.title}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="secondary" className="w-full md:w-auto">Tất cả</Button>
        </div>
      </div>

      {/* Danh sách gói máy chủ VPS */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          Các gói máy chủ VPS sẵn có
        </h3>

        {loading ? (
          <p className="text-slate-400 text-center">Đang tải sản phẩm...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              // CHỐT LOGIC 1: Kiểm tra xem ví hiện tại có phải chủ sở hữu của máy này không
              const isMyOwnServer = currentWallet && (product.ownerAddress || '').toLowerCase() === currentWallet;

              // CHỐT LOGIC 2: Kiểm tra trạng thái máy từ DB/API để chuyển màu nhãn (Available / Unavailable)
              const isAvailable = product.status?.toLowerCase() === 'available';

              return (
                <div
                  key={product._id}
                  className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between relative"
                >
                  {/* NHÃN TRẠNG THÁI THAY ĐỔI ĐỘNG THEO YÊU CẦU */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`border text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      isAvailable
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </div>

                  {/* Khu vực ảnh minh họa cho VPS */}
                  <div className="h-48 overflow-hidden bg-slate-950">
                    <img
                      src={product.images?.[0] || product.image}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>    

                  {/* Chi tiết nội dung gói */}               
                  <div className="p-4 flex flex-col flex-grow justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-100 line-clamp-2 min-h-[3rem]">
                        {product.title}
                      </h4>

                      <div className="mt-4 space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Giá thuê / giờ:</span>
                          <span className="font-bold text-blue-400">{product.pricePerDay || product.pricePerHour} Token</span>
                        </div>
                      </div>
                    </div>
                    

                    {/* HIỂN THỊ NÚT BẤM DỰA VÀO QUYỀN SỞ HỮU VÀ TRẠNG THÁI MÁY */}
                    <div className="mt-4">
                    {isMyOwnServer ? (
                      <button
                        type="button"
                        disabled
                        title="Bạn không thể thuê lại cụm máy chủ do chính mình đăng tải hệ thống!"
                        className="w-full mt-4 text-xs py-2.5 bg-slate-800 text-slate-500 border border-slate-850 rounded-xl font-semibold cursor-not-allowed opacity-60 transition-all flex items-center justify-center gap-1"
                      >
                        🔒 Máy chủ của bạn
                      </button>
                    ) : !isAvailable ? (
                      <button
                        type="button"
                        disabled
                        title="Máy chủ này hiện đang được thuê hoặc đang trong phiên thử nghiệm."
                        className="w-full mt-4 text-xs py-2.5 bg-slate-950 text-slate-600 border border-slate-900 rounded-xl font-semibold cursor-not-allowed opacity-50 transition-all flex items-center justify-center gap-1"
                      >
                        ⏳ Đang được thuê
                      </button>
                    ) : (
                      <Button
                        variant="primary"
                        className="w-full mt-4 text-xs py-2"
                        onClick={() => navigate(`/product/${product._id}`)}
                      >
                        Xem chi tiết & Thuê máy
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;