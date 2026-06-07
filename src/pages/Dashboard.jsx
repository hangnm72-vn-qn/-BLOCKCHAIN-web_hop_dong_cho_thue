import React from 'react';

function Dashboard({ currentRole }) {
  return (
    <div className="w-full text-left max-w-5xl mx-auto mt-6 animate-in fade-in duration-300">
      
      {currentRole === 'renter' ? (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-xl font-bold text-blue-400">Không gian Khách hàng</h2>
            <p className="text-xs text-slate-400 mt-1">Quản lý và theo dõi các gói dịch vụ máy chủ bạn đang thuê</p>
          </div>
          
          <div className="bg-slate-950 border border-slate-850 p-8 rounded-xl text-center text-slate-500 text-sm border-dashed">
            Chưa có máy chủ nào đang hoạt động. Vui lòng thuê máy ở trang chủ.
          </div>
        </div>
      ) : (
        /* ==================== GIAO DIỆN CHỦ MÁY (LESSOR) ==================== */
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-xl font-bold text-emerald-400">Không gian Chủ máy (Lessor)</h2>
            <p className="text-xs text-slate-400 mt-1">Đăng tải gói cấu hình VPS mới và quản lý doanh thu dịch vụ</p>
          </div>
          
          {/* Khu vực Form Đăng máy (ListingServer) & Cụm xử lý khủng hoảng */}
          <div className="bg-slate-950 border border-slate-850 p-8 rounded-xl text-center text-slate-500 text-sm border-dashed">
            Chưa có máy chủ nào được đăng tải. Sử dụng biểu mẫu để thêm máy mới.
          </div>
        </div>
      )}
      
    </div>
  );
}

export default Dashboard;