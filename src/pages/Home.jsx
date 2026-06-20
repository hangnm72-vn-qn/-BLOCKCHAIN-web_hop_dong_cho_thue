import React, { useEffect, useState } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import { getAllProducts } from '../Service - Ân/productService';

function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await getAllProducts()
      setProducts(data)
      setLoading(false)
    }
    fetchProducts()
  }, [])

  return (
    <div className="space-y-10">
      {/* Khu vực Tìm kiếm & Bộ lọc nhanh */}
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <Input
          label="Tìm kiếm trang phục thiết kế"
          placeholder="Nhập tên váy, thương hiệu... (Ví dụ: Đầm Dạ Hội)"
          className="max-w-md"
        />
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="secondary" className="w-full md:w-auto">Tất cả</Button>
        </div>
      </div>

      {/* Danh sách sản phẩm */}
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
                className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="h-64 overflow-hidden bg-slate-950">
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
                        <span className="text-slate-500">Giá thuê / ngày:</span>
                        <span className="font-bold text-blue-400">{product.pricePerDay.toLocaleString()} VNĐ</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tiền đặt cọc (Khóa ví):</span>
                        <span className="font-bold text-amber-500">{product.depositAmount.toLocaleString()} VNĐ</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full mt-4 text-xs py-2"
                    onClick={() => window.location.href = `/product/${product._id}`}
                  >
                    Xem chi tiết điều khoản
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