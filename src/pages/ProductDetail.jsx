import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
// ĐÃ SỬA: Import thêm hàm terminateProduct từ Service để dứt điểm xoá ví thuê
import { getProductById, updateProductStatus, provisionProduct, terminateProduct } from "../Service - Ân/productService";
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserProvider, Contract, formatEther, parseUnits } from 'ethers';
import { createRentalFactoryContract, createSingleContract, SEPOLIA_CHAIN_ID } from '../contracts/rentalFactoryConfig';

const CONTRACT_STATUS_LABELS = {
  0: 'Pending',
  1: 'AwaitingOwnerReview',
  2: 'NegotiatingDiscount',
  3: 'Active',
  4: 'Completed',
  5: 'Cancelled',
};

const MAX_RENTAL_HOURS = 8760;

function getContractStatusLabel(statusValue) {
  const numericStatus = Number(statusValue ?? -1);
  return CONTRACT_STATUS_LABELS[numericStatus] || `Unknown(${numericStatus})`;
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rentHours, setRentHours] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contractId, setContractId] = useState(null);
  const [message, setMessage] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [contractStatus, setContractStatus] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [tokenAddress, setTokenAddress] = useState('');
  const [contractRenter, setContractRenter] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      const data = await getProductById(id);
      setProduct(data);
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  const resolvePackageAddress = async (signer) => {
    if (product?.packageAddress) return product.packageAddress;
    if (product?.contractAddress) return product.contractAddress;

    const factory = createRentalFactoryContract(signer);
    const packageIds = await factory.getPackagesByOwner(product.ownerAddress);
    const perHourOnChain = parseUnits(String(product.pricePerHour), 18);

    for (let i = 0; i < packageIds.length; i++) {
      const pkgId = packageIds[i];
      const info = await factory.getPackageInfo(pkgId);
      try {
        if (info.pricePerHour.toString() === perHourOnChain.toString()) {
          return await factory.getPackageAddress(pkgId);
        }
      } catch (e) {
        // ignore and continue
      }
    }

    return '';
  };

  const syncContractStatus = async (packageAddress, signer, currentContractId) => {
    if (!packageAddress || !currentContractId) {
      setContractStatus('');
      return '';
    }

    try {
      const single = createSingleContract(packageAddress, signer);
      const contractData = await single.getContract(currentContractId);
      const nextStatus = getContractStatusLabel(contractData?.status);
      setContractStatus(nextStatus);
      return nextStatus;
    } catch (e) {
      setContractStatus('');
      return '';
    }
  };

  const refreshWalletBalance = async (signer) => {
    try {
      const provider = signer.provider || new BrowserProvider(window.ethereum);
      const factory = createRentalFactoryContract(signer);
      const currentTokenAddress = await factory.token();
      const tokenContract = new Contract(
        currentTokenAddress,
        ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
        provider
      );
      const address = await signer.getAddress();
      const decimals = Number(await tokenContract.decimals());
      const rawBalance = await tokenContract.balanceOf(address);
      const balance = Number(rawBalance) / 10 ** decimals;
      return { balance, address, tokenAddress: currentTokenAddress };
    } catch (e) {
      return null;
    }
  };

  const syncWalletContext = async (signer) => {
    try {
      const factory = createRentalFactoryContract(signer);
      const currentTokenAddress = await factory.token();
      const address = await signer.getAddress();
      setWalletAddress(address);
      setTokenAddress(currentTokenAddress);
      return { address, tokenAddress: currentTokenAddress };
    } catch (e) {
      return null;
    }
  };

  if (loading) return <p className="text-slate-400 text-center mt-10">Đang tải thông tin máy chủ...</p>;
  if (!product) return <p className="text-slate-400 text-center mt-10">Không tìm thấy thông tin máy chủ.</p>;

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
              max={MAX_RENTAL_HOURS}
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
                    await syncWalletContext(signer);
                    const factory = createRentalFactoryContract(signer);

                    const tokenAddress = await factory.token();
                    const tokenContract = new Contract(
                      tokenAddress,
                      [
                        'function approve(address,uint256) returns (bool)',
                        'function decimals() view returns (uint8)',
                        'function balanceOf(address) view returns (uint256)'
                      ],
                      signer
                    );

                    let decimals = 18;
                    try {
                      decimals = Number(await tokenContract.decimals());
                    } catch (e) {
                      decimals = 18;
                    }

                    const parsedRentHours = Number(rentHours);
                    if (!Number.isInteger(parsedRentHours) || parsedRentHours < 1 || parsedRentHours > MAX_RENTAL_HOURS) {
                      setMessage(`Số giờ thuê phải là số nguyên từ 1 đến ${MAX_RENTAL_HOURS} giờ (tương đương 365 ngày).`);
                      return;
                    }

                    const totalPrice = Number(product.pricePerHour) * parsedRentHours;
                    if (totalPrice <= 0) {
                      setMessage('Số giờ thuê không hợp lệ.');
                      return;
                    }

                    const totalAmount = parseUnits(String(totalPrice), decimals);
                    const walletAddress = await signer.getAddress();
                    const rawBalance = await tokenContract.balanceOf(walletAddress);
                    const walletBalance = Number(rawBalance) / 10 ** decimals;
                    const nativeBalance = Number(formatEther(await provider.getBalance(walletAddress)));

                    if (walletBalance < totalPrice) {
                      if (walletBalance === 0) {
                        setMessage(`Bạn đang có ${nativeBalance.toFixed(4)} ETH trên Sepolia, nhưng không có token ERC20 của hợp đồng này. Hệ thống thuê dùng token ERC20, không dùng ETH.`);
                      } else {
                        setMessage(`Ví của bạn chưa đủ token để thuê. Cần tối thiểu ${totalPrice} token nhưng hiện có ${walletBalance.toFixed(6)} token. ETH hiện có: ${nativeBalance.toFixed(4)}.`);
                      }
                      return;
                    }

                    const packageAddress = await resolvePackageAddress(signer);
                    if (!packageAddress) {
                      setMessage('Không tìm thấy contract gói máy trên hệ thống database.');
                      return;
                    }

                    const single = createSingleContract(packageAddress, signer);

                    const approveTx = await tokenContract.approve(packageAddress, totalAmount);
                    setTxHash(approveTx.hash);
                    setMessage('Đang phê duyệt token trên MetaMask...');
                    await approveTx.wait();

                    const rentTx = await single.rentServer(parsedRentHours);
                    setTxHash(rentTx.hash);
                    setMessage('Gửi lệnh thuê, chờ xử lý trên chain...');
                    await rentTx.wait();

                    let nextId = await single.nextContractId();
                    const newContractId = Number(nextId.toString()) - 1;
                    setContractId(newContractId);
                    await syncContractStatus(packageAddress, signer, newContractId);

                    const renterAddress = await signer.getAddress();

                    try {
                      const prov = await provisionProduct(product._id, renterAddress);
                      if (prov && prov.data && prov.data.credentials) {
                        setCredentials(prov.data.credentials);
                      }
                    } catch (e) {}

                    setMessage('Thuê thành công. ContractId: ' + newContractId);
                  } catch (err) {
                    console.error(err);
                    const reason = err?.reason || err?.error?.message || err?.message || 'Lỗi khi thuê máy.';
                    if (reason.includes('Insufficient balance')) {
                      setMessage('Giao dịch bị từ chối bởi hợp đồng vì ví không đủ token để khóa cọc.');
                    } else if (reason.includes('Rental period too long')) {
                      setMessage('Giao dịch bị từ chối vì số giờ thuê vượt giới hạn cho phép của hợp đồng.');
                    } else if (reason.includes('User rejected')) {
                      setMessage('Bạn đã huỷ giao dịch trong MetaMask.');
                    } else {
                      setMessage(reason);
                    }
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
          {walletAddress && (
            <p className="text-[11px] text-slate-500 break-all">
              Ví đang kết nối: <span className="text-slate-300 font-mono">{walletAddress}</span>
            </p>
          )}

          {tokenAddress && (
            <p className="text-[11px] text-slate-500 break-all">
              Token contract: <span className="text-slate-300 font-mono">{tokenAddress}</span>
            </p>
          )}

          {contractRenter && (
            <p className="text-[11px] text-slate-500 break-all">
              Địa chỉ nhận hoàn tiền trong hợp đồng: <span className="text-slate-300 font-mono">{contractRenter}</span>
            </p>
          )}

          {message && (
            <p className={`text-xs ${message.includes('thành công') ? 'text-emerald-400' : 'text-rose-400'}`}>{message}</p>
          )}

          {contractStatus && (
            <p className="text-[11px] text-slate-400 mt-1">
              Trạng thái hợp đồng: <span className="text-slate-200 font-semibold">{contractStatus}</span>
            </p>
          )}

          {txHash && (
            <div className="mt-2 text-[11px] break-all text-blue-400">
              Tx hash: {' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {txHash}
              </a>
            </div>
          )}

          {credentials && (
            <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm">
              <h4 className="text-xs font-bold text-slate-300 mb-2">Thông tin bàn giao VPS</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>IP: <span className="font-mono">{credentials.ip}</span></div>
                <div>Port: <span className="font-mono">{credentials.port}</span></div>
                <div>Username: <span className="font-mono">{credentials.username}</span></div>
                <div>Password: <span className="font-mono">{credentials.password}</span></div>
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
                    
                    const packageAddress = await resolvePackageAddress(signer);
                    if (!packageAddress) return setMessage('Thiếu địa chỉ Contract!');

                    const currentStatus = await syncContractStatus(packageAddress, signer, contractId);
                    if (currentStatus !== 'Pending') {
                      setMessage(`Không thể xác nhận OK vì hợp đồng hiện đang ở trạng thái ${currentStatus || 'không xác định'}.`);
                      return;
                    }

                    const single = createSingleContract(packageAddress, signer);
                    const tx = await single.confirmRental(contractId);
                    await tx.wait();
                    setMessage('Xác nhận OK đã được ghi nhận trên chain.');
                    
                    try { await updateProductStatus(product._id, 'Active'); } catch (e) {}
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
                    
                    const packageAddress = await resolvePackageAddress(signer);
                    if (!packageAddress) return setMessage('Thiếu địa chỉ Contract!');

                    const currentStatus = await syncContractStatus(packageAddress, signer, contractId);
                    if (currentStatus !== 'NegotiatingDiscount') {
                      setMessage('Không thể chấp nhận giảm giá vì hợp đồng chưa ở trạng thái thương lượng giảm giá. Owner cần đề xuất mức giảm giá trước.');
                      return;
                    }

                    const single = createSingleContract(packageAddress, signer);
                    const tx = await single.acceptDiscount(contractId);
                    await tx.wait();
                    setTxHash(tx.hash);

                    const contractData = await single.getContract(contractId);
                    const nextStatus = getContractStatusLabel(contractData?.status);
                    setContractStatus(nextStatus);
                    setContractRenter(contractData?.renter || '');

                    const balanceAfterAccept = await refreshWalletBalance(signer);
                    if (balanceAfterAccept !== null) {
                      const { balance, address } = balanceAfterAccept;
                      setMessage(`Đã chấp nhận giảm giá. Hợp đồng đã chuyển sang ${nextStatus}. Tiền sẽ về ví ${address}. Số dư ví hiện tại khoảng ${balance.toFixed(6)} token.`);
                    } else {
                      setMessage('Đã chấp nhận giảm giá, máy hoạt động tiếp.');
                    }
                    
                    try { await updateProductStatus(product._id, 'Active'); } catch (e) {}
                  } catch (e) {
                    console.error(e);
                    setMessage('Lỗi khi chấp nhận giảm giá: ' + (e?.message || ''));
                  } finally { setIsProcessing(false); }
                }}
              >
                Đồng ý giảm giá 20%
              </Button>

              {/* NHÁNH 1 (PHẦN B) & NHÁNH 3: Khách từ chối -> Hủy, hoàn tiền & xóa ví renterAddress khỏi DB */}
              <Button
                variant="secondary"
                className="flex-1 bg-rose-950/40 text-rose-400 border border-rose-900/60 hover:bg-rose-900/40"
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    setMessage('Gửi lệnh hoàn tiền (reject) lên chain...');
                    const provider = new BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    
                    const packageAddress = await resolvePackageAddress(signer);
                    if (!packageAddress) return setMessage('Thiếu địa chỉ Contract!');

                    const currentStatus = await syncContractStatus(packageAddress, signer, contractId);
                    if (currentStatus !== 'NegotiatingDiscount') {
                      setMessage('Không thể hoàn tiền vì hợp đồng hiện chưa ở trạng thái thương lượng giảm giá.');
                      return;
                    }

                    const single = createSingleContract(packageAddress, signer);
                    const tx = await single.rejectDiscount(contractId);
                    await tx.wait();
                    setTxHash(tx.hash);

                    const contractData = await single.getContract(contractId);
                    const nextStatus = getContractStatusLabel(contractData?.status);
                    setContractStatus(nextStatus);
                    setContractRenter(contractData?.renter || '');

                    setMessage('Đã hủy trên chain thành công! Đang dọn dẹp database...');

                    const balanceAfterRefund = await refreshWalletBalance(signer);
                    if (balanceAfterRefund !== null) {
                      const { balance, address } = balanceAfterRefund;
                      setMessage(`Đã hủy trên chain thành công. Hợp đồng đã chuyển sang ${nextStatus}. Tiền hoàn sẽ về ví ${contractData?.renter || address}. Số dư ví hiện tại khoảng ${balance.toFixed(6)} token.`);
                    }
                    
                    // Cập nhật trạng thái máy về Available trước
                    try { await updateProductStatus(product._id, 'Available'); } catch (e) {}
                    
                    // 🔥 ĐÃ VÁ LỖI: Gọi API dứt điểm xoá hẳn ví renterAddress khỏi DB
                    try { 
                      await terminateProduct(product._id); 
                      setMessage('Đã hủy & hoàn tiền 100% cho khách.');
                      // Refresh lại trang để cập nhật giao diện máy trống sau 1.5s
                      setTimeout(() => {
                        window.location.reload();
                      }, 1500);
                    } catch (dbErr) {
                      console.error("Lỗi đồng bộ giải phóng ví dưới DB:", dbErr);
                    }
                  } catch (e) {
                    console.error(e);
                    setMessage('Lỗi khi hủy: ' + (e?.message || ''));
                  } finally { 
                    setIsProcessing(false); 
                  }
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