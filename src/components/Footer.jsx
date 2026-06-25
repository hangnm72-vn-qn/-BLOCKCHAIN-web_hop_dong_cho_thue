function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Cột 1: Giới thiệu */}
        <div>
          <h3 className="text-white font-bold text-lg mb-3">🛡️ TrustRent</h3>
          <p className="text-sm leading-relaxed">
            Nền tảng cho thuê máy chủ VPS - Minh bạch và an toàn.
          </p>
        </div>
        {/* Cột 2: Quy định Smart Contract */}
        <div>
          <h4 className="text-white font-semibold mb-3">Điều Khoản Hệ Thống</h4>
          <ul className="space-y-2 text-sm">
            <li>• Hợp đồng thông minh bảo chứng giao dịch</li>
            <li>• Kiểm thử hiệu năng trước khi kích hoạt</li>
            <li>• Tự động ngắt kết nối và quyết toán khi hết hạn</li>
          </ul>
        </div>
        {/* Cột 3: Bản quyền */}
        <div>
          <h4 className="text-white font-semibold mb-3">Liên Hệ Đồ Án</h4>
          <p className="text-sm">📍 Nhóm Phát Triển DApp Hợp Đồng Cho Thuê</p>
          <p className="text-xs text-slate-500 mt-4">© 2026 TrustRent. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;