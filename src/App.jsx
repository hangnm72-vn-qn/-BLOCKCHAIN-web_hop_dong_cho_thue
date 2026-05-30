import React from 'react';
import Navbar from './components/Navbar'; // 1. Lệnh kéo file Navbar vào đây

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* 2. Gọi thanh Navbar hiển thị lên đầu trang */}
      <Navbar /> 

      {/* Khu vực nội dung bên dưới hiển thị thô sơ */}
      <main className="p-6 text-center mt-10">
        <h2 className="text-2xl font-semibold text-slate-400">
          Hệ thống cho thuê tài sản đảm bảo bằng Smart Contract
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Giao diện chặng 1 đang được xây dựng...
        </p>
      </main>
    </div>
  );
}

export default App;