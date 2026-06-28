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

  const currentWallet = (
    walletAddress ||
    localStorage.getItem('trustrent.walletAddress') ||
    ''
  ).toLowerCase();

  // =========================================================
  // 1. STATE KHÁCH THUÊ
  // =========================================================
  const [renterData, setRenterData] = useState({
    ip: localStorage.getItem('trustrent.rentalIp') || '',
    port: localStorage.getItem('trustrent.rentalPort') || '',
    username: localStorage.getItem('trustrent.rentalUsername') || '',
    password: localStorage.getItem('trustrent.rentalPassword') || '',
    status: 'None'
  });

  const [timeLeft, setTimeLeft] = useState(0);
  const [timerType, setTimerType] = useState('none');

  const [activeProductId, setActiveProductId] = useState(
    localStorage.getItem('trustrent.activeProductId') || null
  );

  const [activeContractId, setActiveContractId] = useState(
    localStorage.getItem('trustrent.activeContractId') || null
  );

  const [activePackageAddress, setActivePackageAddress] = useState(
    localStorage.getItem('trustrent.activePackageAddress') || null
  );

  const [rentalConfirmed, setRentalConfirmed] = useState(
    localStorage.getItem('trustrent.rentalConfirmed') === 'true'
  );

  const [showToast, setShowToast] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);

  // =========================================================
  // 2. STATE FORM CHỦ MÁY
  // =========================================================
  const [serverForm, setServerForm] = useState({
    title: '',
    description: '',
    pricePerHour: '',
    condition: '',
    username: '',
    password: '',
    ownerAddress: currentWallet, // Sử dụng chuẩn biến currentWallet vừa lấy ở trên
  });

  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const [myServers, setMyServers] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // =========================================================
  // 3. HÀM DỌN PHIÊN THUÊ
  // =========================================================
  const clearActiveRentalState = () => {
    setRenterData({
      ip: '',
      port: '',
      username: '',
      password: '',
      status: 'None',
    });

    setTimeLeft(0);
    setTimerType('none');
    setShowToast(false);
    setRentalConfirmed(false);

    setActiveProductId(null);
    setActiveContractId(null);
    setActivePackageAddress(null);

    localStorage.removeItem('trustrent.activeProductId');
    localStorage.removeItem('trustrent.activeContractId');
    localStorage.removeItem('trustrent.activePackageAddress');
    localStorage.removeItem('trustrent.rentalIp');
    localStorage.removeItem('trustrent.rentalPort');
    localStorage.removeItem('trustrent.rentalUsername');
    localStorage.removeItem('trustrent.rentalPassword');
    localStorage.removeItem('trustrent.rentalConfirmed');
  };

  const getActiveRentalInfo = () => {
    return {
      productId: activeProductId || localStorage.getItem('trustrent.activeProductId'),
      contractId: activeContractId || localStorage.getItem('trustrent.activeContractId'),
      packageAddress:
        activePackageAddress || localStorage.getItem('trustrent.activePackageAddress'),
    };
  };

  const callSingleContractMethod = async (methodName) => {
    const { productId, contractId, packageAddress } = getActiveRentalInfo();

    if (!productId) {
      throw new Error('Không tìm thấy sản phẩm đang thuê.');
    }

    if (!contractId) {
      throw new Error('Không tìm thấy contractId của phiên thuê.');
    }

    if (!packageAddress) {
      throw new Error('Không tìm thấy địa chỉ contract gói máy.');
    }

    if (!window.ethereum) {
      throw new Error('Vui lòng cài đặt MetaMask.');
    }

    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (BigInt(network.chainId) !== SEPOLIA_CHAIN_ID) {
      throw new Error('Vui lòng chuyển MetaMask sang mạng Sepolia.');
    }

    const signer = await provider.getSigner();
    const single = createSingleContract(packageAddress, signer);

    if (typeof single[methodName] !== 'function') {
      throw new Error(`Smart contract hiện chưa có hàm ${methodName}().`);
    }

    const tx = await single[methodName](Number(contractId));
    await tx.wait();

    return {
      productId,
      contractId,
      packageAddress,
    };
  };

  // =========================================================
  // 4. ĐỒNG BỘ VÍ VÀ DANH SÁCH MÁY CHỦ
  // =========================================================
  useEffect(() => {
    if (currentWallet) {
      setServerForm((prev) => ({
        ...prev,
        ownerAddress: currentWallet,
      }));

      fetchLessorProducts();
    }
  }, [currentWallet]);

  // =========================================================
 // =========================================================
  // 5. LẤY THỜI GIAN PHIÊN THUÊ TỪ BACKEND
  // =========================================================
  useEffect(() => {
    // ⚙️ CHUYỂN LOGIC CHECK VÀO ĐÂY: Nếu không có ID hợp lệ -> Reset sạch trạng thái và THOÁT LUÔN!
    if (!activeProductId || activeProductId === 'undefined' || activeProductId === 'null') {
      setTimeLeft(0);
      setTimerType('none');
      setShowToast(false);
      setRenterData((prev) => ({ ...prev, status: 'None' }));
      setRentalConfirmed(false);
      localStorage.removeItem('trustrent.rentalConfirmed');
      return; 
    }

    const fetchSessionTime = async () => {
      try {
        const data = await getSessionTime(activeProductId);
        if (!data) return;

        const apiStatus = data.status;
        const trialTimeLeft = Number(data.trialTimeLeft ?? 0);
        const rentalTimeLeft = Number(data.rentalTimeLeft ?? 0);
        const fallbackTimeLeft = Number(data.timeLeft ?? 0);

        if (apiStatus === 'Available') {
          clearActiveRentalState();
          return;
        }

        if (apiStatus === 'Unavailable' && trialTimeLeft > 0 && !rentalConfirmed) {
          setTimeLeft(trialTimeLeft);
          setTimerType('trial');
          setRenterData(prev => ({ ...prev, status: 'Unavailable' }));
          setShowToast(trialTimeLeft <= 60 && trialTimeLeft > 0);
          return;
        }

        if (apiStatus === 'Unavailable') {
          const displayTimeLeft = rentalTimeLeft > 0 ? rentalTimeLeft : fallbackTimeLeft;
          if (displayTimeLeft <= 0) {
            clearActiveRentalState();
            return;
          }
          setTimeLeft(displayTimeLeft);
          setTimerType('rental');
          setRenterData(prev => ({ ...prev, status: 'Unavailable' }));
          setShowToast(displayTimeLeft <= 900 && displayTimeLeft > 0);
        }
      } catch (err) {
        console.error('Lỗi lấy thời gian phiên thuê từ server:', err);
      }
    };

    fetchSessionTime();
    const interval = setInterval(fetchSessionTime, 5000);
    return () => clearInterval(interval);
  }, [activeProductId, rentalConfirmed]); // ✅ Chỉ 1 dấu đóng duy nhất, chuẩn chỉ cấu trúc!
  // =========================================================
  // 6. KIỂM TRA MẠNG METAMASK
  // =========================================================
  useEffect(() => {
    const checkNetworkRealTime = async () => {
      if (!window.ethereum) return;

      try {
        const provider = new BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();

        if (BigInt(network.chainId) === SEPOLIA_CHAIN_ID) {
          setSubmitMessage('');
        } else {
          setSubmitMessage('Vui lòng chuyển mạng ví sang Sepolia Testnet!');
        }
      } catch (err) {
        console.error('Lỗi đọc mạng realtime:', err);
      }
    };

    checkNetworkRealTime();

    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetworkRealTime);
    }

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('chainChanged', checkNetworkRealTime);
      }
    };
  }, [currentWallet]);

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  const fetchLessorProducts = async () => {
    if (!currentWallet) return;

    setIsLoadingProducts(true);

    try {
      const products = await getProductsByOwner(currentWallet);
      setMyServers(products || []);
    } catch (error) {
      console.error('Lỗi lấy danh sách máy chủ sở hữu:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleServerFormChange = (field, value) => {
    setServerForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // =========================================================
  // 7. KHÁCH BẤM ĐỒNG Ý / HOẠT ĐỘNG TỐT
  // =========================================================
  const handleConfirmOK = async () => {
    try {
      setIsConfirming(true);

      const { productId, contractId, packageAddress } =
        await callSingleContractMethod('confirmRental');

      try {
        await updateProductStatus(productId, 'Unavailable');
      } catch (e) {
        console.error('Lỗi cập nhật backend sang Unavailable:', e);
      }

      localStorage.setItem('trustrent.rentalConfirmed', 'true');
      setRentalConfirmed(true);

      setRenterData((prev) => ({
        ...prev,
        status: 'Unavailable',
      }));

      setTimerType('rental');
      setShowToast(false);

      setActiveContractId(String(contractId));
      setActivePackageAddress(packageAddress);

      alert('Đã xác nhận máy hoạt động tốt. Phiên thuê chính thức sẽ tiếp tục.');
    } catch (error) {
      console.error('Lỗi xác nhận OK:', error);

      if (error?.code === 4001) {
        alert('Bạn đã hủy giao dịch trên MetaMask.');
        return;
      }

      alert(error?.message || 'Không thể xác nhận OK. Vui lòng thử lại.');
    } finally {
      setIsConfirming(false);
    }
  };

  // =========================================================
  // 8. KHÁCH BẤM HỦY / HOÀN TIỀN
  // =========================================================
  const handleCancelAndRefund = async () => {
    try {
      setIsResolvingDispute(true);

      const { productId } = await callSingleContractMethod('cancelByRenter');

      try {
        await terminateProduct(productId);
      } catch (e) {
        console.error('Lỗi gọi backend terminateProduct:', e);
      }

      try {
        await updateProductStatus(productId, 'Available');
      } catch (e) {
        console.error('Lỗi cập nhật backend về Available:', e);
      }

      clearActiveRentalState();

      alert('Đã hủy phiên thử nghiệm và hoàn tiền 100%. Máy đã được giải phóng.');
    } catch (error) {
      console.error('Lỗi hủy/hoàn tiền:', error);

      if (error?.code === 4001) {
        alert('Bạn đã hủy giao dịch trên MetaMask.');
        return;
      }

      alert(error?.message || 'Không thể hủy/hoàn tiền. Vui lòng thử lại.');
    } finally {
      setIsResolvingDispute(false);
    }
  };

  // =========================================================
  // 9. CHỦ MÁY ĐĂNG MÁY MỚI
  // =========================================================
  const handleCreateServer = async () => {
    if (
      !serverForm.title ||
      !serverForm.pricePerHour ||
      !serverForm.ownerAddress ||
      !serverForm.username ||
      !serverForm.password ||
      !imageFile
    ) {
      setSubmitMessage(
        'Vui lòng nhập đủ tên gói, giá thuê, địa chỉ ví, username, password và ảnh đại diện.'
      );
      return;
    }

    if (!window.ethereum) {
      setSubmitMessage('Vui lòng cài đặt MetaMask để gọi smart contract.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitMessage('Đang khởi tạo kết nối Web3...');

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (BigInt(network.chainId) !== SEPOLIA_CHAIN_ID) {
        setSubmitMessage('Vui lòng chuyển mạng ví sang Sepolia Testnet!');
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

      const onChainPrice = parseUnits(
        String(serverForm.pricePerHour),
        tokenDecimals
      );

     const tx = await factoryContract.createServerPackage(
        serverForm.title,
        onChainPrice
      );

      setSubmitMessage('Đã gửi giao dịch lên smart contract, đang chờ xác nhận...');
      const receipt = await tx.wait(); // 🔥 Giữ lại biến receipt để bóc tách log

      setSubmitMessage(
        'Blockchain xác nhận. Đang phân tích địa chỉ gói để lưu lên database...'
      );
      let contractAddress = '';
      if (receipt.logs && receipt.logs.length > 0) {
        // Lấy địa chỉ của Contract phát ra log cuối hoặc log chứa địa chỉ mới deploy
        contractAddress = receipt.logs[0].address; 
      }

      // Phương án dự phòng nếu log nằm ở vị trí khác hoặc ông đã lưu sẵn cách lấy contract cũ:
      if (!contractAddress) {
        contractAddress = receipt.contractAddress || '';
      }

      console.log('Địa chỉ Package Contract vừa tạo:', contractAddress);
// 2. Gửi dữ liệu đồng bộ lên Backend Database
      const backendResult = await createProduct({
        title: serverForm.title,
        description: `Cấu hình: ${serverForm.description || '4 vCPU'}, ${serverForm.condition || '16GB RAM'}. Tài khoản: ${serverForm.username}`,
        pricePerHour: serverForm.pricePerHour,
        ownerAddress: serverForm.ownerAddress,
        condition: serverForm.condition,
        username: serverForm.username, 
        password: serverForm.password, 
        images: imageFile,             
        packageAddress: contractAddress // ✅ Bây giờ biến contractAddress đã tồn tại ở trên, không bao giờ lỗi nữa!
      });

      if (!backendResult?.success) {
        throw new Error('Lưu dữ liệu máy chủ lên Backend thất bại!');
      }

      if (currentWallet) {
        localStorage.setItem(`trustrent.isLessor.${currentWallet}`, 'true');
      }

      await fetchLessorProducts();

      setSubmitMessage('🎉 Đăng máy chủ thành công! Đang chuyển về trang chủ...');

      setServerForm({
        title: '',
        description: '',
        pricePerHour: '',
        condition: '',
        username: '',
        password: '',
        ownerAddress: currentWallet,
      });

      setImageFile(null);

      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (error) {
      console.error('Lỗi trong quá trình đăng máy chủ:', error);

      if (error?.code === 4001) {
        setSubmitMessage('Bạn đã hủy giao dịch trên MetaMask.');
        return;
      }

      setSubmitMessage(
        error?.response?.data?.message ||
        error?.reason ||
        error?.message ||
        'Không thể thêm máy chủ. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
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
            type="button"
            onClick={() => setShowToast(false)}
            className="text-[10px] underline text-right text-amber-200 mt-1 hover:text-white"
          >
            Đã hiểu và đang sao lưu
          </button>
        </div>
      )}

      {currentTab === 'my-rentals' ? (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-6">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-blue-400">
                Không gian quản lý phiên thuê
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Giám sát thông số kỹ thuật và thời gian vận hành của máy chủ bạn đang thuê
              </p>
            </div>

            {renterData &&
              renterData.status &&
              renterData.status !== 'Available' &&
              renterData.status !== 'None' && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${timerType === 'trial'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                    }`}
                >
                  {timerType === 'trial' ? 'Thử nghiệm (10p)' : 'Đang thuê'}
                </span>
              )}
          </div>

          {!renterData ||
            renterData.status === 'None' ||
            renterData.status === 'Available' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
              <div className="text-4xl">📭</div>
              <div>
                <h4 className="text-sm font-bold text-slate-300">
                  Bạn chưa có máy chủ nào đang hoạt động
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Hiện tại ví của bạn chưa thực hiện giao dịch thuê máy nào hoặc phiên dùng thử cũ đã hết hạn.
                </p>
              </div>

              <button
                type="button"
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
                  <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">
                    Thông tin cấu hình bàn giao
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-500 mb-1">Địa chỉ IP VPS</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                        {renterData.ip || 'Đang cập nhật'}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 mb-1">Cổng Kết Nối (Port)</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                        {renterData.port || 'Đang cập nhật'}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 mb-1">Username hệ thống</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                        {renterData.username || 'Đang cập nhật'}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 mb-1">Password</p>
                      <p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                        {renterData.password || 'Đang cập nhật'}
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
                      ? 'Vui lòng kiểm tra kỹ kết nối trong thời gian dùng thử.'
                      : 'Hệ thống ngắt quyền truy cập khi đếm ngược kết thúc.'}
                  </p>
                </div>
              </div>

              {renterData.status === 'Unavailable' &&
                timerType === 'trial' &&
                !rentalConfirmed && (
                  <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 mt-2">
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-amber-400">
                          Xác nhận tình trạng máy chủ thử nghiệm
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Nếu máy hoạt động tốt, chọn "Đồng ý". Nếu máy lỗi hoặc không kết nối được, chọn "Hủy bỏ".
                        </p>
                      </div>

                      <div className="flex gap-3 justify-end shrink-0">
                        <button
                          type="button"
                          onClick={handleCancelAndRefund}
                          disabled={isConfirming || isResolvingDispute}
                          className="bg-rose-700 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md"
                        >
                          {isResolvingDispute ? 'Đang hủy...' : '❌ Hủy bỏ'}
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmOK}
                          disabled={isConfirming || isResolvingDispute}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-950/40"
                        >
                          {isConfirming ? 'Đang xác nhận...' : '✅ Đồng ý'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-xl font-bold text-emerald-400">
              Bảng điều khiển cho thuê
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Đăng tải tài nguyên và xử lý trạng thái của các dòng máy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="md:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4"
            >
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">
                Khai báo cấu hình VPS cho thuê
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left">
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">
                    Tên gói máy chủ
                  </label>
                  <input
                    type="text"
                    value={serverForm.title}
                    onChange={(e) =>
                      handleServerFormChange('title', e.target.value)
                    }
                    placeholder="Ví dụ: Google Cloud VPS - High Performance"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Cấu hình CPU
                  </label>
                  <input
                    type="text"
                    value={serverForm.description}
                    onChange={(e) =>
                      handleServerFormChange('description', e.target.value)
                    }
                    placeholder="Ví dụ: 4 vCPU"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Dung lượng RAM
                  </label>
                  <input
                    type="text"
                    value={serverForm.condition}
                    onChange={(e) =>
                      handleServerFormChange('condition', e.target.value)
                    }
                    placeholder="Ví dụ: 16 GB"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Thông số GPU nếu có
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: NVIDIA T4"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Giá thuê Token/giờ
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={serverForm.pricePerHour}
                    onChange={(e) =>
                      handleServerFormChange('pricePerHour', e.target.value)
                    }
                    placeholder="Ví dụ: 10"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Username đăng nhập máy
                  </label>
                  <input
                    type="text"
                    value={serverForm.username}
                    onChange={(e) =>
                      handleServerFormChange('username', e.target.value)
                    }
                    placeholder="Ví dụ: root hoặc ubuntu"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Password đăng nhập máy
                  </label>
                  <input
                    type="password"
                    value={serverForm.password}
                    onChange={(e) =>
                      handleServerFormChange('password', e.target.value)
                    }
                    placeholder="Nhập mật khẩu máy chủ"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">
                    Địa chỉ ví nhận Token
                  </label>
                  <input
                    type="text"
                    value={currentWallet || 'Chưa kết nối ví'}
                    disabled
                    className="w-full bg-slate-950 border border-slate-850 text-slate-500 rounded p-2.5 cursor-not-allowed font-mono text-[11px]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1">
                    Ảnh minh họa cụm máy
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setImageFile(e.target.files?.[0] || null)
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {submitMessage && (
                <p
                  className={`text-xs mt-2 text-center font-semibold ${submitMessage.includes('Sepolia') ||
                    submitMessage.includes('Vui lòng') ||
                    submitMessage.includes('lỗi') ||
                    submitMessage.includes('Lỗi')
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                    }`}
                >
                  {submitMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreateServer}
                disabled={
                  isSubmitting ||
                  submitMessage.includes('Vui lòng chuyển mạng')
                }
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer mt-2 shadow-lg shadow-emerald-950/20"
              >
                {isSubmitting
                  ? 'Đang kích hoạt gói...'
                  : 'Xác thực & Thêm máy lên Trang chủ'}
              </button>
            </form>

            <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 flex flex-col gap-4 w-full">
              <div className="border-b border-slate-900 pb-2 flex flex-col gap-1">
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

              <div>
                <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                  Tổng cộng: {myServers.length} máy
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar mt-2">
                {isLoadingProducts ? (
                  <div className="text-center py-6 text-xs text-slate-500 animate-pulse">
                    ⏳ Đang tải danh sách máy chủ...
                  </div>
                ) : myServers.length === 0 ? (
                  <div className="text-center py-12 px-4 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    📭 Ví của bạn chưa đăng tải cụm máy chủ nào lên hệ thống.
                  </div>
                ) : (
                  myServers.map((server) => {
                    const isAvailable =
                      server.status?.toLowerCase() === 'available';

                    return (
                      <div
                        key={server._id || server.id}
                        className="p-3 bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded-lg text-left text-xs flex flex-col gap-2 transition-all"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-slate-300 truncate max-w-[70%]">
                            🖥️ {server.title}
                          </span>

                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${isAvailable
                              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                              }`}
                          >
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

                          <span className="text-slate-600 font-mono text-[9px] max-w-[100px] truncate">
                            ID: {server._id || server.id}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;