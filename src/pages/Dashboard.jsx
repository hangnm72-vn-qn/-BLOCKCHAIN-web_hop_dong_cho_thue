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
  // renterData chứa thông tin máy mà khách đang thuê.
  const [renterData, setRenterData] = useState({
    ip: localStorage.getItem('trustrent.rentalIp') || '',
    port: localStorage.getItem('trustrent.rentalPort') || '22',
    username: localStorage.getItem('trustrent.rentalUsername') || '',
    password: localStorage.getItem('trustrent.rentalPassword') || '',
    status: 'None'
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
    condition: '',
    username: '',
    password: '',
    ownerAddress: currentWallet,
    condition: 'Good',
  });

  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // States quản lý danh sách sản phẩm chủ máy
  const [myServers, setMyServers] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Hàm dọn trạng thái thuê hiện tại ở frontend.
  // Dùng khi hợp đồng kết thúc, hoàn tiền, hủy hoặc backend báo máy đã Available/Completed.
  const clearActiveRentalState = () => {
    setRenterData({
      ip: '',
      port: '22',
      username: '',
      password: '',
      status: 'None',
    });

    setLessorData({ status: 'None' });
    setTimeLeft(0);
    setTimerType('none');
    setShowToast(false);
    setShowNegotiation(false);
    setDiscountOffered(false);

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
  };

  // Hàm lấy thông tin phiên thuê đang active.
  // Dashboard cần đủ 3 thông tin để gọi đúng smart contract:
  // activeProductId       = ID sản phẩm trong backend.
  // activeContractId      = ID phiên thuê trong contract.
  // activePackageAddress  = địa chỉ contract gói máy.
  const getActiveRentalInfo = () => {
    return {
      productId: activeProductId || localStorage.getItem('trustrent.activeProductId'),
      contractId: activeContractId || localStorage.getItem('trustrent.activeContractId'),
      packageAddress: activePackageAddress || localStorage.getItem('trustrent.activePackageAddress'),
    };
  };

  // Hàm gọi một method trên SingleServerRental/RentalContract.
  // Hiện tại dùng cho 3 hàm có trong ABI:
  // confirmRental   = khách xác nhận máy hoạt động tốt.
  // acceptDiscount  = khách đồng ý giảm giá 20%.
  // rejectDiscount  = hủy / từ chối giảm giá.
  const callSingleContractMethod = async (methodName) => {
    const { productId, contractId, packageAddress } = getActiveRentalInfo();

    if (!productId) {
      throw new Error('Không tìm thấy sản phẩm đang thuê.');
    }

    if (!contractId) {
      throw new Error('Không tìm thấy contractId của phiên thuê. Vui lòng kiểm tra bước thuê máy trong ProductDetail.');
    }

    if (!packageAddress) {
      throw new Error('Không tìm thấy địa chỉ contract gói máy. Vui lòng kiểm tra bước thuê máy trong ProductDetail.');
    }

    if (!window.ethereum) {
      throw new Error('Vui lòng cài đặt MetaMask để xác nhận giao dịch.');
    }

    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error('Vui lòng chuyển MetaMask sang mạng Sepolia.');
    }

    const signer = await provider.getSigner();

    // Đây là contract gói máy cụ thể, không phải Factory.
    const single = createSingleContract(packageAddress, signer);

    if (typeof single[methodName] !== 'function') {
      throw new Error(`Smart contract hiện chưa có hàm ${methodName}(). Kiểm tra lại ABI hoặc tên hàm của Hạnh.`);
    }

    const tx = await single[methodName](Number(contractId));
    await tx.wait();

    return {
      productId,
      contractId,
      packageAddress,
    };
  };

  // Đồng bộ địa chỉ ví vào form khi người dùng đổi ví.
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
            setRenterData((r) => ({ ...r, status: 'Unavailable' }));
            setTimerType('rental');
            setShowToast(true);
            return 3600; // Chuyển sang 1 tiếng thuê chính thức
          } else {
            setRenterData((r) => ({ ...r, status: 'Available' }));
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

  // Khi khách bấm "Báo lỗi".
  // Trạng thái chuyển sang Dispute, mở khung thương lượng.
  const handleReportError = async () => {
    try {
      setRenterData((prev) => ({ ...prev, status: 'Dispute' }));
      setLessorData((prev) => ({ ...prev, status: 'Dispute' }));
      setShowNegotiation(true);
      setDiscountOffered(false);

      if (activeProductId) {
        try {
          await updateProductStatus(activeProductId, 'Unavailable');
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
  // Chủ máy chỉ đề xuất, khách phải đồng ý thì contract mới xử lý acceptDiscount.
  const handleProposeDiscount = () => {
    setDiscountOffered(true);
    setShowNegotiation(true);
    alert('Chủ máy đã đề xuất giảm giá 20%. Vui lòng đợi khách thuê đồng ý.');
  };

  // Khách đồng ý giảm 20%.
  // Gọi đúng hàm acceptDiscount(contractId) có trong ABI của Hạnh.
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
  // Gọi đúng hàm rejectDiscount(contractId) có trong ABI của Hạnh.
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

  // ✅ Tự động kiểm tra mạng liên tục chuẩn kiểu dữ liệu BigInt (Đã sửa từ walletAddress thành currentWallet)
  useEffect(() => {
    const checkNetworkRealTime = async () => {
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();

          // Sử dụng BigInt() để ép kiểu network.chainId đồng bộ với SEPOLIA_CHAIN_ID (11155111n)
          if (BigInt(network.chainId) === SEPOLIA_CHAIN_ID) {
            setSubmitMessage(''); // Tự động xóa chữ đỏ ngay lập tức khi mạng đúng
          } else {
            setSubmitMessage('Vui lòng chuyển mạng ví sang Sepolia Testnet!');
          }
        } catch (err) {
          console.error("Lỗi đọc mạng realtime:", err);
        }
      }
    };

    checkNetworkRealTime();

    // Lắng nghe trực tiếp sự kiện đổi mạng từ MetaMask ngay tại Dashboard
    if (window.ethereum) {
      window.ethereum.on('chainChanged', checkNetworkRealTime);
    }

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('chainChanged', checkNetworkRealTime);
      }
    };
  }, [currentWallet]); // Đã sửa thành currentWallet để đồng bộ theo ví của ông!

  // ✅ LUỒNG XỬ LÝ CHUẨN: Giao dịch Smart Contract thành công -> Tự động gọi API đẩy lên Backend
  const handleCreateServer = async () => {
    console.log("📸 File ảnh hiện tại trong State trước khi gửi:", imageFile);
    if (!serverForm.title || !serverForm.pricePerHour || !serverForm.ownerAddress || !imageFile || !serverForm.username || !serverForm.password) {
      setSubmitMessage('Vui lòng nhập đủ thông tin gói, tài khoản và ảnh minh họa.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('Đang khởi tạo kết nối Web3...');

    try {
      if (!window.ethereum) throw new Error('Vui lòng cài đặt ví MetaMask!');
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      // Đã sửa thành BigInt để triệt tiêu lỗi "đơ chữ đỏ" do lệch kiểu dữ liệu (Number vs BigInt)
      if (BigInt(network.chainId) !== SEPOLIA_CHAIN_ID) {
        setSubmitMessage('Vui lòng chuyển mạng ví sang Sepolia Testnet!');
        setIsSubmitting(false);
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

      // 1. Gửi transaction tạo máy chủ mới lên Smart Contract
      const onChainPrice = parseUnits(String(serverForm.pricePerHour), tokenDecimals);
      const tx = await factoryContract.createServerPackage(serverForm.title, onChainPrice);

      setSubmitMessage('Đã gửi giao dịch lên smart contract, đang chờ xác nhận...');
      const receipt = await tx.wait();

      // 2. Hứng lấy địa chỉ Contract Package con vừa được Blockchain sinh ra từ Logs
      const deployedPackageAddress = receipt.logs[0]?.address || receipt.to;

      if (!deployedPackageAddress) {
        throw new Error("Blockchain không trả về địa chỉ Package Address hợp lệ!");
      }

      setSubmitMessage('Blockchain xác nhận! Đang tiến hành lưu thông tin lên database MongoDB...');

      // 3. GỌI SERVICE ĐỂ ĐẨY DATA + PACKAGE_ADDRESS LÊN BACKEND MONGODB
      const backendResult = await createProduct(
        serverForm.title,
        `Cấu hình: ${serverForm.cpu || '4 vCPU'}, ${serverForm.ram || '16GB RAM'}, ${serverForm.gpu || 'Không có'}. Tài khoản: ${serverForm.username}`,
        serverForm.pricePerHour,
        serverForm.ownerAddress,
        "Uptime SLA 99.9%",
        imageFile,
        deployedPackageAddress // Truyền địa chỉ ví Contract con lưu xuống database
        serverForm.condition,
        serverForm.username,
        serverForm.password,
        imageFile
      );

      if (backendResult.success) {
        setSubmitMessage('🎉 Đăng máy chủ thành công và đồng bộ Blockchain hoàn tất!');

        // Đợi 1.5 giây để người dùng kịp nhìn thấy thông báo thành công rồi làm mới danh sách dữ liệu
        setTimeout(async () => {
          await fetchLessorProducts();
          window.location.reload();
        }, 1500);
      } else {
        setSubmitMessage('Lưu dữ liệu máy chủ lên Backend thất bại!');
      }

      // Refresh lại danh sách máy chủ của ví hiện tại.
      if (currentWallet) {
        try {
          const data = await getProductsByOwner(currentWallet);
          setMyServers(data || []);
        } catch (err) {
          console.error('Lỗi refresh danh sách máy sau khi tạo:', err);
        }
      }

      setSubmitMessage('Đã thêm máy chủ thành công trên smart contract và backend. Đang chuyển về trang chủ...');

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
      console.error("Lỗi trong quá trình đăng máy chủ:", error);
      setSubmitMessage(error.reason || error.message || 'Có lỗi xảy ra, vui lòng thử lại!');
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

  // KHÁCH THUÊ ẤN NÚT: HỦY BỎ (HOÀN TIỀN LẬP TỨC)
  const handleCancelAndRefund = async () => {
    setIsResolvingDispute(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask không khả dụng');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const singleContract = createSingleContract('0xMockContractAddress...', signer);
      setRenterData((prev) => ({ ...prev, status: 'None' }));
      alert('Đã hủy phiên thử nghiệm! Tiền đã được hoàn trả về ví của bạn.');
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

            {/* Chỉ hiển thị Badge trạng thái khi có máy đang hoạt động/thử nghiệm thực tế */}
            {renterData && renterData.status && renterData.status !== 'Available' && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${renterData.status === 'Unavailable'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                }`}>
                {renterData.status === 'Unavailable' ? 'Thử nghiệm (10p)' : 'Unavailable (Đang thuê)'}
              </span>
            )}
          </div>

          {!renterData || renterData.status === 'Available' ? (
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
                onClick={() => navigate('/')} className="mt-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md">

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
                      ? 'Vui lòng kiểm tra kỹ kết nối trong thời gian dùng thử.'
                      : 'Hệ thống ngắt quyền truy cập On-chain khi đếm ngược kết thúc'}
                  </p>
                </div>
              </div>

              {/* PHIÊN THỬ NGHIỆM: CHỈ CÒN ĐỒNG Ý HOẶC HỦY BỎ */}
              {renterData.status === 'Unavailable' && (
                <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 mt-2">
                  <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-amber-400">Xác nhận tình trạng máy chủ thử nghiệm</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Nếu máy hoạt động tốt, chọn "Đồng ý" để bắt đầu thuê. Nếu máy lỗi hoặc không kết nối được, chọn "Hủy bỏ" để nhận lại tiền.
                      </p>
                    </div>

                    <div className="flex gap-3 justify-end shrink-0">
                      <button
                        type="button"
                        onClick={handleCancelAndRefund}
                        disabled={isConfirming || isResolvingDispute}
                        className="bg-rose-700 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md"
                      >
                        {isResolvingDispute ? 'Đang hủy...' : '❌ Hủy bỏ (Trả tiền)'}
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
              Đăng tải tài nguyên và xử lý trạng thái của các dòng máy
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
                <div>
                  <label className="text-slate-400 block mb-1">Username đăng nhập máy</label>
                  <input
                    type="text"
                    value={serverForm.username}
                    onChange={(e) => handleServerFormChange('username', e.target.value)}
                    placeholder="Ví dụ: root hoặc ubuntu"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Password đăng nhập máy</label>
                  <input
                    type="text"
                    value={serverForm.password}
                    onChange={(e) => handleServerFormChange('password', e.target.value)}
                    placeholder="Nhập mật khẩu máy chủ"
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

              {/* 🌟 ĐÃ SỬA: Chỉ hiển thị chữ đỏ nếu THỰC SỰ SAI MẠNG và ĐỒNG BỘ ẩn/hiện logic */}
              {submitMessage && (
                <p className={`text-xs mt-2 text-center font-semibold ${submitMessage.includes('Sepolia') ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {submitMessage}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreateServer}
                // 🌟 ĐÃ SỬA: Khóa luôn nút bấm không cho nhấn nếu ví đang ở sai mạng
                disabled={isSubmitting || submitMessage.includes('Vui lòng chuyển mạng')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer mt-2 shadow-lg shadow-emerald-950/20"
              >
                {isSubmitting ? 'Đang kích hoạt gói...' : 'Xác thực & Thêm máy lên Trang chủ'}
              </button>
            </form>

            {/* ==================== ĐÃ FIX LỖI KHỐI 2: NHẬT KÝ VẬN HÀNH MÁY CHỦ ==================== */}
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

              {/* Danh sách máy chủ được bọc TRONG KHUNG bọc lớn của Nhật ký vận hành */}
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar mt-2">
                {isLoadingProducts ? (
                  <div className="text-center py-6 text-xs text-slate-500 animate-pulse">
                    ⏳ Đang tải danh sách máy chủ...
                  </div>
                ) : myServers.length === 0 ? (
                  // Đã gom vào trong: Dòng chữ thông báo sẽ hiển thị căn giữa hộp ngay ngắn
                  <div className="text-center py-12 px-4 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    📭 Ví của bạn chưa đăng tải cụm máy chủ nào lên hệ thống.
                  </div>
                ) : (
                  myServers.map((server) => {
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

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${isAvailable
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