import React from 'react';

function Navbar() {
  return (
    <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 text-white">
      {/* Bên trái: Tên dự án (Logo) */}
      <div className="font-bold text-xl flex items-center gap-2">
        <span>🛡️</span> TrustRent
      </div>

      {/* Bên phải: Nút bấm kết nối ví thô sơ */}
      <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer">
        Connect Wallet
      </button>
    </nav>
  );
}

export default Navbar;