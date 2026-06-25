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
            
            // 🌟 CƠ CHẾ BYPASS THÔNG MINH:
            // Luôn mở khóa hoặc giữ trạng thái local nếu ở localhost
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

  return (
    <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      
      {/* CỘT TRÁI: LOGO TRUSTRENT */}
      <div className="flex items-center gap-4">
        {/* Click vào Logo sẽ đưa về trang chủ chợ máy */}
        <div 
          onClick={() => {
            onChangeTab('my-rentals'); // Reset tab mặc định
            navigate('/');
          }}
          className="font-bold text-xl flex items-center gap-2 cursor-pointer select-none hover:opacity-90 active:scale-95 transition-all"
        >
          <span>🛡️</span> TrustRent
        </div>
      </div>

      {/* CỘT PHẢI: CHỨA TOÀN BỘ NÚT ĐIỀU HƯỚNG VÀ VÍ KẾ BÊN NHAU */}
      <div className="flex items-center gap-3">
        
        {/* 1. NÚT MÁY ĐÃ THUÊ (LUÔN XUẤT HIỆN) */}
        <button
          type="button"
          onClick={() => { 
            onChangeTab('my-rentals'); 
            navigate('/dashboard'); 
          }}
          className={`text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all border ${
            location.pathname === '/dashboard' && currentTab === 'my-rentals'
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-md shadow-blue-950/20' 
              : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          📦 Máy đã thuê
        </button>

        {/* 2. NÚT KÊNH CHỦ MÁY (LUÔN XUẤT HIỆN BÊN CẠNH) */}
        <button
          type="button"
          onClick={() => {
            onChangeTab('lessor-workspace');
            navigate('/dashboard');
          }}
          className={`text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-all border ${
            location.pathname === '/dashboard' && currentTab === 'lessor-workspace'
              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 shadow-md shadow-emerald-950/20' 
              : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          ⚙️ Kênh Chủ Máy
        </button>

        {/* Vạch ngăn cách nhỏ giữa các nút tính năng và khu vực Ví */}
        <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block"></div>

        {/* 3. THÔNG TIN VÍ LIÊN KẾT */}
        {hasWalletData && (
          <div className="hidden sm:flex flex-col items-end text-right text-xs text-slate-300">
            <span className="font-mono font-medium text-slate-100">
              {walletAddress.length > 10 ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : walletAddress}
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-semibold">{walletBalance} ETH</span>
          </div>
        )}

        {/* 4. NÚT CONNECT WALLET */}
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