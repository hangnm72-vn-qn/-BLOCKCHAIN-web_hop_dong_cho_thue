import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar({ onConnectWallet, walletAddress, walletBalance, isConnecting, currentTab, onChangeTab }) {
  const hasWalletData = Boolean(walletAddress);
  const navigate = useNavigate();
  const location = useLocation();

  // ĐỊNH NGHĨA VÍ CHỦ MÁY (Hãy dán địa chỉ ví Chủ máy của bạn vào đây)
  const LESSOR_WALLET = "0x3d3d09D3BB73076968637dE1883844F950D58BA4".toLowerCase(); 
  const currentWallet = (walletAddress || '').toLowerCase();

  // Hàm xử lý khi bấm đổi sang quyền Chủ máy
  const handleGoToLessor = () => {
    onChangeTab('lessor-workspace'); // Đồng bộ chuẩn theo file Dashboard
    navigate('/dashboard');
  };

  // Hàm xử lý khi từ Chủ máy đổi quay lại quyền Khách hàng
  const handleGoToRenter = () => {
    onChangeTab('my-rentals');
    navigate('/'); // Đưa người dùng về Trang chủ 
  };

  // Hàm kiểm soát hành vi bấm vào Logo TrustRent theo ngữ cảnh quyền hạn
  const handleLogoClick = () => {
    if (currentTab === 'lessor-workspace') {
      // Nếu đang ở Kênh Chủ máy: Bắt buộc phải có bước xác nhận trước
      const isConfirm = window.confirm(
        "Bạn đang ở Không gian Chủ máy. Bạn có chắc chắn muốn rời khỏi trình quản trị để quay về Trang chủ dành cho Khách hàng?"
      );
      if (isConfirm) {
        onChangeTab('my-rentals'); // Ép trạng thái tab quay lại quyền khách hàng
        navigate('/');             // Điều hướng về trang chủ Chợ sản phẩm
      }
    } else {
      // Nếu đang là Khách hàng: Thoải mái chuyển về trang chủ xem sản phẩm
      navigate('/');
    }
  };

  return (
    <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      
      {/* KHỐI TRÁI: LOGO & MENU THEO NGỮ CẢNH */}
      <div className="flex items-center gap-8">
        
        {/* LOGO xử lý logic confirm chặn luồng thoát của Chủ máy */}
        <div 
          onClick={handleLogoClick}
          className="font-bold text-xl flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity select-none"
        >
          <span>🛡️</span> TrustRent
        </div>

        {/* ĐIỀU KIỆN 1: Nếu KHÔNG PHẢI là tab Chủ máy (Tức là đang làm Khách hàng) */}
        {currentTab !== 'lessor-workspace' ? (
          <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
            <button
              type="button"
              onClick={() => { onChangeTab('my-rentals'); navigate('/dashboard'); }}
              className={`text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all ${
                location.pathname === '/dashboard' && currentTab === 'my-rentals'
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📦 Máy đã thuê
            </button>
          </div>
        ) : (
          /* ĐIỀU KIỆN 2: Nếu ĐANG LÀM CHỦ MÁY (lessor-workspace) -> Ẩn toàn bộ link liên quan đến đi thuê */
          <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
            <span className="text-xs font-bold text-emerald-400 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg select-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Không gian Chủ máy
            </span>
          </div>
        )}
      </div>

      {/* KHỐI PHẢI: NÚT ĐỔI QUYỀN VÀ THÔNG TIN VÍ MULTI-CHAIN */}
      <div className="flex items-center gap-4">
        
        {/* NÚT THAY ĐỔI QUYỀN HẠN LINH HOẠT THEO DIỆN QUẢN LÝ */}
        {currentTab !== 'lessor-workspace' ? (
          // Kiểm tra danh tính ví trước khi cho phép vào Kênh Chủ Máy
          currentWallet === LESSOR_WALLET ? (
            <button
              type="button"
              onClick={handleGoToLessor}
              className="text-xs font-bold text-slate-300 hover:text-emerald-400 bg-slate-950 border border-slate-850 hover:border-emerald-500/30 px-3 py-2 rounded-xl cursor-pointer transition-all shadow-sm"
            >
              ⚙️ Kênh Chủ Máy
            </button>
          ) : (
            // Khóa cứng hiển thị nếu ví hiện tại thuộc về Khách hàng (Hoặc chưa đúng ví chủ máy)
            <button
              type="button"
              disabled
              title="Quyền truy cập bị từ chối: Ví của bạn không sở hữu tài nguyên cho thuê."
              className="text-xs font-bold text-slate-600 bg-slate-950/45 border border-slate-900 px-3 py-2 rounded-xl cursor-not-allowed opacity-55 flex items-center gap-1.5"
            >
              🔒 Kênh Chủ Máy
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={handleGoToRenter}
            className="text-xs font-bold text-slate-300 hover:text-blue-400 bg-slate-950 border border-slate-850 hover:border-blue-500/30 px-3 py-2 rounded-xl cursor-pointer transition-all shadow-sm"
          >
            🛒 Đổi sang quyền Khách hàng
          </button>
        )}

        {/* Thông tin ví MetaMask */}
        {hasWalletData && (
          <div className="hidden sm:flex flex-col items-end text-right text-xs text-slate-300">
            <span className="font-medium text-slate-100">
              {walletAddress.length > 10 ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : walletAddress}
            </span>
            <span className="text-slate-400">{walletBalance} ETH</span>
          </div>
        )}

        <button
          type="button"
          onClick={onConnectWallet}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer text-sm shadow-md"
        >
          {isConnecting ? 'Connecting...' : hasWalletData ? 'Wallet Connected' : 'Connect Wallet'}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;