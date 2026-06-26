import React, { useEffect, useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';
import {
  getProductById,
  updateProductStatus,
  provisionProduct
} from "../Service - Ân/productService";
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import {
  createRentalFactoryContract,
  createSingleContract,
  SEPOLIA_CHAIN_ID
} from '../contracts/rentalFactoryConfig';

function ProductDetailWeb3Synced() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rentHours, setRentHours] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contractId, setContractId] = useState(null);
  const [message, setMessage] = useState('');
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProductById(id);
        setProduct(data);
      } catch (error) {
        console.error('Lỗi lấy chi tiết sản phẩm:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Tìm địa chỉ SingleServerRental/packageAddress của gói máy
  const resolvePackageAddress = async (factory, currentProduct, rentPricePerHour) => {
    if (currentProduct.packageAddress) return currentProduct.packageAddress;
    if (currentProduct.contractAddress) return currentProduct.contractAddress;

    const packageIds = await factory.getPackagesByOwner(currentProduct.ownerAddress);
    const perHourOnChain = parseUnits(String(rentPricePerHour), 18);

    for (let i = 0; i < packageIds.length; i++) {
      const pkgId = packageIds[i];
      const info = await factory.getPackageInfo(pkgId);

      try {
        if (info.pricePerHour.toString() === perHourOnChain.toString()) {
          return await factory.getPackageAddress(pkgId);
        }
      } catch (e) {
        console.warn('Không đọc được packageInfo:', e);
      }
    }

    throw new Error('Không tìm thấy địa chỉ SingleServerRental/packageAddress của gói máy.');
  };

  // Lấy contractId từ event RentalCreated trong receipt
  const getContractIdFromReceipt = (receipt, singleContract) => {
    for (const log of receipt.logs) {
      try {
        const parsedLog = singleContract.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });

        if (parsedLog?.name === 'RentalCreated') {
          return (
            parsedLog.args.contractId ??
            parsedLog.args._contractId ??
            parsedLog.args.rentalId ??
            parsedLog.args[0]
          );
        }
      } catch (e) {
        // Bỏ qua log không thuộc ABI của SingleServerRental
      }
    }

    return null;
  };

  const handleRentServer = async () => {
    try {
      setIsProcessing(true);
      setMessage('');

      if (!window.ethereum) {
        setMessage('Vui lòng cài đặt MetaMask để tiếp tục.');
        return;
      }

      if (!product) {
        setMessage('Không tìm thấy thông tin máy chủ.');
        return;
      }

      const rentalHoursNumber = Number(rentHours);

      if (!rentalHoursNumber || rentalHoursNumber < 1) {
        setMessage('Số giờ thuê phải lớn hơn hoặc bằng 1.');
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (BigInt(network.chainId) !== SEPOLIA_CHAIN_ID) {
        setMessage('Vui lòng chuyển MetaMask sang mạng Sepolia.');
        return;
      }

      const signer = await provider.getSigner();
      const factory = createRentalFactoryContract(signer);

      // 1. Lấy địa chỉ contract gói máy riêng SingleServerRental
      setMessage('Đang xác định contract gói máy...');
      const packageAddress = await resolvePackageAddress(
        factory,
        product,
        product.pricePerHour
      );

      const single = createSingleContract(packageAddress, signer);

      // 2. Lấy token và approve cho SingleServerRental
      let tokenAddress;

      try {
        tokenAddress = await single.token();
      } catch (e) {
        tokenAddress = await factory.token();
      }

      const tokenContract = new Contract(
        tokenAddress,
        [
          'function decimals() view returns (uint8)',
          'function approve(address,uint256) returns (bool)'
        ],
        signer
      );

      let tokenDecimals = 18;

      try {
        tokenDecimals = Number(await tokenContract.decimals());
      } catch {
        tokenDecimals = 18;
      }

      const totalPrice = Number(product.pricePerHour) * rentalHoursNumber;
      const totalAmount = parseUnits(String(totalPrice), tokenDecimals);

      setMessage('Đang phê duyệt token trên MetaMask...');
      const approveTx = await tokenContract.approve(packageAddress, totalAmount);
      await approveTx.wait();

      // 3. Gọi rentServer thật
      setMessage('Đang thuê máy trên smart contract...');

      let predictedContractId = null;

      try {
        predictedContractId = await single.rentServer.staticCall(rentalHoursNumber);
      } catch (e) {
        console.warn('Không staticCall được rentServer, sẽ lấy contractId từ event RentalCreated.');
      }

      const rentTx = await single.rentServer(rentalHoursNumber);
      const receipt = await rentTx.wait();

      let realContractId = getContractIdFromReceipt(receipt, single);
      realContractId = realContractId ?? predictedContractId;

      if (realContractId === null || realContractId === undefined) {
        throw new Error('Không lấy được contractId từ event RentalCreated.');
      }

      setContractId(String(realContractId));

      // 4. Gọi backend bàn giao VPS
      setMessage('Smart contract đã tạo phiên thuê. Đang bàn giao VPS...');
      const renterAddress = await signer.getAddress();

      const prov = await provisionProduct(product._id, renterAddress);

      if (!prov || !prov.success) {
        throw new Error('Backend chưa bàn giao được VPS.');
      }

      const data = prov.data || prov;

      const rentalInfo = {
        message: data.message || prov.message || 'Máy đã được bàn giao thành công.',
        ipAddress: data.ipAddress || data.ip || '',
        port: data.port || '22',
        username: data.username || '',
        password: data.password || '',
      };

      setCredentials(rentalInfo);

      // 5. Lưu dữ liệu cho Dashboard dùng confirmRental/cancelByRenter
      localStorage.setItem('trustrent.activeProductId', product._id);
      localStorage.setItem('trustrent.activeContractId', String(realContractId));
      localStorage.setItem('trustrent.activePackageAddress', packageAddress);
      localStorage.removeItem('trustrent.rentalConfirmed');

      localStorage.setItem('trustrent.rentalIp', rentalInfo.ipAddress);
      localStorage.setItem('trustrent.rentalPort', rentalInfo.port);
      localStorage.setItem('trustrent.rentalUsername', rentalInfo.username);
      localStorage.setItem('trustrent.rentalPassword', rentalInfo.password);

      await updateProductStatus(product._id, 'Unavailable');
      setProduct((prev) => ({ ...prev, status: 'Unavailable' }));

      setMessage(`Thuê thành công! Mã hợp đồng: ${String(realContractId)}. Đang chuyển sang Dashboard...`);

      setTimeout(() => {
        navigate('/dashboard?tab=my-rentals');
      }, 1200);
    } catch (err) {
      console.error('Lỗi thuê máy:', err);

      if (err?.code === 4001) {
        setMessage('Bạn đã hủy giao dịch trên MetaMask.');
        return;
      }

      setMessage(err?.reason || err?.message || 'Lỗi khi thuê máy.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <p className="text-slate-400 text-center mt-10">
        Đang tải thông tin máy chủ...
      </p>
    );
  }

  if (!product) {
    return (
      <p className="text-slate-400 text-center mt-10">
        Không tìm thấy thông tin máy chủ.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left mt-4">
      {/* CỘT TRÁI */}
      <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl h-[500px]">
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/600x500?text=No+Image'}
          alt={product.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* CỘT PHẢI */}
      <div className="flex flex-col justify-between space-y-6">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-950/50 border border-blue-900/50 px-3 py-1 rounded-full">
            Chi Tiết Hợp Đồng Thuê
          </span>

          <h2 className="text-3xl font-bold text-white mt-3 mb-2">
            {product.title}
          </h2>

          <p className="text-xs text-slate-500 mb-6">
            Địa chỉ ví chủ máy (Lessor):{' '}
            <span className="text-slate-400 font-mono">
              {product.ownerAddress}
            </span>
          </p>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              🔍 Chi tiết cấu hình & Tài nguyên:
            </h4>
            <p className="text-sm text-emerald-400 font-medium">
              {product.description}
            </p>
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
                  <span className="text-xs font-medium text-slate-400">
                    10 Phút thử nghiệm đầu tiên
                  </span>
                </div>

                <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                  Được quyền hủy, hoàn cọc 100%
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
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => navigate('/')}
            >
              Quay Lại Trang Chủ
            </Button>

            {product.status === 'Available' ? (
              <Button
                variant="primary"
                className="flex-[2] font-bold text-base bg-emerald-600 hover:bg-emerald-500"
                onClick={handleRentServer}
                disabled={isProcessing}
              >
                {isProcessing
                  ? 'Đang xử lý...'
                  : `⚡ Thuê Ngay (${Number(product.pricePerHour) * Number(rentHours || 1)} Token)`}
              </Button>
            ) : (
              <Button
                variant="primary"
                className="flex-[2] font-bold text-base bg-slate-600 cursor-not-allowed"
                disabled
              >
                Máy chủ đã có người thuê
              </Button>
            )}
          </div>

          {message && (
            <p
              className={`text-xs ${message.includes('thành công') || message.includes('Thành công')
                ? 'text-emerald-400'
                : 'text-rose-400'
                }`}
            >
              {message}
            </p>
          )}

          {contractId !== null && (
            <p className="text-xs text-slate-400">
              Mã hợp đồng on-chain:{' '}
              <span className="font-mono text-blue-400 font-bold">
                {contractId}
              </span>
            </p>
          )}

          {credentials && (
            <div className="mt-3 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm">
              <h4 className="text-xs font-bold text-slate-300 mb-2">
                Thông tin bàn giao VPS
              </h4>

              <div className="text-xs space-y-2">
                <div className="text-emerald-400 font-medium">
                  ✨ {credentials.message}
                </div>

                <div>
                  Địa chỉ IP kết nối:{' '}
                  <span className="font-mono text-blue-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {credentials.ipAddress || 'Đang cập nhật'}
                  </span>
                </div>

                <div>
                  Port:{' '}
                  <span className="font-mono text-blue-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {credentials.port || '22'}
                  </span>
                </div>

                <div>
                  Username:{' '}
                  <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {credentials.username || 'Đang cập nhật'}
                  </span>
                </div>

                <div>
                  Password:{' '}
                  <span className="font-mono text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {credentials.password || 'Đang cập nhật'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailWeb3Synced;