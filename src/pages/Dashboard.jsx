import React, { useEffect, useState } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../Service - Ân/productService';
import { createRentalFactoryContract, SEPOLIA_CHAIN_ID } from '../contracts/rentalFactoryConfig';

function Dashboard({ currentTab }) { // Đổi từ currentRole sang currentTab để quản lý luồng Menu tách biệt
  const navigate = useNavigate();

  // 1. STATE QUẢN LÝ THÔNG TIN PHIÊN THUÊ (DÀNH CHO TAB "MÁY ĐÃ THUÊ")
  const [serverData, setServerData] = useState({
    ip: '34.124.211.85',
    port: '22',
    username: 'trustrent_user',
    password: 'MockPassword2026@',
    status: 'None' // Các trạng thái: None, Testing, Active, Dispute
  });

  // Giả lập số giây còn lại từ API (Ví dụ: 9 phút 50 giây = 590 giây)
  const [timeLeft, setTimeLeft] = useState(590);
  const [showToast, setShowToast] = useState(false);
  const [showNegotiation, setShowNegotiation] = useState(false);

  // 2. STATE CHO FORM ĐĂNG MÁY (DÀNH CHO TAB "CHỦ MÁY")
  const [serverForm, setServerForm] = useState({
    title: '',
    description: '',
    pricePerHour: '',
    condition: '',
    ownerAddress: localStorage.getItem('trustrent.walletAddress') || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Logic chạy đồng hồ đếm ngược bằng JavaScript
  useEffect(() => {
    if (timeLeft <= 0 || serverData.status === 'None') return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;

        // Tự động bật Toast cảnh báo khi thời gian còn dưới 9 phút 45 giây (để dễ test demo)
        if (newTime === 585) {
          setShowToast(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, serverData.status]);

  // Hàm biến biến đổi số giây thành định dạng Phút:Giây (MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Hàm xử lý khi khách bấm [ Hoạt động tốt ]
  const handleConfirmOK = () => {
    setServerData(prev => ({ ...prev, status: 'Active' }));
    alert("Đã gọi hàm confirmServerOK() của Hạnh. Trạng thái đổi sang màu xanh đậm (Active)!");
  };

  // Hàm xử lý khi khách bấm [ Báo lỗi ]
  const handleReportError = () => {
    setServerData(prev => ({ ...prev, status: 'Dispute' }));
    setShowNegotiation(true);
  };

  const handleServerFormChange = (field, value) => {
    setServerForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateServer = async () => {
    if (!serverForm.title || !serverForm.pricePerHour || !serverForm.ownerAddress || !imageFile) {
      setSubmitMessage('Vui lòng nhập đủ tên gói, giá thuê, địa chỉ ví và ảnh đại diện.');
      return;
    }

    if (!window.ethereum) {
      setSubmitMessage('Vui lòng cài đặt MetaMask để gọi smart contract.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage('');

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        setSubmitMessage('Vui lòng chuyển MetaMask sang mạng Sepolia trước khi thêm máy chủ.');
        return;
      }

      const signer = await provider.getSigner();
      const factoryContract = createRentalFactoryContract(signer);
      const tokenAddress = await factoryContract.token();
      const tokenContract = new Contract(tokenAddress, ['function decimals() view returns (uint8)'], provider);

      let tokenDecimals = 18;
      try {
        tokenDecimals = Number(await tokenContract.decimals());
      } catch {
        tokenDecimals = 18;
      }

      const onChainPrice = parseUnits(String(serverForm.pricePerHour), tokenDecimals);
      const tx = await factoryContract.createServerPackage(serverForm.title, onChainPrice);

      setSubmitMessage('Đã gửi giao dịch lên smart contract, đang chờ xác nhận...');
      await tx.wait();

      await createProduct(
        serverForm.title,
        serverForm.description,
        serverForm.pricePerHour,
        serverForm.ownerAddress,
        serverForm.condition,
        imageFile
      );

      setSubmitMessage('Đã thêm máy chủ thành công trên smart contract và backend. Đang chuyển về trang chủ...');
      setServerForm({
        title: '',
        description: '',
        pricePerHour: '',
        condition: '',
        ownerAddress: localStorage.getItem('trustrent.walletAddress') || '',
      });
      setImageFile(null);

      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (error) {
      if (error?.code === 4001) {
        setSubmitMessage('Bạn đã hủy giao dịch trên MetaMask.');
        return;
      }
      setSubmitMessage(error?.response?.data?.message || 'Không thể thêm máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full text-left max-w-5xl mx-auto mt-6 relative animate-in fade-in duration-300">

      {/* 🟧 TOAST NOTIFICATION CẢNH BÁO (CHỈ HIỆN KHI ĐANG Ở TAB MÁY ĐÃ THUÊ) */}
      {showToast && currentTab === 'my-rentals' && (
        <div className="fixed bottom-5 right-5 bg-amber-600 border border-amber-500 text-white p-4 rounded-xl shadow-2xl z-50 max-w-sm flex flex-col gap-1 animate-bounce">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>⚠️</span> CẢNH BÁO HẾT HẠN Phiên Dùng Thử
          </div>
          <p className="text-xs text-amber-100">Thời gian còn lại là 15p, hãy lưu lại dữ liệu!</p>
          <button
            onClick={() => setShowToast(false)}
            className="text-[10px] underline text-right text-amber-200 mt-1 hover:text-white"
          >
            Đã hiểu và đang sao lưu
          </button>
        </div>
      )}

      {currentTab === 'my-rentals' ? (
        /* ================== MENU 2: GIAO DIỆN "MÁY ĐÃ THUÊ" (QUAN LÝ VPS ĐÃ MUA) ================== */
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-6">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-blue-400">Không gian quản lý phiên thuê</h2>
              <p className="text-xs text-slate-400 mt-1">Giám sát thông số kỹ thuật và thời gian vận hành của máy chủ bạn đang thuê</p>
            </div>

            {serverData.status !== 'None' && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${serverData.status === 'Testing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                serverData.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' :
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                {serverData.status === 'Testing' ? 'Thử nghiệm (10p)' : serverData.status === 'Active' ? 'Active' : 'Đang Khiếu Nại'}
              </span>
            )}
          </div>

          {serverData.status === 'None' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
              <div className="text-4xl">📭</div>
              <div>
                <h4 className="text-sm font-bold text-slate-300">Bạn chưa có máy chủ nào đang hoạt động</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Hiện tại ví của bạn chưa thực hiện giao dịch cọc thuê máy nào hoặc phiên dùng thử cũ đã hết hạn.</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="mt-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md"
              >
                🛍️ Quay lại Trang chủ để tìm gói sản phẩm phù hợp
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">Thông tin cấu hình bàn giao</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">Địa chỉ IP VPS</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{serverData.ip}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Cổng Kết Nối (Port)</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{serverData.port}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Username hệ thống</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{serverData.username}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Password (Dùng một lần)</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{serverData.password}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col justify-center items-center text-center gap-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian thuê còn lại</h3>
                  <div className="text-4xl font-mono font-bold text-amber-400 bg-amber-950/20 px-6 py-3 rounded-2xl border border-amber-900/40 my-2">
                    {formatTime(timeLeft)}
                  </div>
                  <p className="text-[10px] text-slate-500">Hệ thống ngắt quyền truy cập On-chain khi đếm ngược kết thúc</p>
                </div>
              </div>

              {serverData.status === 'Testing' && (
                <div className="flex gap-4 border-t border-slate-800 pt-4 justify-end">
                  <button
                    onClick={handleReportError}
                    className="bg-slate-800 hover:bg-rose-900/30 hover:text-rose-400 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Báo lỗi
                  </button>
                  <button
                    onClick={handleConfirmOK}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-blue-950/40"
                  >
                    Hoạt động tốt
                  </button>
                </div>
              )}

              {showNegotiation && (
                <div className="border-t border-dashed border-slate-800 pt-4 mt-2 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-rose-950/10 border border-rose-900/30 p-4 rounded-xl">
                    <h4 className="text-sm font-bold text-rose-400 mb-1">Khung đàm phán hợp đồng</h4>
                    <p className="text-xs text-slate-400">Yêu cầu báo lỗi đã ghi nhận lên Blockchain. Vui lòng đợi Chủ máy đề xuất biểu phí đền bù giảm giá.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ================== MENU 3: GIAO DIỆN "KHÔNG GIAN CHỦ MÁY" (DÀNH CHO ĐẦU CUNG CẤP) ================== */
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-xl font-bold text-emerald-400">Bảng điều khiển cho thuê (Lessor Workspace)</h2>
            <p className="text-xs text-slate-400 mt-1">Đăng tải tài nguyên và xử lý trạng thái tài chính của các dòng máy</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* KHỐI 1: FORM ĐĂNG CẤU HÌNH */}
            <form onSubmit={(e) => e.preventDefault()} className="md:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">Khai báo cấu hình VPS cho thuê</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left">
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Tên gói máy chủ</label>
                  <input
                    type="text"
                    value={serverForm.title}
                    onChange={(e) => handleServerFormChange('title', e.target.value)}
                    placeholder="Ví dụ: Google Cloud VPS - High Performance"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Cấu hình CPU</label>
                  <input
                    type="text"
                    value={serverForm.description}
                    onChange={(e) => handleServerFormChange('description', e.target.value)}
                    placeholder="Ví dụ: 4 vCPU"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
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
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={serverForm.pricePerHour}
                    onChange={(e) => handleServerFormChange('pricePerHour', e.target.value)}
                    placeholder="Ví dụ: 10"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Địa chỉ ví nhận Token</label>
                  <input
                    type="text"
                    value={serverForm.ownerAddress}
                    onChange={(e) => handleServerFormChange('ownerAddress', e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Ảnh minh họa cụm máy</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {submitMessage && (
                <p className={`text-xs ${submitMessage.includes('thành công') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {submitMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreateServer}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer mt-2 shadow-lg shadow-emerald-950/20"
              >
                {isSubmitting ? 'Đang kích hoạt gói...' : 'Xác thực & Thêm máy lên Trang chủ'}
              </button>
            </form>

            {/* KHỐI 2: ĐIỀU KIỆN BAO GỒM CẢ EMPTY STATE CHO CHỦ MÁY */}
            <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
              {serverData.status === 'Dispute' ? (
                <>
                  <h3 className="text-sm font-bold text-rose-400 border-b border-slate-900 pb-2">Trung tâm xử lý khiếu nại</h3>
                  <div className="bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-lg text-left flex flex-col gap-1.5 animate-pulse">
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold w-max">TÍN HIỆU MỚI</span>
                    <p className="text-xs text-slate-300 font-medium">Khách thuê tại ví <span className="text-blue-400">0x71C...3A9b</span> vừa bấm báo lỗi hệ thống ở giai đoạn thử nghiệm.</p>
                  </div>
                  <p className="text-[11px] text-slate-500 text-left leading-relaxed">Vui lòng chọn phương án thương lượng:</p>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => alert("Đã gọi hàm executeDiscount() của Hạnh: Thực hiện chia tiền 80/20 thành công, kết thách tranh chấp!")}
                      className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 text-amber-400 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Đề xuất giảm giá 20%
                    </button>
                    <button
                      type="button"
                      onClick={() => alert("Đã gọi hàm cancelAndRefund() của Hạnh: Mở kho trả lại 100% Token cho khách và đóng hợp đồng thành công!")}
                      className="w-full bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 text-rose-400 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Đồng ý hủy hợp đồng, hoàn tiền
                    </button>
                  </div>
                </>
              ) : serverData.status === 'None' ? (
                <>
                  {/* CẬP NHẬT: THÊM NÚT "GỠ MÁY CHỦ" TRỰC QUAN KHI TRẠNG THÁI TRỐNG (NONE) */}
                  <div className="border-b border-slate-900 pb-2 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                      Đang treo tìm khách
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const isConfirm = window.confirm("Bạn có chắc chắn muốn gỡ gói máy chủ này xuống khỏi danh sách cho thuê không?\nHành động này sẽ hủy trạng thái hiển thị trên Chợ TrustRent.");
                        if (isConfirm) {
                          alert("Đang kích hoạt MetaMask để thực hiện hàm unlistPackage() trên Smart Contract của Hạnh...");
                        }
                      }}
                      className="text-[10px] font-bold text-red-400 hover:text-white border border-red-500/30 hover:bg-red-600/80 px-2 py-1 rounded-lg cursor-pointer transition-all shadow-sm"
                    >
                      🛑 Gỡ máy chủ
                    </button>
                  </div>

                  <div className="py-8 flex flex-col items-center justify-center text-center gap-3 bg-slate-900/30 border border-dashed border-slate-900 rounded-lg my-2">
                    <div className="text-2xl">⏳</div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400">Chưa có phiên thuê hoạt động</h4>
                      <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto mt-1 leading-relaxed">Đang đợi người dùng On-chain thực hiện cọc tiền để hiển thị dòng log.</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 text-center border-t border-slate-900 pt-2">
                    🟢 Sẵn sàng nhận kết nối On-chain
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-900 pb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Nhật ký vận hành máy chủ
                  </h3>
                  <p className="text-[11px] text-slate-400 text-left leading-relaxed">Danh sách các phiên thuê đang hoạt động ổn định trên hệ thống:</p>
                  <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                    <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-lg text-left text-xs flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-300">🖥️ Máy số 01 (Google Cloud)</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Running</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">Khách: <span className="text-blue-400 font-mono">0x71C...3A9b</span></p>
                      <p className="text-slate-400 text-[11px] mt-0.5">Thời gian thuê còn lại: <span className="text-amber-400 font-mono font-bold">05 giờ 12 phút</span></p>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 text-center border-t border-slate-900 pt-2">
                    🟢 Các cổng kiểm tra đều ổn định
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard; import React, { useEffect, useState } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../Service - Ân/productService';
import { createRentalFactoryContract, SEPOLIA_CHAIN_ID } from '../contracts/rentalFactoryConfig';

function Dashboard({ currentTab }) { // Đổi từ currentRole sang currentTab để quản lý luồng Menu tách biệt
  const navigate = useNavigate();

  // 1. STATE QUẢN LÝ THÔNG TIN PHIÊN THUÊ (DÀNH CHO TAB "MÁY ĐÃ THUÊ")
  const [serverData, setServerData] = useState({
    ip: '34.124.211.85',
    port: '22',
    username: 'trustrent_user',
    password: 'MockPassword2026@',
    status: 'None' // Các trạng thái: None, Testing, Active, Dispute
  });

  // Giả lập số giây còn lại từ API (Ví dụ: 9 phút 50 giây = 590 giây)
  const [timeLeft, setTimeLeft] = useState(590);
  const [showToast, setShowToast] = useState(false);
  const [showNegotiation, setShowNegotiation] = useState(false);

  // 2. STATE CHO FORM ĐĂNG MÁY (DÀNH CHO TAB "CHỦ MÁY")
  const [serverForm, setServerForm] = useState({
    title: '',
    description: '',
    pricePerHour: '',
    condition: '',
    ownerAddress: localStorage.getItem('trustrent.walletAddress') || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Logic chạy đồng hồ đếm ngược bằng JavaScript
  useEffect(() => {
    if (timeLeft <= 0 || serverData.status === 'None') return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;

        // Tự động bật Toast cảnh báo khi thời gian còn dưới 9 phút 45 giây (để dễ test demo)
        if (newTime === 585) {
          setShowToast(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, serverData.status]);

  // Hàm biến biến đổi số giây thành định dạng Phút:Giây (MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Hàm xử lý khi khách bấm [ Hoạt động tốt ]
  const handleConfirmOK = () => {
    setServerData(prev => ({ ...prev, status: 'Active' }));
    alert("Đã gọi hàm confirmServerOK() của Hạnh. Trạng thái đổi sang màu xanh đậm (Active)!");
  };

  // Hàm xử lý khi khách bấm [ Báo lỗi ]
  const handleReportError = () => {
    setServerData(prev => ({ ...prev, status: 'Dispute' }));
    setShowNegotiation(true);
  };

  const handleServerFormChange = (field, value) => {
    setServerForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateServer = async () => {
    if (!serverForm.title || !serverForm.pricePerHour || !serverForm.ownerAddress || !imageFile) {
      setSubmitMessage('Vui lòng nhập đủ tên gói, giá thuê, địa chỉ ví và ảnh đại diện.');
      return;
    }

    if (!window.ethereum) {
      setSubmitMessage('Vui lòng cài đặt MetaMask để gọi smart contract.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage('');

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        setSubmitMessage('Vui lòng chuyển MetaMask sang mạng Sepolia trước khi thêm máy chủ.');
        return;
      }

      const signer = await provider.getSigner();
      const factoryContract = createRentalFactoryContract(signer);
      const tokenAddress = await factoryContract.token();
      const tokenContract = new Contract(tokenAddress, ['function decimals() view returns (uint8)'], provider);

      let tokenDecimals = 18;
      try {
        tokenDecimals = Number(await tokenContract.decimals());
      } catch {
        tokenDecimals = 18;
      }

      const onChainPrice = parseUnits(String(serverForm.pricePerHour), tokenDecimals);
      const tx = await factoryContract.createServerPackage(serverForm.title, onChainPrice);

      setSubmitMessage('Đã gửi giao dịch lên smart contract, đang chờ xác nhận...');
      await tx.wait();

      await createProduct(
        serverForm.title,
        serverForm.description,
        serverForm.pricePerHour,
        serverForm.ownerAddress,
        serverForm.condition,
        imageFile
      );

      setSubmitMessage('Đã thêm máy chủ thành công trên smart contract và backend. Đang chuyển về trang chủ...');
      setServerForm({
        title: '',
        description: '',
        pricePerHour: '',
        condition: '',
        ownerAddress: localStorage.getItem('trustrent.walletAddress') || '',
      });
      setImageFile(null);

      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (error) {
      if (error?.code === 4001) {
        setSubmitMessage('Bạn đã hủy giao dịch trên MetaMask.');
        return;
      }
      setSubmitMessage(error?.response?.data?.message || 'Không thể thêm máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full text-left max-w-5xl mx-auto mt-6 relative animate-in fade-in duration-300">

      {/* 🟧 TOAST NOTIFICATION CẢNH BÁO (CHỈ HIỆN KHI ĐANG Ở TAB MÁY ĐÃ THUÊ) */}
      {showToast && currentTab === 'my-rentals' && (
        <div className="fixed bottom-5 right-5 bg-amber-600 border border-amber-500 text-white p-4 rounded-xl shadow-2xl z-50 max-w-sm flex flex-col gap-1 animate-bounce">
          <div className="flex items-center gap-2 font-bold text-sm">
            <span>⚠️</span> CẢNH BÁO HẾT HẠN Phiên Dùng Thử
          </div>
          <p className="text-xs text-amber-100">Thời gian còn lại là 15p, hãy lưu lại dữ liệu!</p>
          <button
            onClick={() => setShowToast(false)}
            className="text-[10px] underline text-right text-amber-200 mt-1 hover:text-white"
          >
            Đã hiểu và đang sao lưu
          </button>
        </div>
      )}

      {currentTab === 'my-rentals' ? (
        /* ================== MENU 2: GIAO DIỆN "MÁY ĐÃ THUÊ" (QUAN LÝ VPS ĐÃ MUA) ================== */
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-6">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-blue-400">Không gian quản lý phiên thuê</h2>
              <p className="text-xs text-slate-400 mt-1">Giám sát thông số kỹ thuật và thời gian vận hành của máy chủ bạn đang thuê</p>
            </div>

            {serverData.status !== 'None' && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${serverData.status === 'Testing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  serverData.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' :
                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                {serverData.status === 'Testing' ? 'Thử nghiệm (10p)' : serverData.status === 'Active' ? 'Active' : 'Đang Khiếu Nại'}
              </span>
            )}
          </div>

          {serverData.status === 'None' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
              <div className="text-4xl">📭</div>
              <div>
                <h4 className="text-sm font-bold text-slate-300">Bạn chưa có máy chủ nào đang hoạt động</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Hiện tại ví của bạn chưa thực hiện giao dịch cọc thuê máy nào hoặc phiên dùng thử cũ đã hết hạn.</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="mt-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md"
              >
                🛍️ Quay lại Trang chủ để tìm gói sản phẩm phù hợp
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">Thông tin cấu hình bàn giao</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">Địa chỉ IP VPS</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{serverData.ip}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Cổng Kết Nối (Port)</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{serverData.port}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Username hệ thống</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{serverData.username}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Password (Dùng một lần)</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{serverData.password}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col justify-center items-center text-center gap-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian thuê còn lại</h3>
                  <div className="text-4xl font-mono font-bold text-amber-400 bg-amber-950/20 px-6 py-3 rounded-2xl border border-amber-900/40 my-2">
                    {formatTime(timeLeft)}
                  </div>
                  <p className="text-[10px] text-slate-500">Hệ thống ngắt quyền truy cập On-chain khi đếm ngược kết thúc</p>
                </div>
              </div>

              {serverData.status === 'Testing' && (
                <div className="flex gap-4 border-t border-slate-800 pt-4 justify-end">
                  <button
                    onClick={handleReportError}
                    className="bg-slate-800 hover:bg-rose-900/30 hover:text-rose-400 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Báo lỗi
                  </button>
                  <button
                    onClick={handleConfirmOK}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-blue-950/40"
                  >
                    Hoạt động tốt
                  </button>
                </div>
              )}

              {showNegotiation && (
                <div className="border-t border-dashed border-slate-800 pt-4 mt-2 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-rose-950/10 border border-rose-900/30 p-4 rounded-xl">
                    <h4 className="text-sm font-bold text-rose-400 mb-1">Khung đàm phán hợp đồng</h4>
                    <p className="text-xs text-slate-400">Yêu cầu báo lỗi đã ghi nhận lên Blockchain. Vui lòng đợi Chủ máy đề xuất biểu phí đền bù giảm giá.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ================== MENU 3: GIAO DIỆN "KHÔNG GIAN CHỦ MÁY" (DÀNH CHO ĐẦU CUNG CẤP) ================== */
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-xl font-bold text-emerald-400">Bảng điều khiển cho thuê (Lessor Workspace)</h2>
            <p className="text-xs text-slate-400 mt-1">Đăng tải tài nguyên và xử lý trạng thái tài chính của các dòng máy</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* KHỐI 1: FORM ĐĂNG CẤU HÌNH */}
            <form onSubmit={(e) => e.preventDefault()} className="md:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">Khai báo cấu hình VPS cho thuê</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left">
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Tên gói máy chủ</label>
                  <input
                    type="text"
                    value={serverForm.title}
                    onChange={(e) => handleServerFormChange('title', e.target.value)}
                    placeholder="Ví dụ: Google Cloud VPS - High Performance"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Cấu hình CPU</label>
                  <input
                    type="text"
                    value={serverForm.description}
                    onChange={(e) => handleServerFormChange('description', e.target.value)}
                    placeholder="Ví dụ: 4 vCPU"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
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
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={serverForm.pricePerHour}
                    onChange={(e) => handleServerFormChange('pricePerHour', e.target.value)}
                    placeholder="Ví dụ: 10"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Địa chỉ ví nhận Token</label>
                  <input
                    type="text"
                    value={serverForm.ownerAddress}
                    onChange={(e) => handleServerFormChange('ownerAddress', e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">Ảnh minh họa cụm máy</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {submitMessage && (
                <p className={`text-xs ${submitMessage.includes('thành công') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {submitMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreateServer}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer mt-2 shadow-lg shadow-emerald-950/20"
              >
                {isSubmitting ? 'Đang kích hoạt gói...' : 'Xác thực & Thêm máy lên Trang chủ'}
              </button>
            </form>

            {/* KHỐI 2: ĐIỀU KIỆN BAO GỒM CẢ EMPTY STATE CHO CHỦ MÁY */}
            <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
              {serverData.status === 'Dispute' ? (
                <>
                  <h3 className="text-sm font-bold text-rose-400 border-b border-slate-900 pb-2">Trung tâm xử lý khiếu nại</h3>
                  <div className="bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-lg text-left flex flex-col gap-1.5 animate-pulse">
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold w-max">TÍN HIỆU MỚI</span>
                    <p className="text-xs text-slate-300 font-medium">Khách thuê tại ví <span className="text-blue-400">0x71C...3A9b</span> vừa bấm báo lỗi hệ thống ở giai đoạn thử nghiệm.</p>
                  </div>
                  <p className="text-[11px] text-slate-500 text-left leading-relaxed">Vui lòng chọn phương án thương lượng:</p>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => alert("Đã gọi hàm executeDiscount() của Hạnh: Thực hiện chia tiền 80/20 thành công, kết thách tranh chấp!")}
                      className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 text-amber-400 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Đề xuất giảm giá 20%
                    </button>
                    <button
                      type="button"
                      onClick={() => alert("Đã gọi hàm cancelAndRefund() của Hạnh: Mở kho trả lại 100% Token cho khách và đóng hợp đồng thành công!")}
                      className="w-full bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 text-rose-400 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Đồng ý hủy hợp đồng, hoàn tiền
                    </button>
                  </div>
                </>
              ) : serverData.status === 'None' ? (
                <>
                  {/* CẬP NHẬT: THÊM NÚT "GỠ MÁY CHỦ" TRỰC QUAN KHI TRẠNG THÁI TRỐNG (NONE) */}
                  <div className="border-b border-slate-900 pb-2 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                      Đang treo tìm khách
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const isConfirm = window.confirm("Bạn có chắc chắn muốn gỡ gói máy chủ này xuống khỏi danh sách cho thuê không?\nHành động này sẽ hủy trạng thái hiển thị trên Chợ TrustRent.");
                        if (isConfirm) {
                          alert("Đang kích hoạt MetaMask để thực hiện hàm unlistPackage() trên Smart Contract của Hạnh...");
                        }
                      }}
                      className="text-[10px] font-bold text-red-400 hover:text-white border border-red-500/30 hover:bg-red-600/80 px-2 py-1 rounded-lg cursor-pointer transition-all shadow-sm"
                    >
                      🛑 Gỡ máy chủ
                    </button>
                  </div>

                  <div className="py-8 flex flex-col items-center justify-center text-center gap-3 bg-slate-900/30 border border-dashed border-slate-900 rounded-lg my-2">
                    <div className="text-2xl">⏳</div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400">Chưa có phiên thuê hoạt động</h4>
                      <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto mt-1 leading-relaxed">Đang đợi người dùng On-chain thực hiện cọc tiền để hiển thị dòng log.</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 text-center border-t border-slate-900 pt-2">
                    🟢 Sẵn sàng nhận kết nối On-chain
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-900 pb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Nhật ký vận hành máy chủ
                  </h3>
                  <p className="text-[11px] text-slate-400 text-left leading-relaxed">Danh sách các phiên thuê đang hoạt động ổn định trên hệ thống:</p>
                  <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                    <div className="p-3 bg-slate-900/60 border border-slate-900 rounded-lg text-left text-xs flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-300">🖥️ Máy số 01 (Google Cloud)</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Running</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">Khách: <span className="text-blue-400 font-mono">0x71C...3A9b</span></p>
                      <p className="text-slate-400 text-[11px] mt-0.5">Thời gian thuê còn lại: <span className="text-amber-400 font-mono font-bold">05 giờ 12 phút</span></p>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-600 text-center border-t border-slate-900 pt-2">
                    🟢 Các cổng kiểm tra đều ổn định
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;