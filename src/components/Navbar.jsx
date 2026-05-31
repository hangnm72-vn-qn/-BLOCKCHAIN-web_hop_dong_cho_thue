import React from 'react';
function Navbar({ onConnectWallet, walletAddress, walletBalance, isConnecting }) {
  const hasWalletData = Boolean(walletAddress);

  return (
    <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 text-white">
      <div className="font-bold text-xl flex items-center gap-2">
        <span>🛡️</span> TrustRent
      </div>

      <div className="flex items-center gap-3">
        {/* Nếu đã có ví, hiển thị nhanh địa chỉ và số dư */}
        {hasWalletData && (
          <div className="hidden sm:flex flex-col items-end text-right text-xs text-slate-300">
            <span className="font-medium text-slate-100">{walletAddress}</span>
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