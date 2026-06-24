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
      {/* Khu vực Tìm kiếm & Bộ lọc nhanh */}
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="max-w-md w-full relative">
          <Input
            label="Tìm kiếm gói máy chủ"
            placeholder="Nhập tên gói, ram... (Ví dụ: GPU RTX 3090)"
            value={searchKeyword}
            onChange={(e) => handleSearch(e.target.value)}
          />
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
                  {/* CẬP NHẬT: NHÃN TRẠNG THÁI THAY ĐỔI ĐỘNG THEO YÊU CẦU */}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;