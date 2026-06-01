import Input from '../components/Input';
import Button from '../components/Button';

// Mảng dữ liệu mẫu để giao diện tự đổ ra các ô vuông sản phẩm
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Đầm Dạ Hội Trắng Silk Cao Cấp",
    rentPrice: "0.005",
    depositPrice: "0.05",
    image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: 2,
    name: "Váy Cưới Công Chúa Đính Đá",
    rentPrice: "0.012",
    depositPrice: "0.15",
    image: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: 3,
    name: "Đầm Cúp Ngực Đỏ Nhung Sang Trọng",
    rentPrice: "0.008",
    depositPrice: "0.08",
    image: "https://images.unsplash.com/photo-1539008835657-9e8e81839223?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: 4,
    name: "Váy Trễ Vai Dự Tiệc Cổ Điển",
    rentPrice: "0.006",
    depositPrice: "0.06",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=60"
  }
];

function Home() {
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
          <Button variant="secondary" className="w-full md:w-auto text-slate-400">Đầm Dạ Hội</Button>
          <Button variant="secondary" className="w-full md:w-auto text-slate-400">Váy Cưới</Button>
        </div>
      </div>

      {/* Danh sách sản phẩm (Grid 4 cột trên máy tính) */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          ✨ Bộ Sưu Tập Trang Phục Thiết Kế Cao Cấp ✨
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MOCK_PRODUCTS.map((product) => (
            <div 
              key={product.id} 
              className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Ảnh sản phẩm có hiệu ứng phóng to nhẹ khi di chuột vào */}
              <div className="h-64 overflow-hidden bg-slate-950">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Thông tin chi tiết */}
              <div className="p-4 flex flex-col flex-grow justify-between">
                <div>
                  <h4 className="font-semibold text-slate-100 line-clamp-2 min-h-[3rem]">
                    {product.name}
                  </h4>
                  
                  {/* Bảng giá thuê & giá cọc chuẩn Web3 */}
                  <div className="mt-4 space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Giá thuê / ngày:</span>
                      <span className="font-bold text-blue-400">{product.rentPrice} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tiền đặt cọc (Khóa ví):</span>
                      <span className="font-bold text-amber-500">{product.depositPrice} ETH</span>
                    </div>
                  </div>
                </div>

                {/* Nút giả lập chuyển trang */}
                <Button variant="primary" className="w-full mt-4 text-xs py-2">
                  Xem chi tiết điều khoản
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;