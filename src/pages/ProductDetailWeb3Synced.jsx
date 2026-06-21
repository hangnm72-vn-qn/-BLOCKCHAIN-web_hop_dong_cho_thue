import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
// ĐÃ SỬA: Import thêm hàm terminateProduct từ Service của Ân để dứt điểm xoá ví thuê
import { getProductById, updateProductStatus, provisionProduct, terminateProduct } from "../Service - Ân/productService"
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { createRentalFactoryContract, createSingleContract, SEPOLIA_CHAIN_ID } from '../contracts/rentalFactoryConfig';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  const [rentHours, setRentHours] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contractId, setContractId] = useState(null);
  const [message, setMessage] = useState('');
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      const data = await getProductById(id)
      setProduct(data)
      loading && setLoading(false)
    }
    fetchProduct()
  }, [id])

  if (loading) return <p className="text-slate-400 text-center mt-10">Đang tải thông tin máy chủ...</p>
  if (!product) return <p className="text-slate-400 text-center mt-10">Không tìm thấy thông tin máy chủ.</p>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left mt-4">
      {/* CỘT TRÁI: Ảnh cấu hình / Minh họa VPS */}
      <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl h-[500px]">
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* CỘT PHẢI: Thông tin và Bảng cam kết điều khoản Smart Contract */}
      <div className="flex flex-col justify-between space-y-6">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-950/50 border border-blue-900/50 px-3 py-1 rounded-full">
            Chi Tiết Hợp Đồng Thuê
          </span>
          <h2 className="text-3xl font-bold text-white mt-3 mb-2">{product.title}</h2>
          <p className="text-xs text-slate-500 mb-6">
            Địa chỉ ví chủ máy (Lessor): <span className="text-slate-400 font-mono">{product.ownerAddress}</span>
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">🔍 Chi tiết cấu hình & Tài nguyên:</h4>
            <p className="text-sm text-emerald-400 font-medium">{product.description}</p>
          </div>

          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-6 backdrop-blur-sm">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4 uppercase tracking-wider">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              ⚠️ Quy định vận hành & Khấu trừ tự động
            </h4>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-base">⏰</span>
                  <span className="text-xs font-medium text-slate-400">10 Phút thử nghiệm đầu tiên</span>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md sm:text-right">
                  Được quyền hủy, hoàn cọc 100%
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-base">❌</span>
                  <span className="text-xs font-medium text-slate-400">Chủ máy ngắt kết nối / Sập nguồn ngầm</span>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md sm:text-right">
                  Hoàn 100% tiền cọc cho Người thuê
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔥</span>
                  <span className="text-xs font-medium text-slate-400">Sử dụng quá thời gian đã thuê</span>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md sm:text-right">
                  Google Cloud tự động xóa máy vĩnh viễn
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Số giờ cần thuê (Tối thiểu 1 giờ)"
              type="number"
              placeholder="Nhập số giờ... (Ví dụ: 5)"
              min="1"
              value={rentHours}
              onChange={(e) => setRentHours(e.target.value)}
              required
              className="w-full"
            />

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Giá thuê / giờ
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-blue-400 font-bold text-sm h-[46px] flex items-center">
                {product.pricePerHour} Token
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/')}>
              Quay Lại Trang Chủ
            </Button>
            {product.status === 'Available' ? (
              <Button
                variant="primary"
                className="flex-[2] font-bold text-base bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    setMessage('');

                    if (!window.ethereum) {
                      setMessage('Vui lòng cài đặt MetaMask để tiếp tục.');
                      return;
                    }

                    const provider = new BrowserProvider(window.ethereum);
                    const network = await provider.getNetwork();
                    if (network.chainId !== SEPOLIA_CHAIN_ID) {
                      setMessage('Vui lòng chuyển MetaMask sang mạng Sepolia.');
                      return;
                    }

                    const signer = await provider.getSigner();
                    const factory = createRentalFactoryContract(signer);

                    const tokenAddress = await factory.token();
                    const tokenContract = new Contract(
                      tokenAddress,
                      [
                        'function approve(address,uint256) returns (bool)',
                        'function decimals() view returns (uint8)'
                      ],
                      signer
                    );

                    let decimals = 18;
                    try {
                      decimals = Number(await tokenContract.decimals());
                    } catch (e) {
                      decimals = 18;
                    }

                    const totalPrice = Number(product.pricePerHour) * Number(rentHours);
                    if (totalPrice <= 0) {
                      setMessage('Số giờ thuê không hợp lệ.');
                      return;
                    }

                    const totalAmount = parseUnits(String(totalPrice), decimals);

                    let packageAddress = product.contractAddress || '';
                    if (!packageAddress) {
                      const packageIds = await factory.getPackagesByOwner(product.ownerAddress);
                      const perHourOnChain = parseUnits(String(product.pricePerHour), decimals);
                      for (let i = 0; i < packageIds.length; i++) {
                        const pkgId = packageIds[i];
                        const info = await factory.getPackageInfo(pkgId);
                        try {
                          if (info.pricePerHour.toString() === perHourOnChain.toString()) {
                            packageAddress = await factory.getPackageAddress(pkgId);
                            break;
                          }
                        } catch (e) { }
                      }
                    }

                    if (!packageAddress) {
                      setMessage('Không tìm thấy contract gói máy trên blockchain. Vui lòng cấu hình contractAddress trong backend.');
                      return;
                    }

                    const single = createSingleContract(packageAddress, signer);

                    const approveTx = await tokenContract.approve(packageAddress, totalAmount);
                    setMessage('Đang phê duyệt token trên MetaMask...');
                    await approveTx.wait();

                    const rentTx = await single.rentServer(Number(rentHours));
                    setMessage('Gửi lệnh thuê, chờ xử lý trên chain...');
                    await rentTx.wait();

                    let nextId = await single.nextContractId();
                    const newContractId = Number(nextId.toString()) - 1;
                    setContractId(newContractId);

                    const renterAddress = await signer.getAddress();

                    // ✅ ĐÃ SỬA: Đọc phẳng trực tiếp dữ liệu từ Backend trả về
                    try {
                      const prov = await provisionProduct(product._id, renterAddress);
                      if (prov && prov.success) {
                        setCredentials(prov);
                        localStorage.setItem('trustrent.activeProductId', product._id);
                      }
                    } catch (e) {
                      console.error("Lỗi gọi API Provision:", e);
                    }
                    setMessage('Thuê thành công. ContractId: ' + newContractId);
                  } catch (err) {
                    console.error(err);
                    setMessage(err?.message || 'Lỗi khi thuê máy.');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                {isProcessing ? 'Đang xử lý...' : `⚡ Thuê Ngay (Khóa Cọc ${product.depositAmount} Token)`}
              </Button>
            ) : (
              <Button variant="primary" className="flex-[2] font-bold text-base bg-slate-600 cursor-not-allowed" disabled>
                Máy chủ đã có người thuê
              </Button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center italic">
            *Bấm Thuê Ngay sẽ kích hoạt ví MetaMask để thực hiện khóa Token đặt cọc vào Hợp đồng.
          </p>
          {message && (
            <p className={`text-xs ${message.includes('thành công') ? 'text-emerald-400' : 'text-rose-400'}`}>{message}</p>
          )}

          {/* ✅ ĐÃ SỬA: Hiển thị giao diện IP phẳng theo đúng yêu cầu mới của Ân */}
          {credentials && (
            <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm">
              <h4 className="text-xs font-bold text-slate-300 mb-2">Thông tin bàn giao VPS</h4>
              <div className="text-xs space-y-1">
                <div className="text-emerald-400 font-medium">✨ {credentials.message}</div>
                <div className="mt-2">Địa chỉ IP kết nối: <span className="font-mono text-blue-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{credentials.ipAddress}</span></div>
              </div>
            </div>
          )}

          {/* ==========================================
              🔥 KHU VỰC ĐÃ VÁ LỖI PHÂN NHÁNH ĐỒNG BỘ ĐỒ ÁN 
             ========================================== */}
          {contractId && (
            <div className="mt-3 flex gap-2">
              {/* NHÁNH 2: Khách dùng mượt mà bấm OK -> Kích hoạt thuê chính thức */}
              <Button
                variant="secondary"
                className="flex-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900/60 hover:bg-emerald-900/40"
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    setMessage('Gửi xác nhận OK lên chain...');
                    const provider = new BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const factory = createRentalFactoryContract(signer);

                    let packageAddress = product.contractAddress || '';
                    if (!packageAddress) {
                      const packageIds = await factory.getPackagesByOwner(product.ownerAddress);
                      const perHourOnChain = parseUnits(String(product.pricePerHour), 18);
                      for (let i = 0; i < packageIds.length; i++) {
                        const pkgId = packageIds[i];
                        const info = await factory.getPackageInfo(pkgId);
                        try {
                          if (info.pricePerHour.toString() === perHourOnChain.toString()) {
                            packageAddress = await factory.getPackageAddress(pkgId);
                            break;
                          }
                        } catch (e) { }
                      }
                    }

                    const single = createSingleContract(packageAddress, signer);
                    const tx = await single.confirmRental(contractId);
                    await tx.wait();
                    setMessage('Xác nhận OK đã được ghi nhận trên chain.');

                    // CHUẨN HOÁ: Chuyển máy sang trạng thái Active chạy chính thức
                    try { await updateProductStatus(product._id, 'Active'); } catch (e) { }
                  } catch (e) {
                    console.error(e);
                    setMessage('Lỗi khi xác nhận OK: ' + (e?.message || ''));
                  } finally { setIsProcessing(false); }
                }}
              >
                Xác nhận OK
              </Button>

              {/* NHÁNH 1 (PHẦN A): Chấp nhận giảm giá khi có sự cố nhỏ */}
              <Button
                variant="secondary"
                className="flex-1"
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    setMessage('Gửi lệnh chấp nhận giảm giá...');
                    const provider = new BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const factory = createRentalFactoryContract(signer);
                    let packageAddress = product.contractAddress || '';
                    if (!packageAddress) {
                      const packageIds = await factory.getPackagesByOwner(product.ownerAddress);
                      for (let i = 0; i < packageIds.length; i++) {
                        const pkgId = packageIds[i];
                        const info = await factory.getPackageInfo(pkgId);
                        try {
                          if (info.pricePerHour.toString() === parseUnits(String(product.pricePerHour), 18).toString()) {
                            packageAddress = await factory.getPackageAddress(pkgId);
                            break;
                          }
                        } catch (e) { }
                      }
                    }
                    const single = createSingleContract(packageAddress, signer);
                    const tx = await single.acceptDiscount(contractId);
                    await tx.wait();
                    setMessage('Đã chấp nhận giảm giá, máy hoạt động tiếp.');

                    // ĐỒNG BỘ CHUẨN: Chuyển trạng thái máy sang chạy chính thức luôn
                    try { await updateProductStatus(product._id, 'Active'); } catch (e) { }
                  } catch (e) {
                    console.error(e);
                    setMessage('Lỗi khi chấp nhận giảm giá: ' + (e?.message || ''));
                  } finally { setIsProcessing(false); }
                }}
              >
                Đồng ý giảm giá 20%
              </Button>

              {/* NHÁNH 1 (PHẦN B) & NHÁNH 3: Khách không thuê nữa, hủy hoàn tiền / Giải phóng tài nguyên */}
              <Button
                variant="secondary"
                className="flex-1 bg-rose-950/40 text-rose-400 border border-rose-900/60 hover:bg-rose-900/40"
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    setMessage('Gửi lệnh hoàn tiền (reject) lên chain...');
                    const provider = new BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const factory = createRentalFactoryContract(signer);
                    let packageAddress = product.contractAddress || '';
                    if (!packageAddress) {
                      const packageIds = await factory.getPackagesByOwner(product.ownerAddress);
                      for (let i = 0; i < packageIds.length; i++) {
                        const pkgId = packageIds[i];
                        const info = await factory.getPackageInfo(pkgId);
                        try {
                          if (info.pricePerHour.toString() === parseUnits(String(product.pricePerHour), 18).toString()) {
                            packageAddress = await factory.getPackageAddress(pkgId);
                            break;
                          }
                        } catch (e) { }
                      }
                    }
                    const single = createSingleContract(packageAddress, signer);
                    const tx = await single.rejectDiscount(contractId);
                    await tx.wait();
                    setMessage('Đã hủy & hoàn tiền 100% cho khách.');

                    // 🔥 ĐÃ VÁ LỖI: Sử dụng terminateProduct của Ân để xóa hẳn ví renterAddress khỏi DB
                    try {
                      await terminateProduct(product._id);
                      localStorage.removeItem('trustrent.activeProductId'); // Thêm dòng này
                      // Refresh lại trang để cập nhật giao diện máy trống
                      window.location.reload();
                    } catch (e) {
                      console.error("Lỗi đồng bộ giải phóng ví:", e);
                    }
                  } catch (e) {
                    console.error(e);
                    setMessage('Lỗi khi huỷ & hoàn tiền: ' + (e?.message || ''));
                  } finally { setIsProcessing(false); }
                }}
              >
                Hủy và hoàn tiền
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;