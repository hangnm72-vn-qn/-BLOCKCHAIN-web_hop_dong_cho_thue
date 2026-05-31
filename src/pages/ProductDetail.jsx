import React from 'react';
import Button from '../components/Button';
import Input from '../components/Input';

function ProductDetail() {
  // Giả định đang xem sản phẩm ID số 1 (Dữ liệu mẫu, sau này bạn của bạn sẽ map với IPFS)
  const product = {
    name: "Đầm Dạ Hội Trắng Silk Cao Cấp",
    rentPrice: "0.005",
    depositPrice: "0.05",
    image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=60",
    status: "Mới 98% - Không sờn vải - Khóa kéo trơn tru",
    owner: "0x71C...3A9b" 
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left mt-4">
      {/* CỘT TRÁI: Ảnh phóng to siêu nét */}
      <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl h-[500px]">
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover"
        />
      </div>

      {/* CỘT PHẢI: Thông tin và Bảng cam kết luật phạt đền Smart Contract */}
      <div className="flex flex-col justify-between space-y-6">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-950/50 border border-blue-900/50 px-3 py-1 rounded-full">
            Chi Tiết Hợp Đồng Thuê
          </span>
          <h2 className="text-3xl font-bold text-white mt-3 mb-2">{product.name}</h2>
          <p className="text-xs text-slate-500 mb-6">
            Chủ sở hữu (Lessor): <span className="text-slate-400 font-mono">{product.owner}</span>
          </p>

          {/* Khối tình trạng hiện tại */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">🔍 Tình trạng bàn giao thực tế:</h4>
            <p className="text-sm text-emerald-400 font-medium">{product.status}</p>
          </div>

          {/* BẢNG ĐIỀU KHOẢN PHẠT ĐỀN CỦA SMART CONTRACT */}
          <div className="border border-rose-900/30 bg-rose-950/10 rounded-2xl p-5 border-l-4 border-l-rose-500">
            <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-3">
              ⚠️ Điều Khoản Phạt Đền 
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex justify-between border-b border-slate-900 pb-1.5">
                <span>⏰ Trả đồ trễ hạn:</span>
                <span className="text-rose-400 font-bold">+0.002 ETH / ngày</span>
              </li>
              <li className="flex justify-between border-b border-slate-900 pb-1.5">
                <span>✂️ Rách / Thủng váy (Mức nhẹ):</span>
                <span className="text-rose-400 font-bold">Khấu trừ 50% tiền cọc</span>
              </li>
              <li className="flex justify-between pb-0">
                <span>🔥 Mất đồ / Hư hỏng hoàn toàn:</span>
                <span className="text-rose-400 font-bold">Tịch thu 100% tiền cọc ({product.depositPrice} ETH)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Khung tính toán đặt cọc & Khối Nút bấm hành động */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Số ngày thuê" 
              type="number" 
              placeholder="1" 
              min="1" 
              className="w-full"
            />
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Tổng tiền thuê ước tính
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-blue-400 font-bold text-sm h-[46px] flex items-center">
                {product.rentPrice} ETH
              </div>
            </div>
          </div>

          {/* HÀNG NÚT BẤM CHÍNH */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="secondary" className="flex-1">
              Quay Lại
            </Button>
            <Button variant="primary" className="flex-[2] font-bold text-base bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20">
              ⚡ Thuê Ngay (Khóa Cọc {product.depositPrice} ETH)
            </Button>
          </div>
          
          <p className="text-[11px] text-slate-500 text-center italic">
            *Bấm Thuê Ngay sẽ kích hoạt MetaMask để thực hiện giao dịch đặt cọc vào Hợp đồng thông minh.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;