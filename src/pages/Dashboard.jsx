import React, { useEffect, useState } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { createProduct } from '../Service - Ân/productService'; // Giả định có thêm hàm getAllProducts hoặc tương đương nếu cần
import { createRentalFactoryContract, SEPOLIA_CHAIN_ID } from '../contracts/rentalFactoryConfig';

function Dashboard({ currentTab }) { 
  const navigate = useNavigate();

  // Lấy địa chỉ ví đang kết nối hiện tại để làm căn cứ định danh
  const currentWallet = (localStorage.getItem('trustrent.walletAddress') || '').toLowerCase();

  // 1. STATE QUẢN LÝ CHO VÍ ĐI THUÊ (Khách hàng)
  const [renterData, setRenterData] = useState({
    ip: '34.124.211.85',
    port: '22',
    username: 'trustrent_user',
    password: 'MockPassword2026@',
    status: 'Testing' 
  });

  // 2. STATE QUẢN LÝ CHO VÍ CHO THUÊ (Chủ máy)
  const [lessorData, setLessorData] = useState({
    status: 'None' 
  });

  // Các state hỗ trợ đếm ngược và thông báo
  const [timeLeft, setTimeLeft] = useState(590); 
  const [showToast, setShowToast] = useState(false);
  const [showNegotiation, setShowNegotiation] = useState(false);

  // STATE DANH SÁCH MÁY THỰC TẾ CỦA CHỦ VÍ (Cập nhật thời gian thực)
  const [myProducts, setMyProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // STATE CHO FORM ĐĂNG MÁY CỦA CHỦ MÁY
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

  // 🔄 FETCH DANH SÁCH MÁY THỜI GIAN THỰC THEO VÍ CHỦ MÁY
  const fetchLessorProducts = async () => {
    if (!currentWallet) return;
    try {
      setIsLoadingProducts(true);
      
      // Tạm thời lấy danh sách từ localStorage hoặc API tùy thuộc cấu trúc dự án của bạn để lọc:
      const localData = localStorage.getItem('trustrent.products');
      if (localData) {
        const allProducts = JSON.parse(localData);
        const filtered = allProducts.filter(p => (p.ownerAddress || '').toLowerCase() === currentWallet);
        setMyProducts(filtered);
      }
    } catch (error) {
      console.error("Lỗi cập nhật nhật ký vận hành:", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Tự động chạy lại luồng fetch máy & đồng bộ dữ liệu form khi chủ máy thực hiện đổi ví MetaMask
  useEffect(() => {
    setServerForm(prev => ({ ...prev, ownerAddress: currentWallet }));
    fetchLessorProducts();
  }, [currentWallet]);

  // Đồng hồ đếm ngược của khách thuê
  useEffect(() => {
    if (timeLeft <= 0 || renterData.status === 'None') return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;
        if (newTime === 585) {
          setShowToast(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, renterData.status]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleConfirmOK = () => {
    setRenterData(prev => ({ ...prev, status: 'Active' }));
    alert("Đã xác nhận máy chạy tốt!");
  };

  const handleReportError = () => {
    setRenterData(prev => ({ ...prev, status: 'Dispute' }));
    setLessorData(prev => ({ ...prev, status: 'Dispute' })); 
    setShowNegotiation(true); 
    alert("Đã kích hoạt trạng thái tranh chấp giữa Khách và Chủ máy.");
  };

  const handleServerFormChange = (field, value) => {
    setServerForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateServer = async () => {
    if (!serverForm.title || !serverForm.pricePerHour || !serverForm.ownerAddress || !imageFile) {
      setSubmitMessage('Vui lòng nhập đủ thông tin.');
      return;
    }
    try {
      setIsSubmitting(true);
      setSubmitMessage('');
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factoryContract = createRentalFactoryContract(signer);
      const tokenAddress = await factoryContract.token();
      const tokenContract = new Contract(tokenAddress, ['function decimals() view returns (uint8)'], provider);
      
      let tokenDecimals = 18;
      try { tokenDecimals = Number(await tokenContract.decimals()); } catch { tokenDecimals = 18; }

      const onChainPrice = parseUnits(String(serverForm.pricePerHour), tokenDecimals);
      const tx = await factoryContract.createServerPackage(serverForm.title, onChainPrice);
      await tx.wait();

      // Lưu trữ dữ liệu về phía backend phục vụ hiển thị chợ máy
      const newProduct = await createProduct(serverForm.title, serverForm.description, serverForm.pricePerHour, serverForm.ownerAddress, serverForm.condition, imageFile);
      
      // [Bypass Test] Giúp đồng bộ tạm thời vào mảng dữ liệu local để cập nhật giao diện lập tức
      const localData = localStorage.getItem('trustrent.products') ? JSON.parse(localStorage.getItem('trustrent.products')) : [];
      localData.push({
        id: Date.now(),
        title: serverForm.title,
        pricePerHour: serverForm.pricePerHour,
        ownerAddress: serverForm.ownerAddress,
        status: 'Available' // Mới đăng lên chợ thì ở trạng thái Sẵn sàng
      });
      localStorage.setItem('trustrent.products', JSON.stringify(localData));

      // ĐỒNG BỘ ĐA TẦNG: Lưu vết địa chỉ ví này đã trở thành chủ máy để Navbar tự động mở khóa nút bấm
      if (currentWallet) {
        localStorage.setItem(`trustrent.isLessor.${currentWallet}`, 'true');
      }

      setSubmitMessage('Thêm máy chủ thành công!');
      
      // Refresh lại danh sách nhật ký ngay lập tức
      await fetchLessorProducts();

      setTimeout(() => { navigate('/'); }, 1200);
    } catch (error) {
      setSubmitMessage('Lỗi kích hoạt contract hoặc backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================================================
     🔒 BỘ LỌC ĐA TẦNG: ĐỒNG BỘ KHỚP 100% VỚI VALUE TỪ THANH NAVBAR
     ========================================================================= */

  // TRƯỜNG HỢP 1: Khách hàng đang ở không gian "Máy đã thuê"
  if (currentTab === 'my-rentals') {
    return (
      <div className="w-full text-left max-w-5xl mx-auto mt-6 relative animate-fade-in duration-200">
        {showToast && (
          <div className="fixed bottom-5 right-5 bg-amber-600 border border-amber-500 text-white p-4 rounded-xl shadow-2xl z-50 max-w-sm flex flex-col gap-1">
            <div className="flex items-center gap-2 font-bold text-sm">⚠️ CẢNH BÁO HẾT HẠN</div>
            <p className="text-xs">Thời gian còn lại là 15p, hãy lưu lại dữ liệu!</p>
            <button onClick={() => setShowToast(false)} className="text-[10px] underline text-right mt-1">Đã hiểu</button>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col gap-6">
          <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-blue-400">Không gian quản lý phiên thuê (Khách Hàng)</h2>
              <p className="text-xs text-slate-400 mt-1">
                Chỉ hiển thị các máy do ví {currentWallet ? `${currentWallet.slice(0,6)}...${currentWallet.slice(-4)}` : 'Chưa kết nối'} của bạn đang trực tiếp thuê
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              renterData.status === 'Testing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              renterData.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {renterData.status === 'Testing' ? 'Thử nghiệm (10p)' : renterData.status === 'Active' ? 'Active' : 'Đang Khiếu Nại'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">Thông tin cấu hình bàn giao</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div><p className="text-slate-500 mb-1">Địa chỉ IP VPS</p><p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{renterData.ip}</p></div>
                <div><p className="text-slate-500 mb-1">Cổng Kết Nối</p><p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{renterData.port}</p></div>
                <div><p className="text-slate-500 mb-1">Username</p><p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{renterData.username}</p></div>
                <div><p className="text-slate-500 mb-1">Password</p><p className="font-mono bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">{renterData.password}</p></div>
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col justify-center items-center text-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase">Thời gian thuê còn lại</h3>
              <div className="text-4xl font-mono font-bold text-amber-400 bg-amber-950/20 px-6 py-3 rounded-2xl border border-amber-900/40 my-2">{formatTime(timeLeft)}</div>
            </div>
          </div>

          {renterData.status === 'Testing' && (
            <div className="flex gap-4 border-t border-slate-800 pt-4 justify-end">
              <button onClick={handleReportError} className="bg-slate-800 hover:bg-rose-900/30 hover:text-rose-400 border text-slate-300 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Báo lỗi</button>
              <button onClick={handleConfirmOK} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-lg">Hoạt động tốt</button>
            </div>
          )}

          {showNegotiation && (
            <div className="border-t border-dashed border-slate-800 pt-4 mt-2">
              <div className="bg-rose-950/10 border border-rose-900/30 p-4 rounded-xl">
                <h4 className="text-sm font-bold text-rose-400 mb-1">Khung đàm phán hợp đồng</h4>
                <p className="text-xs text-slate-400">Yêu cầu báo lỗi đã ghi nhận lên Blockchain. Vui lòng đợi Chủ máy giải quyết.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // TRƯỜNG HỢP 2: Chủ máy đang ở không gian quản trị "Lessor Workspace"
  if (currentTab === 'lessor-workspace') {
    return (
      <div className="w-full text-left max-w-5xl mx-auto mt-6 relative animate-fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-xl font-bold text-emerald-400">Bảng điều khiển cho thuê (Lessor Workspace)</h2>
            <p className="text-xs text-slate-400 mt-1">Chào mừng quay lại! Bạn đang quản lý với tư cách chủ sở hữu máy chủ</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <form onSubmit={(e) => e.preventDefault()} className="md:col-span-2 bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-300 border-b border-slate-900 pb-2">Khai báo cấu hình VPS cho thuê</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2"><label className="text-slate-400 block mb-1">Tên gói máy chủ</label><input type="text" value={serverForm.title} onChange={(e) => handleServerFormChange('title', e.target.value)} placeholder="Ví dụ: Google Cloud VPS" className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200" /></div>
                <div><label className="text-slate-400 block mb-1">Cấu hình CPU</label><input type="text" value={serverForm.description} onChange={(e) => handleServerFormChange('description', e.target.value)} placeholder="Ví dụ: 4 vCPU" className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200" /></div>
                <div><label className="text-slate-400 block mb-1">Dung lượng RAM</label><input type="text" value={serverForm.condition} onChange={(e) => handleServerFormChange('condition', e.target.value)} placeholder="Ví dụ: 16 GB" className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200" /></div>
                <div><label className="text-slate-400 block mb-1">Giá thuê (Token/giờ)</label><input type="number" value={serverForm.pricePerHour} onChange={(e) => handleServerFormChange('pricePerHour', e.target.value)} placeholder="10" className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200" /></div>
                <div className="sm:col-span-2"><label className="text-slate-400 block mb-1">Địa chỉ ví nhận tiền của bạn</label><input type="text" value={currentWallet || 'Chưa nhận diện được ví'} disabled className="w-full bg-slate-950 border border-slate-850 text-slate-500 rounded p-2.5 cursor-not-allowed font-mono text-[11px]" /></div>
                <div className="sm:col-span-2"><label className="text-slate-400 block mb-1">Ảnh cụm máy</label><input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-slate-200" /></div>
              </div>
              {submitMessage && <p className="text-xs font-bold text-amber-400">{submitMessage}</p>}
              <button type="button" onClick={handleCreateServer} disabled={isSubmitting} className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-md cursor-pointer hover:bg-emerald-500 transition-colors">{isSubmitting ? 'Đang chạy Contract...' : 'Xác thực & Đăng Máy Lên Chợ'}</button>
            </form>

            <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl flex flex-col gap-4">
              {lessorData.status === 'Dispute' ? (
                <>
                  <h3 className="text-sm font-bold text-rose-400 border-b border-slate-900 pb-2">Trung tâm xử lý khiếu nại</h3>
                  <div className="bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-lg text-xs animate-pulse">
                    <span className="bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold">CÓ KHIẾU NẠI</span>
                    <p className="text-slate-300 mt-2">Khách thuê vừa Báo lỗi máy. Bạn hãy chọn hướng giải quyết phù hợp:</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={() => { setLessorData({status: 'None'}); alert("Đã hoàn tất đề xuất giảm giá 20%!"); }} className="w-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold py-2.5 rounded-xl cursor-pointer">Chấp nhận bồi thường 20%</button>
                    <button type="button" onClick={() => { setLessorData({status: 'None'}); alert("Đã hoàn tiền 100% cho khách!"); }} className="w-full bg-rose-950/30 text-rose-400 text-xs font-bold py-2.5 rounded-xl cursor-pointer">Hủy deal, hoàn cọc 100%</button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-emerald-400 border-b border-slate-900 pb-2">Nhật ký vận hành</h3>
                  <p className="text-[11px] text-slate-400">Danh sách tài nguyên thuộc sở hữu của ví bạn:</p>
                  
                  {isLoadingProducts ? (
                    <p className="text-xs text-slate-500 animate-pulse">Đang đồng bộ danh sách máy...</p>
                  ) : myProducts.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-800 rounded-lg text-center text-xs text-slate-500">
                      Bạn chưa đăng máy chủ nào lên hệ thống.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                      {myProducts.map((product, idx) => (
                        <div key={product.id || idx} className="p-3 bg-slate-900/60 border border-slate-850 rounded-lg text-xs flex flex-col gap-1 hover:border-slate-700 transition-all">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-300 truncate max-w-[130px]">🖥️ {product.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              product.status === 'Rented' || product.status === 'Active'
                                ? 'text-amber-400 bg-amber-500/10' 
                                : 'text-emerald-400 bg-emerald-500/10'
                            }`}>
                              {product.status === 'Rented' || product.status === 'Active' ? 'Đang được thuê' : 'Sẵn sàng'}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[10px]">
                            Đơn giá: <span className="text-slate-300">{product.pricePerHour} Token/h</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TRƯỜNG HỢP MẶC ĐỊNH
  return (
    <div className="py-20 text-center text-slate-500 text-sm bg-slate-900/20 rounded-2xl border border-slate-800">
      ⚠️ Vui lòng chọn một tác vụ trên thanh Menu để hiển thị bảng quản trị tương ứng.
    </div>
  );
}

export default Dashboard;