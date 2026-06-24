import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { getAllProducts, searchProducts } from '../Service - Ân/productService';

function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await getAllProducts()
      setProducts(data)
      setLoading(false)
    }
    fetchProducts()
  }, [])
  const handleSearch = async (keyword) => {
    setSearchKeyword(keyword)
    if (!keyword) {
      setSuggestions([])
      return
    }
    try {
      const results = await searchProducts(keyword)
      setSuggestions(results)
    } catch (err) {
      console.error('Lỗi tìm kiếm:', err)
    }
  }

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
            {products.map((product) => (
              <div
                key={product._id}
                className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between relative"
              >
                {/* THÊM NHÃN TRẠNG THÁI AVAILABLE Ở GÓC TRÊN ẢNH */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Available
                  </span>
                </div>

                {/* Khu vực ảnh minh họa cho VPS */}
                <div className="h-48 overflow-hidden bg-slate-950">
                  <img
                    src={product.images[0]}
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
                        {/* Tạm thời giữ dữ liệu cũ nhưng đổi đơn vị hiển thị thành Token/Giờ */}
                      <span className="font-bold text-blue-400">{product.pricePerHour} Token</span>                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tiền cọc (Khóa ví trung gian):</span>
                        <span className="font-bold text-amber-500">{product.depositAmount} Token</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mt-4 text-xs py-2"
                    onClick={() => navigate(`/product/${product._id}`)}
                  >
                    Xem chi tiết & Thuê máy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;