import React, { useState } from 'react';

function Navbar({ onConnectWallet, walletAddress, walletBalance, isConnecting, currentRole = 'renter', onChangeRole }) {
  const hasWalletData = Boolean(walletAddress);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="font-bold text-xl flex items-center gap-2">
        <span>🛡️</span> TrustRent
      </div>

      <div className="flex items-center gap-4">
        
        {/* DROPDOWN CHUYỂN ĐỔI CHẾ ĐỘ CHỦ MÁY / KHÁCH THUÊ */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl hover:bg-slate-750 transition-colors shadow-sm cursor-pointer"
          >
            Chế độ: {currentRole === 'renter' ? 'Khách hàng' : 'Chủ máy'}
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {isOpen && (
            <>
              {/* Lớp bọc phủ màn hình (Backdrop) để khi click ra ngoài Dropdown thì tự đóng */}
              <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsOpen(false)}></div>
              
              <div className="absolute right-0 mt-2 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                
                {/* Lựa chọn 1: Khách thuê */}
                <button 
                  type="button"
                  onClick={() => { onChangeRole('renter'); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-xs font-medium cursor-pointer transition-colors ${
                    currentRole === 'renter' 
                      ? 'text-blue-400 bg-blue-950/40 font-bold border-l-2 border-blue-500' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Khách hàng (Renter)
                </button>
                
                {/* Lựa chọn 2: Chủ máy */}
                <button 
                  type="button"
                  onClick={() => { onChangeRole('lessor'); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-xs font-medium cursor-pointer transition-colors ${
                    currentRole === 'lessor' 
                      ? 'text-emerald-400 bg-emerald-950/40 font-bold border-l-2 border-emerald-500' 
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Chủ máy (Lessor)
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Nếu đã có ví, hiển thị nhanh địa chỉ và số dư */}
        {hasWalletData && (
          <div className="hidden sm:flex flex-col items-end text-right text-xs text-slate-300">
            <span className="font-medium text-slate-100">
              {walletAddress.length > 10 ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : walletAddress}
            </span>
            <span>{walletBalance} ETH</span>
          </div>
        )}

        {/* Nút bấm tự động đổi chữ tùy trạng thái kết nối */}
        <button
          type="button"
          onClick={onConnectWallet}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer text-sm"
        >
          {isConnecting ? 'Connecting...' : hasWalletData ? 'Wallet Connected' : 'Connect Wallet'}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;