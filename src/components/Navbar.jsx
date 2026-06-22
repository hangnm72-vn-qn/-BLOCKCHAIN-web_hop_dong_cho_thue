import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import { getProductsByOwner } from '../Service - Ân/productService'; // Bỏ comment nếu bạn có hàm lấy sản phẩm theo chủ sở hữu

function Navbar({ onConnectWallet, walletAddress, walletBalance, isConnecting, currentTab, onChangeTab }) {
  const hasWalletData = Boolean(walletAddress);
  const navigate = useNavigate();
  const location = useLocation();

  // Đổi từ biến gán cứng sang trạng thái check tự động
  const [isLessor, setIsLessor] = useState(false); 
  const currentWallet = (walletAddress || '').toLowerCase();

  // TỰ ĐỘNG NHẬN DIỆN DIỆN CHỦ MÁY KHI ĐỔI VÍ
  useEffect(() => {
    if (!currentWallet) {
      setIsLessor(false);
      return;
    }

    // MÔ PHỎNG LUỒNG CHECK TỰ ĐỘNG (Bằng API hoặc Call Contract)
    const checkOwnership = async () => {
      try {
        /* Cách chuẩn: Gọi API backend hoặc Contract để check xem ví này có máy nào không
          const myMachines = await getProductsByOwner(currentWallet);
          if (myMachines && myMachines.length > 0) setIsLessor(true);
        */

        // TẠM THỜI (Để bạn test): Cho phép bất kỳ ví nào đã từng bấm "Đăng máy thành công" 
        // hoặc có lưu vết trong hệ thống được quyền làm chủ máy.
        const hasCreatedMachine = localStorage.getItem(`trustrent.isLessor.${currentWallet}`);
        if (hasCreatedMachine === 'true') {
          setIsLessor(true);
        } else {
          setIsLessor(false);
        }
      } catch (error) {
        setIsLessor(false);
      }
    };

    checkOwnership();
  }, [currentWallet]);

  // Hàm xử lý khi bấm đổi sang quyền Chủ máy
  const handleGoToLessor = () => {
    onChangeTab('lessor-workspace');
    navigate('/dashboard');
  };

  // Hàm xử lý khi từ Chủ máy đổi quay lại quyền Khách hàng
  const handleGoToRenter = () => {
    onChangeTab('my-rentals');
    navigate('/'); 
  };

  const handleLogoClick = () => {
    if (currentTab === 'lessor-workspace') {
      const isConfirm = window.confirm(
        "Bạn đang ở Không gian Chủ máy. Bạn có chắc chắn muốn rời khỏi trình quản trị để quay về Trang chủ dành cho Khách hàng?"
      );
      if (isConfirm) {
        onChangeTab('my-rentals'); 
        navigate('/');             
      }
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div 
          onClick={handleLogoClick}
          className="font-bold text-xl flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity select-none"
        >
          <span>🛡️</span> TrustRent
        </div>

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
          <div className="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
            <span className="text-xs font-bold text-emerald-400 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg select-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Không gian Chủ máy
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {currentTab !== 'lessor-workspace' ? (
          // THAY ĐỔI ĐIỀU KIỆN: Dùng biến tự động isLessor thay cho LESSOR_WALLET nhập tay
          isLessor ? (
            <button
              type="button"
              onClick={handleGoToLessor}
              className="text-xs font-bold text-slate-300 hover:text-emerald-400 bg-slate-950 border border-slate-850 hover:border-emerald-500/30 px-3 py-2 rounded-xl cursor-pointer transition-all shadow-sm"
            >
              ⚙️ Kênh Chủ Máy
            </button>
          ) : (
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