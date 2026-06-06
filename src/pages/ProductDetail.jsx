import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import { getProductById } from "../Service - Ân/productService"
import { useParams, useNavigate } from 'react-router-dom';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  // THÊM STATE QUẢN LÝ SỐ GIỜ THUÊ (Mặc định ban đầu là 1 giờ)
  const [rentHours, setRentHours] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      const data = await getProductById(id)
      setProduct(data)
      setLoading(false)
    }
    fetchProduct()
  }, [id])

  if (loading) return <p className="text-slate-400 text-center mt-10">Đang tải thông tin máy chủ...</p>
  if (!product) return <p className="text-slate-400 text-center mt-10">Không tìm thấy thông tin máy chủ.</p>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left mt-4">
      {/* CỘT TRÁI: Ảnh cấu hình / Minh họa VPS */}
      <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl h-[500px]">
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* CỘT PHẢI: Thông tin và Bảng cam kết điều khoản Smart Contract */}
      <div className="flex flex-col justify-between space-y-6">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-950/50 border border-blue-900/50 px-3 py-1 rounded-full">
            Chi Tiết Hợp Đồng Thuê
          </span>
          <h2 className="text-3xl font-bold text-white mt-3 mb-2">{product.title}</h2>
          <p className="text-xs text-slate-500 mb-6">
            Địa chỉ ví chủ máy (Lessor): <span className="text-slate-400 font-mono">{product.ownerAddress}</span>
          </p>

          {/* Khối mô tả thông số máy chủ*/}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">🔍 Chi tiết cấu hình & Tài nguyên:</h4>
            <p className="text-sm text-emerald-400 font-medium">{product.description}</p>
          </div>

          {/* BẢNG ĐIỀU KHOẢN VẬN HÀNH CỦA SMART CONTRACT ĐÃ ĐƯỢC THIẾT LẠI */}
          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4 uppercase tracking-wider">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              ⚠️ Quy định vận hành & Khấu trừ tự động
            </h4>
  
            <div className="space-y-4">
              {/* Dòng 1: 10 phút đầu */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-base">⏰</span>
                  <span className="text-xs font-medium text-slate-400">10 Phút thử nghiệm đầu tiên</span>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md sm:text-right">
                  Được quyền hủy, hoàn cọc 100%
                </span>
              </div>

              {/* Dòng 2: Sập nguồn ngầm */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-base">❌</span>
                  <span className="text-xs font-medium text-slate-400">Chủ máy ngắt kết nối / Sập nguồn ngầm</span>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md sm:text-right">
                  Hoàn 100% tiền cọc cho Người thuê
                </span>
              </div>

              {/* Dòng 3: Quá thời gian */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <span className="text-xs font-medium text-slate-400">Sử dụng quá thời gian đã thuê</span>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md sm:text-right">
                  Google Cloud tự động xóa máy vĩnh viễn
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Khung tính toán đặt cọc & Khối Nút bấm hành động */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="grid grid-cols-2 gap-4">
            
            <Input
              label="Số giờ cần thuê (Tối thiểu 1 giờ)"
              type="number"
              placeholder="Nhập số giờ... (Ví dụ: 5)"
              min="1"
              value={rentHours}
              onChange={(e) => setRentHours(e.target.value)}
              required
              className="w-full"
            />
            
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Giá thuê / giờ
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-blue-400 font-bold text-sm h-[46px] flex items-center">
                {product.pricePerDay} Token
              </div>
            </div>
          </div>

          {/* HÀNG NÚT BẤM CHÍNH */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/')}>
              Quay Lại Trang Chủ
            </Button>
            {product.status === 'Available' ? (
              <Button variant="primary" className="flex-[2] font-bold text-base bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20">
                ⚡ Thuê Ngay (Khóa Cọc {product.depositAmount} Token)
              </Button>
            ) : (
              <Button variant="primary" className="flex-[2] font-bold text-base bg-slate-600 cursor-not-allowed" disabled>
                Máy chủ đã có người thuê
              </Button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center italic">
            *Bấm Thuê Ngay sẽ kích hoạt ví MetaMask để thực hiện khóa Token đặt cọc vào Hợp đồng.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;