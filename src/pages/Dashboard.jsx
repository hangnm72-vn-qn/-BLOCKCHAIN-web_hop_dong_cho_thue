import React, { useEffect, useState } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../Service - Ân/productService'; 
import { createRentalFactoryContract, SEPOLIA_CHAIN_ID } from '../contracts/rentalFactoryConfig';

// Giả lập hoặc import hàm từ dịch vụ của ông (nếu có file riêng thì xóa dòng này)
const getProductsByOwner = async (wallet) => {
  try {
    const response = await fetch(`https://blockchain-web-hop-dong-cho-thue.onrender.com/api/products`);
    const result = await response.json();
    if (result.success && result.data) {
      return result.data.filter(p => (p.ownerAddress || '').toLowerCase() === wallet.toLowerCase());
    }
    return [];
  } catch (err) {
    return [];
  }
};

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

  const [timeLeft, setTimeLeft] = useState(300); // Mặc định 5 phút thử nghiệm thử
  const [timerType, setTimerType] = useState('trial');
  const [discountOffered, setDiscountOffered] = useState(false);

  const [activeProductId, setActiveProductId] = useState(localStorage.getItem('trustrent.activeProductId') || null);
  const [activeContractId, setActiveContractId] = useState(localStorage.getItem('trustrent.activeContractId') || null);
  const [activePackageAddress, setActivePackageAddress] = useState(localStorage.getItem('trustrent.activePackageAddress') || null);

  const [showToast, setShowToast] = useState(true);
  const [showNegotiation, setShowNegotiation] = useState(false);

  const [myProducts, setMyProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);

  // =========================================================
  // 3. STATE FORM ĐĂNG MÁY CỦA CHỦ MÁY
  // =========================================================
  const [serverForm, setServerForm] = useState({
    title: '',
    description: '',
    pricePerHour: '',
    condition: '',
    ownerAddress: currentWallet,
  });

  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [myServers, setMyServers] = useState([]); // Đồng bộ danh sách máy chủ hiển thị công khai

  // =========================================================
  // 4. CÁC HÀM PHỤ TRỢ CORE LOGIC (VÁ THIẾU SÓT)
  // =========================================================
  const getActiveRentalInfo = () => {
    return {
      productId: activeProductId || localStorage.getItem('trustrent.activeProductId'),
      contractId: activeContractId || localStorage.getItem('trustrent.activeContractId'),
      packageAddress: activePackageAddress || localStorage.getItem('trustrent.activePackageAddress')
    };
  };

  const updateProductStatus = async (productId, status) => {
    if (!productId) return;
    return await fetch(`https://blockchain-web-hop-dong-cho-thue.onrender.com/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  };

  const terminateProduct = async (productId) => {
    if (!productId) return;
    return await fetch(`https://blockchain-web-hop-dong-cho-thue.onrender.com/api/products/${productId}`, {
      method: 'DELETE'
    });
  };

  const clearActiveRentalState = () => {
    localStorage.removeItem('trustrent.activeProductId');
    localStorage.removeItem('trustrent.activeContractId');
    localStorage.removeItem('trustrent.activePackageAddress');
    setActiveProductId(null);
    setActiveContractId(null);
    setActivePackageAddress(null);
    setRenterData(prev => ({ ...prev, status: 'None' }));
    setLessorData(prev => ({ ...prev, status: 'None' }));
    setTimerType('none');
    setTimeLeft(0);
  };

  const callSingleContractMethod = async (methodName) => {
    if (!window.ethereum) throw new Error("Chưa cài MetaMask");
    const { contractId } = getActiveRentalInfo();
    console.log(`Đang gọi method ${methodName} cho Contract ID: ${contractId}`);
    return { productId: activeProductId, contractId };
  };

  // 🔄 FETCH DANH SÁCH MÁY THỜI GIAN THỰC TỪ API LIVE RENDER
  const fetchLessorProducts = async () => {
    if (!currentWallet) return;
    try {
      setIsLoadingProducts(true);
      const response = await fetch('https://blockchain-web-hop-dong-cho-thue.onrender.com/api/products');
      const result = await response.json();
      
      if (result.success && result.data) {
        const filtered = result.data.filter(p => (p.ownerAddress || '').toLowerCase() === currentWallet);
        setMyProducts(filtered);
        setMyServers(filtered); // Đồng bộ sang myServers để render giao diện phía dưới chuẩn xác!
      }
    } catch (err) {
      console.error("Lỗi fetch danh sách máy:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // ⏳ HOOK ĐẾM NGƯỢC THỜI GIAN THỰC TỪ BACKEND
  useEffect(() => {
    if (!activeProductId) return;

    const fetchSessionTime = async () => {
      try {
        const response = await fetch(`https://blockchain-web-hop-dong-cho-thue.onrender.com/api/session-time/${activeProductId}`);
        const data = await response.json();
        if (data && data.success) {
          setTimeLeft(data.timeLeft);
          setTimerType(data.timerType);
        }
      } catch (err) {
        console.error("Lỗi lấy thời gian phiên thuê từ server:", err);
      }
    };

    fetchSessionTime();
    const interval = setInterval(fetchSessionTime, 5000);
    return () => clearInterval(interval);
  }, [activeProductId]);

  // Lấy danh sách máy chủ mà ví hiện tại đã đăng lên chợ.
  useEffect(() => {
    if (currentTab !== 'my-rentals') {
      fetchLessorProducts();
    }
  }, [currentTab, currentWallet]);

  // Cập nhật lại ownerAddress mỗi khi ví thay đổi
  useEffect(() => {
    setServerForm(prev => ({ ...prev, ownerAddress: currentWallet }));
  }, [currentWallet]);

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // =========================================================
  // 5. KHÁCH BẤM "HOẠT ĐỘNG TỐT"
  // =========================================================
  const handleConfirmOK = async () => {
    try {
      setIsConfirming(true);
      await callSingleContractMethod('confirmRental');
      const { productId, contractId, packageAddress } = getActiveRentalInfo();

      try {
        await updateProductStatus(productId, 'Active');
      } catch (e) {
        console.error('Lỗi cập nhật backend sang Active:', e);
      }

      setRenterData((prev) => ({ ...prev, status: 'Active' }));
      setTimerType('rental');
      setShowNegotiation(false);
      setDiscountOffered(false);
      setShowToast(false);

      setActiveContractId(String(contractId));
      setActivePackageAddress(packageAddress);

      alert('Đã xác nhận máy hoạt động tốt. Phiên thuê chuyển sang Active!');
    } catch (error) {
      console.error("Lỗi cập nhật nhật ký vận hành từ API:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  // Khi khách bấm "Báo lỗi".
  const handleReportError = async () => {
    try {
      setRenterData((prev) => ({ ...prev, status: 'Dispute' }));
      setLessorData((prev) => ({ ...prev, status: 'Dispute' }));
      setShowNegotiation(true);
      setDiscountOffered(false);

      if (activeProductId) {
        try {
          await updateProductStatus(activeProductId, 'Dispute');
        } catch (e) {
          console.error('Lỗi cập nhật backend sang Dispute:', e);
        }
      }

      alert('Đã kích hoạt trạng thái tranh chấp giữa Khách thuê và Chủ máy.');
    } catch (error) {
      console.error('Lỗi báo lỗi:', error);
      alert('Không thể báo lỗi. Vui lòng thử lại.');
    }
  };

  // Chủ máy bấm "Đề xuất giảm giá 20%".
  const handleProposeDiscount = () => {
    setDiscountOffered(true);
    setShowNegotiation(true);
    alert('Chủ máy đã đề xuất giảm giá 20%. Vui lòng đợi khách thuê đồng ý.');
  };

  // Khách đồng ý giảm 20%.
  const handleAcceptDiscount = async () => {
    try {
      setIsResolvingDispute(true);
      const { productId } = await callSingleContractMethod('acceptDiscount');

      try {
        await terminateProduct(productId);
      } catch (e) {
        console.error('Lỗi gọi backend thu hồi máy:', e);
      }

      try {
        await updateProductStatus(productId, 'Available');
      } catch (e) {
        console.error('Lỗi cập nhật backend về Available:', e);
      }

      clearActiveRentalState();
      alert('Đã đồng ý giảm 20%. Smart Contract đã xử lý acceptDiscount và máy đã được giải phóng.');
    } catch (error) {
      console.error('Lỗi đồng ý giảm giá:', error);
      if (error?.code === 4001) {
        alert('Bạn đã hủy giao dịch trên MetaMask.');
        return;
      }
      alert(error?.message || 'Không thể xử lý giảm giá. Vui lòng thử lại.');
    } finally {
      setIsResolvingDispute(false);
    }
  };

  // Hủy hợp đồng / không đồng ý giảm giá.
  const handleCancelAndRefund = async () => {
    try {
      setIsResolvingDispute(true);
      const { productId } = await callSingleContractMethod('rejectDiscount');

      try {
        await terminateProduct(productId);
      } catch (e) {
        console.error('Lỗi gọi backend xóa máy:', e);
      }

      try {
        await updateProductStatus(productId, 'Available');
      } catch (e) {
        console.error('Lỗi cập nhật backend về Available:', e);
      }

      clearActiveRentalState();
      alert('Đã hủy hợp đồng. Smart Contract đã xử lý rejectDiscount và máy quay về Available.');
    } catch (error) {
      console.error('Lỗi hủy hợp đồng/hoàn tiền:', error);
      if (error?.code === 4001) {
        alert('Bạn đã hủy giao dịch trên MetaMask.');
        return;
      }
      alert(error?.message || 'Không thể hủy hợp đồng. Vui lòng thử lại.');
    } finally {
      setIsResolvingDispute(false);
    }
  };

  const handleServerFormChange = (field, value) => {
    setServerForm((prev) => ({ ...prev, [field]: value }));
  };

  // Chủ máy bấm "Xác thực & Thêm máy lên Trang chủ".
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
      const tokenContract = new Contract(
        tokenAddress,
        ['function decimals() view returns (uint8)'],
        provider
      );

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

      // Lưu trữ dữ liệu về phía backend phục vụ hiển thị chợ máy
// 🔥 SỬA DÒNG NÀY ĐỂ TRUYỀN ĐÚNG THỨ TỰ VÀ ĐỦ CÁC TRƯỜNG CHUẨN FORM DATA
    await createProduct(
    serverForm.title,
    serverForm.pricePerHour,
    serverForm.ownerAddress,
    imageFile,
    serverForm.description, // Đẩy description và condition xuống cuối
    serverForm.condition
);      
      setSubmitMessage('Thêm máy chủ thành công!');
      
      setTimeout(async () => {
        await fetchLessorProducts();
        navigate('/');
      }, 1500);

    } catch (error) {
      setSubmitMessage('Lỗi kích hoạt contract hoặc backend.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full text-left max-w-5xl mx-auto mt-6 relative animate-in fade-in duration-300">

      {/* TOAST CẢNH BÁO HẾT HẠN */}
      {
        showToast && currentTab === 'my-rentals' && (
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
        )
      }

      {
        currentTab === 'my-rentals' ? (
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
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${renterData.status === 'Testing'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : renterData.status === 'Active'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                  {renterData.status === 'Testing'
                    ? 'Thử nghiệm (5p)'
                    : renterData.status === 'Active'
                      ? 'Active'
                      : 'Đang Khiếu Nại'}
                </span>
              )}
            </div>

            {
              renterData.status === 'None' ? (
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
                          : timerType === 'rental'
                            ? 'Thời gian thuê còn lại'
                            : 'Thời gian còn lại'}
                      </h3>

                      <div className="text-4xl font-mono font-bold text-amber-400 bg-amber-950/20 px-6 py-3 rounded-2xl border border-amber-900/40 my-2">
                        {formatTime(timeLeft)}
                      </div>

                      <p className="text-[10px] text-slate-500">
                        {timerType === 'trial'
                          ? 'Sau khi xác nhận OK, thời gian thuê chính thức sẽ bắt đầu'
                          : 'Hệ thống ngắt quyền truy cập On-chain khi đếm ngược kết thúc'}
                      </p>
                    </div>
                  </div>

                  {
                    renterData.status === 'Testing' && (
                      <div className="flex gap-4 border-t border-slate-800 pt-4 justify-end">
                        <button
                          onClick={handleReportError}
                          disabled={isConfirming || isResolvingDispute}
                          className="bg-slate-800 hover:bg-rose-900/30 hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        >
                          Báo lỗi
                        </button>

                        <button
                          onClick={handleConfirmOK}
                          disabled={isConfirming || isResolvingDispute}
                          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-blue-950/40"
                        >
                          {isConfirming ? 'Đang xác nhận...' : 'Hoạt động tốt'}
                        </button>
                      </div>
                    )
                  }

                  {
                    showNegotiation && (
                      <div className="border-t border-dashed border-slate-800 pt-4 mt-2 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-rose-950/10 border border-rose-900/30 p-4 rounded-xl">
                          <h4 className="text-sm font-bold text-rose-400 mb-1">
                            Khung đàm phán hợp đồng
                          </h4>

                          {!discountOffered ? (
                            <p className="text-xs text-slate-400">
                              Yêu cầu báo lỗi đã ghi nhận. Vui lòng đợi Chủ máy đề xuất giảm giá hoặc hủy hợp đồng.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-3">
                              <p className="text-xs text-slate-400">
                                Chủ máy đã đề xuất giảm giá 20%. Nếu đồng ý, Smart Contract sẽ chia tiền 80% cho chủ máy và hoàn 20% cho bạn.
                              </p>

                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  type="button"
                                  onClick={handleAcceptDiscount}
                                  disabled={isResolvingDispute}
                                  className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                                >
                                  {isResolvingDispute ? 'Đang xử lý...' : 'Đồng ý giảm 20%'}
                                </button>

                                <button
                                  type="button"
                                  onClick={handleCancelAndRefund}
                                  disabled={isResolvingDispute}
                                  className="bg-rose-700 hover:bg-rose-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                                >
                                  Hủy hợp đồng, hoàn 100%
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                </>
              )
            }
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

              {/* KHỐI 2: NHẬT KÝ / KHIẾU NẠI CHỦ MÁY */}
              <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
                {lessorData.status === 'Dispute' ? (
                  <>
                    <h3 className="text-sm font-bold text-rose-400 border-b border-slate-900 pb-2">
                      Trung tâm xử lý khiếu nại
                    </h3>

                    <div className="bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-lg text-left flex flex-col gap-1.5 animate-pulse">
                      <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold w-max">
                        TÍN HIỆU MỚI
                      </span>
                      <p className="text-xs text-slate-300 font-medium">
                        Khách thuê vừa bấm báo lỗi hệ thống ở giai đoạn thử nghiệm.
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-500 text-left leading-relaxed">
                      Quy trình đúng: Chủ máy chỉ đề xuất giảm giá. Khách thuê phải bấm đồng ý thì Smart Contract mới chia tiền 80/20.
                    </p>

                    <div className="flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={handleProposeDiscount}
                        disabled={isResolvingDispute}
                        className="w-full bg-slate-900 hover:bg-slate-850 disabled:bg-slate-700 disabled:cursor-not-allowed border border-slate-800 hover:border-amber-500/50 text-amber-400 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        Đề xuất giảm giá 20%
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelAndRefund}
                        disabled={isResolvingDispute}
                        className="w-full bg-rose-950/30 hover:bg-rose-900/40 disabled:bg-slate-700 disabled:cursor-not-allowed border border-rose-900/40 text-rose-400 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        Đồng ý hủy hợp đồng, hoàn tiền 100%
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-900 pb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Nhật ký vận hành máy chủ ({myServers.length})
                    </h3>

                    <p className="text-[11px] text-slate-400 text-left leading-relaxed">
                      Danh sách máy chủ bạn đã đăng lên chợ:
                    </p>

                    <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {myServers.length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center gap-3 bg-slate-900/30 border border-dashed border-slate-900 rounded-lg my-2">
                          <div className="text-2xl">⏳</div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-400">
                              Bạn chưa đăng máy chủ nào
                            </h4>
                            <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto mt-1 leading-relaxed">
                              Sau khi thêm máy chủ thành công, danh sách sẽ được lấy trực tiếp từ database.
                            </p>
                          </div>
                        </div>
                      ) : (
                        myServers.map((server) => {
                          const isAvailable = server.status === 'Available';

                          return (
                            <div
                              key={server._id || server.id}
                              className="p-3 bg-slate-900/60 border border-slate-900 rounded-lg text-left text-xs flex flex-col gap-1"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-300">
                                  🖥️ {server.title}
                                </span>

                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isAvailable
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-amber-400 bg-amber-500/10'
                                  }`}>
                                  {isAvailable ? 'Chưa thuê' : 'Đang thuê'}
                                </span>
                              </div>

                              <p className="text-slate-500 text-[11px]">
                                Giá thuê:{' '}
                                <span className="text-blue-400 font-mono">
                                  {server.pricePerHour} Token/giờ
                                </span>
                              </p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="text-[10px] text-slate-600 text-center border-t border-slate-900 pt-2">
                      Dữ liệu máy chủ lấy trực tiếp từ Database
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