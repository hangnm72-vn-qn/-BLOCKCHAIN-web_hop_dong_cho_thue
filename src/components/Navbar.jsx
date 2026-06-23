import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Navbar({ onConnectWallet, walletAddress, walletBalance, isConnecting, currentTab, onChangeTab }) {
  const hasWalletData = Boolean(walletAddress);
  const navigate = useNavigate();
  const location = useLocation();

  const [isLessor, setIsLessor] = useState(false); 
  const currentWallet = (walletAddress || '').toLowerCase();

  // 🔄 TỰ ĐỘNG ĐỒNG BỘ KIỂM TRA QUYỀN CHỦ MÁY TỪ BACKEND LIVE
  useEffect(() => {
    if (!currentWallet) {
      setIsLessor(false);
      return;
    }

    let isMounted = true; 

    const checkOwnership = async () => {
      try {
        const response = await fetch('https://blockchain-web-hop-dong-cho-thue.onrender.com/api/products');
        const result = await response.json();
        
        if (isMounted) {
          if (result.success && result.data) {
            const hasMachine = result.data.some(p => (p.ownerAddress || '').toLowerCase() === currentWallet);
            
            // 🌟 CƠ CHẾ BYPASS THÔNG MINH CHO NHÀ PHÁT TRIỂN:
            // Nếu ví sở hữu máy thực tế HOẶC đang chạy thử nghiệm ở localhost thì luôn mở khóa nút Kênh Chủ Máy
            if (hasMachine || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
              setIsLessor(true);
            } else {
              setIsLessor(false);
            }
          } else {
            setIsLessor(window.location.hostname === 'localhost');
          }
        }
      } catch (error) {
        console.error("Lỗi đồng bộ quyền chủ máy từ API:", error);
        if (isMounted) {
          setIsLessor(window.location.hostname === 'localhost');
        }
      }
    };

    checkOwnership();

    return () => {
      isMounted = false;
    };
  }, [currentWallet]);

  const handleGoToLessor = () => {
    onChangeTab('lessor-workspace');
    navigate('/dashboard');
  };

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
          isLessor ? (
            <button
              type="button"
              onClick={handleGoToLessor}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl cursor-pointer transition-all shadow-sm"
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