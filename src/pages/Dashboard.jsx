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

function Dashboard({ currentTab }) {
  const navigate = useNavigate();

  // Ví hiện tại đang kết nối.
  // Navbar đang lưu ví vào localStorage với key trustrent.walletAddress.
  const currentWallet = (localStorage.getItem('trustrent.walletAddress') || '').toLowerCase();

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
  // lessorData dùng để điều khiển trạng thái hiển thị của khu vực chủ máy.
  // Ví dụ: khi khách bấm báo lỗi thì lessorData.status = Dispute để mở khung xử lý khiếu nại.
  const [lessorData, setLessorData] = useState({
    status: 'None'
  });

  // Đồng hồ đang hiển thị trên Dashboard, đơn vị là giây.
  const [timeLeft, setTimeLeft] = useState(0);

  // timerType cho biết đồng hồ hiện tại đang là loại nào.
  // none   = chưa có phiên thuê.
  // trial  = đang ở thời gian thử nghiệm 5 phút.
  // rental = đang ở thời gian thuê chính thức do khách chọn.
  const [timerType, setTimerType] = useState('none');

  // ID sản phẩm / phiên thuê đang active ở backend.
  // ProductDetail cần lưu key này sau khi khách thuê thành công.
  const [activeProductId, setActiveProductId] = useState(
    localStorage.getItem('trustrent.activeProductId') || null
  );

  // contractId của phiên thuê trên smart contract.
  // ProductDetail cần lưu key này sau khi gọi rentServer thành công.
  const [activeContractId, setActiveContractId] = useState(
    localStorage.getItem('trustrent.activeContractId') || null
  );

  // Địa chỉ contract gói máy cụ thể.
  // ProductDetail cần lưu key này sau khi tìm được packageAddress.
  const [activePackageAddress, setActivePackageAddress] = useState(
    localStorage.getItem('trustrent.activePackageAddress') || null
  );

  const [showToast, setShowToast] = useState(false);
  const [showNegotiation, setShowNegotiation] = useState(false);

  // discountOffered = chủ máy đã bấm đề xuất giảm 20%.
  // Khi true, bên khách sẽ thấy nút "Đồng ý giảm 20%" và "Hủy hợp đồng".
  const [discountOffered, setDiscountOffered] = useState(false);

  // isConfirming dùng để khóa nút "Hoạt động tốt" trong lúc đang chờ MetaMask/transaction.
  const [isConfirming, setIsConfirming] = useState(false);

  // isResolvingDispute dùng để khóa các nút thương lượng khi đang xử lý giảm giá/hoàn tiền.
  const [isResolvingDispute, setIsResolvingDispute] = useState(false);

  // =========================================================
  // 3. STATE FORM ĐĂNG MÁY CỦA CHỦ MÁY
  // =========================================================
  const [serverForm, setServerForm] = useState({
    title: '',
    description: '',
    pricePerHour: '',
    condition: '',
    username: '',
    password: '',
    ownerAddress: currentWallet,
  });

  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [myServers, setMyServers] = useState([]);

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
    setServerForm((prev) => ({
      ...prev,
      ownerAddress: currentWallet,
    }));
  }, [currentWallet]);

  // =========================================================
  // 4. LẤY THỜI GIAN PHIÊN THUÊ TỪ BACKEND
  // =========================================================
  // Quy trình đúng:
  // Available  = máy đang trống.
  // Pending/Testing = đã khóa tiền, đang 5 phút thử nghiệm.
  // Active     = khách OK hoặc hết 5 phút im lặng, máy chạy thời gian thuê chính thức.
  // Dispute    = khách báo lỗi, mở thương lượng.
  // Completed/Expired/Refunded/Canceled/Available = kết thúc, máy quay về trống.
  //
  // Dashboard hỗ trợ 2 kiểu dữ liệu:
  // Cách mới: backend trả trialTimeLeft và rentalTimeLeft riêng.
  // Cách cũ: backend chỉ trả timeLeft chung.
  useEffect(() => {
    if (!activeProductId) {
      setTimeLeft(0);
      setTimerType('none');
      setShowToast(false);
      setRenterData((prev) => ({ ...prev, status: 'None' }));
      return;
    }

    const fetchSessionTime = async () => {
      try {
        const data = await getSessionTime(activeProductId);

        const apiStatus = data?.status;

        // Backend mới: tách thời gian thử nghiệm và thuê chính thức.
        const trialTimeLeft = Number(data?.trialTimeLeft ?? 0);
        const rentalTimeLeft = Number(data?.rentalTimeLeft ?? 0);

        // Backend cũ: một field timeLeft chung.
        const fallbackTimeLeft = Number(data?.timeLeft ?? 0);

        if ((apiStatus === 'Pending' || apiStatus === 'Testing') && trialTimeLeft > 0) {
          // Giai đoạn thử nghiệm 5 phút.
          // Ưu tiên trialTimeLeft; nếu chưa có thì dùng timeLeft.
          const displayTimeLeft = trialTimeLeft;

          if (displayTimeLeft <= 0) {
            // Nếu hết 5 phút mà backend chưa chuyển Active thì không tự đổi tiền ở frontend.
            // Backend/contract nên tự xử lý nhánh "im lặng xem như OK".
            // Frontend chỉ chờ lần gọi API tiếp theo trả Active hoặc Completed.
            setTimeLeft(0);
            setTimerType('trial');
            return;
          }

          setTimeLeft(displayTimeLeft);
          setTimerType('trial');

          setRenterData((prev) => ({
            ...prev,
            status: 'Testing',
          }));

          // Phiên thử nghiệm 5 phút: cảnh báo khi còn dưới 1 phút.
          if (displayTimeLeft <= 60 && displayTimeLeft > 0) {
            setShowToast(true);
          } else {
            setShowToast(false);
          }
        } else if (
          apiStatus === 'Active' ||
          apiStatus === 'Rented' ||
          (trialTimeLeft <= 0 && rentalTimeLeft > 0)
        ) {
          // Giai đoạn thuê chính thức.
          // Ưu tiên rentalTimeLeft; nếu chưa có thì dùng timeLeft.
          const displayTimeLeft = rentalTimeLeft > 0 ? rentalTimeLeft : fallbackTimeLeft;

          if (displayTimeLeft <= 0) {
            // Hết thời gian thuê chính thức.
            // Backend/cron job sẽ xóa máy ảo và đưa máy về Available.
            clearActiveRentalState();
            return;
          }

          setTimeLeft(displayTimeLeft);
          setTimerType('rental');

          setRenterData((prev) => ({
            ...prev,
            status: 'Active',
          }));

          setShowNegotiation(false);
          setDiscountOffered(false);

          // Phiên thuê chính thức: cảnh báo khi còn dưới 15 phút.
          if (displayTimeLeft <= 900 && displayTimeLeft > 0) {
            setShowToast(true);
          } else {
            setShowToast(false);
          }
        } else if (apiStatus === 'Dispute') {
          // Giai đoạn tranh chấp/khiếu nại.
          const displayTimeLeft =
            trialTimeLeft > 0
              ? trialTimeLeft
              : rentalTimeLeft > 0
                ? rentalTimeLeft
                : fallbackTimeLeft;

          setTimeLeft(displayTimeLeft);
          setTimerType(trialTimeLeft > 0 ? 'trial' : 'rental');

          setRenterData((prev) => ({
            ...prev,
            status: 'Dispute',
          }));

          setLessorData((prev) => ({
            ...prev,
            status: 'Dispute',
          }));

          setShowNegotiation(true);
        } else if (
          apiStatus === 'Available' ||
          apiStatus === 'Completed' ||
          apiStatus === 'Expired' ||
          apiStatus === 'Canceled' ||
          apiStatus === 'Cancelled' ||
          apiStatus === 'Refunded'
        ) {
          // Hợp đồng đã tất toán, backend đã hoặc sẽ giải phóng máy.
          clearActiveRentalState();
        }
      } catch (err) {
        console.error('Lỗi lấy thời gian phiên thuê:', err);
      }
    };

    fetchSessionTime();

    // Cứ 5 giây gọi lại backend để lấy thời gian thực tế.
    // Frontend không tự đếm giả; backend trả bao nhiêu thì hiển thị bấy nhiêu.
    const interval = setInterval(fetchSessionTime, 5000);

    return () => clearInterval(interval);
  }, [activeProductId]);

  // Lấy danh sách máy chủ mà ví hiện tại đã đăng lên chợ.
  // Navbar của bạn đang dùng tab lessor, nên điều kiện phải là lessor.
  useEffect(() => {
    if (currentTab === 'my-rentals') return;  // Đổi !== thành ===
    if (!currentWallet) return;

    const fetchMyServers = async () => {
      try {
        const data = await getProductsByOwner(currentWallet);
        setMyServers(data || []);
      } catch (err) {
        console.error('Lỗi lấy danh sách máy của tôi:', err);
      }
    };

    fetchMyServers();
  }, [currentTab, currentWallet]);

  // Hàm biến đổi số giây thành định dạng MM:SS.
  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  // =========================================================
  // 5. KHÁCH BẤM "HOẠT ĐỘNG TỐT"
  // =========================================================
  // Luồng đúng:
  // 1. Khách đang trong 5 phút thử nghiệm.
  // 2. Khách bấm Hoạt động tốt.
  // 3. Smart Contract gọi confirmRental(contractId).
  // 4. Backend chuyển trạng thái sang Active.
  // 5. Máy chạy tiếp thời gian thuê chính thức.
  const handleConfirmOK = async () => {
    try {
      setIsConfirming(true);

      await callSingleContractMethod('confirmRental');

      const { productId, contractId, packageAddress } = getActiveRentalInfo();

      try {
        await updateProductStatus(productId, 'Unavailable');
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

  // Chủ máy bấm "Xác thực & Thêm máy lên Trang chủ".
  // Quy trình đúng:
  // 1. Gọi smart contract tạo gói máy.
  // 2. Smart contract ghi nhận máy ở trạng thái Available.
  // 3. Gọi backend createProduct để lưu thông tin hiển thị trên Home.
  const handleCreateServer = async () => {
    if (
      !serverForm.title ||
      !serverForm.pricePerHour ||
      !serverForm.ownerAddress ||
      !serverForm.username ||
      !serverForm.password ||
      !imageFile
    ) {
      setSubmitMessage('Vui lòng nhập đủ tên gói, giá thuê, địa chỉ ví, username, password và ảnh đại diện.');
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

      await createProduct(
        serverForm.title,
        serverForm.description,
        serverForm.pricePerHour,
        serverForm.ownerAddress,
        serverForm.condition,
        serverForm.username,
        serverForm.password,
        imageFile
      );

      // Mở khóa quyền Chủ máy cho Navbar.
      if (currentWallet) {
        localStorage.setItem(`trustrent.isLessor.${currentWallet}`, 'true');
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

              {renterData.status === 'Testing' && (
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
              )}

              {showNegotiation && (
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
                <p className={`text-xs ${submitMessage.includes('thành công') ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
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
                    🟢 Dữ liệu máy chủ lấy trực tiếp từ Database
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
