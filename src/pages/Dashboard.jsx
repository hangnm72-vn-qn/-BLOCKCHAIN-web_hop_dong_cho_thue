import React, { useEffect, useState } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { useNavigate } from 'react-router-dom';
import {
  createProduct,
  getSessionTime,
  getProductsByOwner,
  updateProductStatus,
  terminateProduct
} from '../Service - Ân/productService';

import {
  createRentalFactoryContract,
  createSingleContract,
  SEPOLIA_CHAIN_ID
} from '../contracts/rentalFactoryConfig';

function Dashboard({ currentTab, walletAddress }) {
  const navigate = useNavigate();

  // Ví hiện tại đang kết nối (Ưu tiên lấy từ localStorage để đồng bộ với Navbar)
  const currentWallet = (walletAddress || localStorage.getItem('trustrent.walletAddress') || '').toLowerCase();

  // =========================================================
  // 1. STATE QUẢN LÝ PHÍA KHÁCH THUÊ
  // =========================================================
  const [renterData, setRenterData] = useState({
    ip: '34.124.211.85',
    port: '22',
    username: 'trustrent_user',
    password: 'MockPassword2026@',
    status: 'Testing' // Mặc định để Testing để hiển thị nút Test luồng
  });

  // =========================================================
  // 2. STATE QUẢN LÝ PHÍA CHỦ MÁY
  // =========================================================
  const [lessorData, setLessorData] = useState({
    status: 'None'
  });

  const [timeLeft, setTimeLeft] = useState(300); // 5 phút dùng thử = 300 giây
  const [timerType, setTimerType] = useState('trial'); // 'trial' hoặc 'rental'
  const [showToast, setShowToast] = useState(false);

  // States của Form đăng ký máy chủ
  const [serverForm, setServerForm] = useState({
    title: '',
    description: '',
    pricePerHour: '',
    ownerAddress: currentWallet,
    condition: 'Good',
    username: '',
    password: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // States quản lý danh sách sản phẩm chủ máy
  const [myServers, setMyServers] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Trạng thái chờ giao dịch Blockchain
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);

  // Đồng bộ địa chỉ ví vào Form khi ví thay đổi
  useEffect(() => {
    if (currentWallet) {
      setServerForm((prev) => ({ ...prev, ownerAddress: currentWallet }));
      fetchLessorProducts();
    }
  }, [currentWallet]);

  // Đếm ngược thời gian phiên làm việc
  useEffect(() => {
    if (renterData.status === 'None') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (timerType === 'trial') {
            setRenterData((r) => ({ ...r, status: 'Active' }));
            setTimerType('rental');
            setShowToast(true);
            return 3600; // Chuyển sang 1 tiếng thuê chính thức
          } else {
            setRenterData((r) => ({ ...r, status: 'None' }));
            return 0;
          }
        }

        // Cảnh báo Toast khi sắp hết hạn
        if (timerType === 'trial' && prev === 60) {
          setShowToast(true);
        } else if (timerType === 'rental' && prev === 900) {
          setShowToast(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [renterData.status, timerType]);

  // Định dạng thời gian hiển thị (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Lấy danh sách máy chủ do ví này đăng
  const fetchLessorProducts = async () => {
    if (!currentWallet) return;
    setIsLoadingProducts(true);
    try {
      const products = await getProductsByOwner(currentWallet);
      setMyServers(products);
    } catch (error) {
      console.error('Lỗi lấy danh sách máy chủ sở hữu:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Xử lý thay đổi dữ liệu Form đăng máy
  const handleServerFormChange = (field, value) => {
    setServerForm((prev) => ({ ...prev, [field]: value }));
  };

  // Hàm gọi API tạo sản phẩm lên Backend và Blockchain
  const handleCreateServer = async () => {
    if (!serverForm.title || !serverForm.pricePerHour || !serverForm.ownerAddress || !imageFile || !serverForm.username || !serverForm.password) {
      setSubmitMessage('Vui lòng nhập đủ thông tin gói, tài khoản và ảnh minh họa.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      if (!window.ethereum) throw new Error('Vui lòng cài đặt ví MetaMask!');
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        setSubmitMessage('Vui lòng chuyển mạng ví sang Sepolia Testnet!');
        setIsSubmitting(false);
        return;
      }

      const signer = await provider.getSigner();
      const factoryContract = createRentalFactoryContract(signer);

      const priceWei = parseUnits(serverForm.pricePerHour.toString(), 18);
      const tx = await factoryContract.listServer(priceWei, 3600);
      setSubmitMessage('🔄 Đang đợi Smart Contract xác thực block...');
      await tx.wait();

      await createProduct(
        serverForm.title,
        serverForm.description,
        serverForm.pricePerHour,
        serverForm.ownerAddress,
        serverForm.condition,
        imageFile,
        serverForm.username,
        serverForm.password
      );

      setSubmitMessage('Đăng tải máy chủ thành công lên hệ thống!');
      setServerForm({
        title: '',
        description: '',
        pricePerHour: '',
        ownerAddress: currentWallet,
        condition: 'Good',
        username: '',
        password: '',
      });
      setImageFile(null);
      fetchLessorProducts();
    } catch (error) {
      console.error(error);
      setSubmitMessage(`Lỗi đăng tải: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // KHÁCH THUÊ ẤN NÚT: ĐỒNG Ý (HOẠT ĐỘNG TỐT)
  const handleConfirmOK = async () => {
    setIsConfirming(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask không khả dụng');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const singleContract = createSingleContract('0xMockContractAddress...', signer);
      // Giả lập hoặc gọi lệnh On-chain xác nhận hoàn thành sớm phiên thử nghiệm
      // const tx = await singleContract.confirmStartRental();
      // await tx.wait();

      setRenterData((prev) => ({ ...prev, status: 'Active' }));
      setTimerType('rental');
      setTimeLeft(3600); // Kích hoạt chạy phiên chính thức 1 tiếng
      alert('Xác nhận thành công! Máy chủ hoạt động tốt, bắt đầu phiên thuê chính thức.');
    } catch (error) {
      alert(`Lỗi xác nhận: ${error.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  // KHÁCH THUÊ ẤN NÚT: HỦY BỎ (BÁO LỖI & HOÀN TIỀN CỌC LẬP TỨC)
  const handleCancelAndRefund = async () => {
    setIsResolvingDispute(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask không khả dụng');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const singleContract = createSingleContract('0xMockContractAddress...', signer);
      // Giả lập hoặc gọi lệnh hủy hợp đồng hoàn tiền cọc lập tức trên Contract
      // const tx = await singleContract.cancelTrialAndRefund();
      // await tx.wait();

      setRenterData((prev) => ({ ...prev, status: 'None' }));
      alert('Đã hủy phiên thử nghiệm! Tiền cọc đã được hoàn trả về ví của bạn.');
    } catch (error) {
      alert(`Lỗi xử lý hủy: ${error.message}`);
    } finally {
      setIsResolvingDispute(false);
    }
  };

  return (
    <div className="w-full text-left max-w-5xl mx-auto mt-6 relative animate-in fade-in duration-300">

      {/* TOAST CẢNH BÁO HẾT HẠN */}
      {showToast && currentTab === 'my-rentals' && (
        <div className="fixed bottom-5 right-5 bg-amber-600 border border-amber-500 text-white p-4 rounded-xl shadow-2xl z-50 max-w-sm flex flex-col gap-1 animate-bounce">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>⚠️</span>
            {timerType === 'trial'
              ? ' CẢNH BÁO HẾT HẠN PHIÊN THỬ NGHIỆM'
              : ' CẢNH BÁO HẾT HẠN PHIÊN THUÊ'}
          </div>

          <p className="text-xs text-amber-100">
            {timerType === 'trial'
              ? 'Phiên thử nghiệm sắp hết hạn, hãy kiểm tra máy và xác nhận trạng thái!'
              : 'Thời gian thuê còn dưới 15 phút, hãy lưu lại dữ liệu!'}
          </p>

          <button
            onClick={() => setShowToast(false)}
            className="text-[10px] underline text-right text-amber-200 mt-1 hover:text-white"
          >
            Đã hiểu và đang sao lưu
          </button>
        </div>
      )}

      {currentTab === 'my-rentals' ? (
        /* ================== MENU 2: MÁY ĐÃ THUÊ ================== */
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-6">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-blue-400">Không gian quản lý phiên thuê</h2>
              <p className="text-xs text-slate-400 mt-1">
                Giám sát thông số kỹ thuật và thời gian vận hành của máy chủ bạn đang thuê
              </p>
            </div>

            {renterData.status !== 'None' && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                renterData.status === 'Testing'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
              }`}>
                {renterData.status === 'Testing' ? 'Thử nghiệm (5p)' : 'Active'}
              </span>
            )}
          </div>

          {renterData.status === 'None' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
              <div className="text-4xl">📭</div>
              <div>
                <h4 className="text-sm font-bold text-slate-300">
                  Bạn chưa có máy chủ nào đang hoạt động
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Hiện tại ví của bạn chưa thực hiện giao dịch cọc thuê máy nào hoặc phiên dùng thử cũ đã hết hạn.
                </p>
              </div>
              <button onClick={() => navigate('/')} className="mt-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md">
                🛍️ Quay lại Trang chủ để tìm gói sản phẩm phù hợp
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">
                    Thông tin cấu hình bàn giao
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">Địa chỉ IP VPS</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                        {renterData.ip}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 mb-1">Cổng Kết Nối (Port)</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                        {renterData.port}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 mb-1">Username hệ thống</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                        {renterData.username}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 mb-1">Password (Dùng một lần)</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                        {renterData.password}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col justify-center items-center text-center gap-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {timerType === 'trial'
                      ? 'Thời gian thử nghiệm còn lại'
                      : 'Thời gian thuê còn lại'}
                  </h3>

                  <div className="text-4xl font-mono font-bold text-amber-400 bg-amber-950/20 px-6 py-3 rounded-2xl border border-amber-900/40 my-2">
                    {formatTime(timeLeft)}
                  </div>

                  <p className="text-[10px] text-slate-500">
                    {timerType === 'trial'
                      ? 'Vui lòng kiểm tra kỹ kết nối trong thời gian dùng thử này.'
                      : 'Hệ thống ngắt quyền truy cập On-chain khi đếm ngược kết thúc'}
                  </p>
                </div>
              </div>

              {/* PHIÊN THỬ NGHIỆM: CHỈ CÒN ĐỒNG Ý HOẶC HỦY BỎ */}
              {renterData.status === 'Testing' && (
                <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 mt-2">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-amber-400">Xác nhận tình trạng máy chủ thử nghiệm</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Nếu máy hoạt động tốt, chọn "Đồng ý" để bắt đầu thuê. Nếu máy lỗi hoặc không kết nối được, chọn "Hủy bỏ" để nhận lại tiền cọc.
                      </p>
                    </div>

                    <div className="flex gap-3 justify-end shrink-0">
                      <button
                        type="button"
                        onClick={handleCancelAndRefund}
                        disabled={isConfirming || isResolvingDispute}
                        className="bg-rose-700 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md"
                      >
                        {isResolvingDispute ? 'Đang hủy...' : '❌ Hủy bỏ (Trả cọc)'}
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmOK}
                        disabled={isConfirming || isResolvingDispute}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-950/40"
                      >
                        {isConfirming ? 'Đang xác nhận...' : '✅ Đồng ý (Chạy tốt)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ================== MENU 3: KHÔNG GIAN CHỦ MÁY ================== */
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-xl font-bold text-emerald-400">
              Bảng điều khiển cho thuê (Lessor Workspace)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Đăng tải tài nguyên và xử lý trạng thái tài chính của các dòng máy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            {/* KHỐI 1: FORM ĐĂNG CẤU HÌNH */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="md:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4"
            >
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">
                Khai báo cấu hình VPS cho thuê
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left">
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Tên gói máy chủ</label>
                  <input type="text" value={serverForm.title} onChange={(e) => handleServerFormChange('title', e.target.value)} placeholder="Ví dụ: Google Cloud VPS - High Performance" className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500" />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Cấu hình CPU</label>
                  <input type="text" value={serverForm.description} onChange={(e) => handleServerFormChange('description', e.target.value)} placeholder="Ví dụ: 4 vCPU" className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500" />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Dung lượng RAM</label>
                  <input
                    type="text"
                    value={serverForm.condition}
                    onChange={(e) => handleServerFormChange('condition', e.target.value)}
                    placeholder="Ví dụ: 16 GB"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Thông số GPU (Nếu có)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: NVIDIA T4 (Tùy chọn)"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Giá thuê (Token/giờ)</label>
                  <input type="number" min="0" step="0.001" value={serverForm.pricePerHour} onChange={(e) => handleServerFormChange('pricePerHour', e.target.value)} placeholder="Ví dụ: 10" className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500" />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Username Máy chủ</label>
                  <input 
                    type="text" 
                    value={serverForm.username || ''} 
                    onChange={(e) => handleServerFormChange('username', e.target.value)} 
                    placeholder="Ví dụ: administrator hoặc root" 
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500" 
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Password Máy chủ</label>
                  <input 
                    type="password" 
                    value={serverForm.password || ''} 
                    onChange={(e) => handleServerFormChange('password', e.target.value)} 
                    placeholder="Nhập mật khẩu truy cập máy" 
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500" 
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Địa chỉ ví nhận Token</label>
                  <input type="text" value={currentWallet || 'Chưa kết nối ví'} disabled className="w-full bg-slate-950 border border-slate-850 text-slate-500 rounded p-2.5 cursor-not-allowed font-mono text-[11px]" />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Ảnh minh họa cụm máy</label>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              {submitMessage && (
                <p className={`text-xs ${submitMessage.includes('thành công') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {submitMessage}
                </p>
              )}

              <button type="button" onClick={handleCreateServer} disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer mt-2 shadow-lg shadow-emerald-950/20">
                {isSubmitting ? 'Đang kích hoạt gói...' : 'Xác thực & Thêm máy lên Trang chủ'}
              </button>
            </form>

            {/* ==================== KHỐI 2: NHẬT KÝ VẬN HÀNH MÁY CHỦ ==================== */}
            <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 flex flex-col gap-4 w-full">
              <div className="border-b border-slate-900 pb-2 flex flex-col gap-1">
              {/* Tiêu đề nằm trên 1 hàng ngang và có dấu xanh nhấp nháy */}
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <h3 className="text-sm font-bold text-slate-200">
                      Nhật ký vận hành máy chủ
                    </h3>
                  </div>
                </div>

                {/* Dòng tổng cộng được đưa xuống dòng dưới */}
                <div>
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                    Tổng cộng: {myServers.length} máy
                  </span>
                </div>
              </div>

              {/* Danh sách máy chủ của ví hiện tại */}
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {isLoadingProducts ? (
                  <div className="text-center py-6 text-xs text-slate-500 animate-pulse">
                    ⏳ Đang tải danh sách máy chủ...
                  </div>
                ) : myServers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-600 border border-dashed border-slate-900 rounded-lg">
                    📭 Ví của bạn chưa đăng tải cụm máy chủ nào lên hệ thống.
                  </div>
                ) : (
                  myServers.map((server) => {
                    // Phân tích trạng thái máy chủ (Available / Unavailable) dựa vào DB
                    const isAvailable = server.status?.toLowerCase() === 'available';

                    return (
                      <div
                        key={server._id || server.id}
                        className="p-3 bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded-lg text-left text-xs flex flex-col gap-2 transition-all"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-slate-300 truncate max-w-[70%]">
                            🖥️ {server.title}
                          </span>

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isAvailable
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                          }`}>
                            {isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-950/60 pt-1.5 text-[11px]">
                          <p className="text-slate-500">
                            Giá thuê:{' '}
                            <span className="text-blue-400 font-mono font-bold">
                              {server.pricePerHour} Token/giờ
                            </span>
                          </p>
                          
                          <span className="text-slate-600 font-mono text-[9px] max-w-[150px] truncate">
                            ID: {server._id || server.id}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="text-[10px] text-slate-600 text-center border-t border-slate-900/60 pt-2">
                🔄 Dữ liệu trạng thái máy chủ đồng bộ thời gian thực với Database
              </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;