import { useEffect, useState } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import Navbar from './components/Navbar';
import {
  RENTAL_FACTORY_ADDRESS,
  SEPOLIA_CHAIN_ID,
  createRentalFactoryContract,
} from './contracts/rentalFactoryConfig';

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0.0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [factoryTotalContracts, setFactoryTotalContracts] = useState('0');
  const [factoryArbitrator, setFactoryArbitrator] = useState('');
  const [factoryStatus, setFactoryStatus] = useState('Chưa kết nối contract');

  // Lấy số dư ETH của một địa chỉ ví rồi cập nhật vào state để hiển thị lên UI.
  const updateWalletData = async (provider, address) => {
    const balance = await provider.getBalance(address);
    setWalletAddress(address);
    setWalletBalance(Number(formatEther(balance)).toFixed(4));
  };

  // Khởi tạo RentalFactory bằng ABI + address rồi đọc dữ liệu on-chain để xác nhận contract hoạt động.
  const syncFactoryData = async (provider) => {
    try {
      const network = await provider.getNetwork();

      if (network.chainId !== SEPOLIA_CHAIN_ID) {
        setFactoryStatus('Hợp đồng chỉ hoạt động trên Sepolia');
        setFactoryTotalContracts('0');
        setFactoryArbitrator('');
        setWalletError('Vui lòng chuyển MetaMask sang mạng Sepolia để đọc Smart Contract.');
        return;
      }

      const rentalFactoryContract = createRentalFactoryContract(provider);

      const [totalContracts, arbitrator] = await Promise.all([
        rentalFactoryContract.getTotalRentalContracts(),
        rentalFactoryContract.arbitrator(),
      ]);

      setFactoryTotalContracts(totalContracts.toString());
      setFactoryArbitrator(arbitrator);
      setFactoryStatus('Đã kết nối RentalFactory trên Sepolia');
      setWalletError('');
    } catch (error) {
      setFactoryStatus('Không đọc được dữ liệu contract');
      setFactoryTotalContracts('0');
      setFactoryArbitrator('');
      setWalletError(error instanceof Error ? error.message : 'Không thể đọc Smart Contract.');
    }
  };

  // Khi người dùng bấm Connect Wallet, hàm này gọi MetaMask để xin quyền kết nối.
  // Nếu kết nối thành công, app sẽ lấy địa chỉ ví và số dư ETH để hiển thị.
  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletError('Vui lòng cài đặt MetaMask để kết nối ví.');
      return;
    }

    try {
      setIsConnecting(true);
      setWalletError('');

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);

      if (!accounts.length) {
        setWalletError('Không tìm thấy tài khoản ví nào.');
        return;
      }

      await updateWalletData(provider, accounts[0]);

      // Sau khi lấy được ví, app tạo contract instance để đọc dữ liệu của RentalFactory.
      await syncFactoryData(provider);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : 'Không thể kết nối ví.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Lắng nghe MetaMask khi người dùng đổi tài khoản hoặc đổi mạng.
  // Mục đích là để UI luôn đồng bộ với ví thực tế mà không cần tải lại thủ công.
  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    const provider = new BrowserProvider(window.ethereum);

    const handleAccountsChanged = async (accounts) => {
      if (!accounts.length) {
        setWalletAddress('');
        setWalletBalance('0.0');
        setFactoryTotalContracts('0');
        setFactoryArbitrator('');
        setFactoryStatus('Chưa kết nối contract');
        return;
      }

      await updateWalletData(provider, accounts[0]);
      await syncFactoryData(provider);
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar
        onConnectWallet={connectWallet}
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        isConnecting={isConnecting}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 text-center mt-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <h2 className="text-2xl font-semibold text-slate-100">
            Hệ thống cho thuê tài sản đảm bảo bằng Smart Contract
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Giao diện chặng 1 đang được xây dựng...
          </p>

          {/* Hai khối này hiển thị dữ liệu ví đã kết nối để người dùng kiểm tra nhanh. */}
          <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Địa chỉ ví</p>
              <p className="mt-2 break-all text-lg font-semibold text-slate-100">
                {walletAddress || 'Chưa kết nối'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Số dư tài khoản</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {walletAddress ? `${walletBalance} ETH` : '0.0 ETH'}
              </p>
            </div>
          </div>

          {/* Phần này xác nhận React đã khởi tạo ethers.Contract cho RentalFactory trên Sepolia. */}
          <div className="mt-6 grid gap-4 text-left lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Smart Contract</p>
              <p className="mt-2 break-all text-sm font-semibold text-slate-100">
                {RENTAL_FACTORY_ADDRESS}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tổng số contract</p>
              <p className="mt-2 text-lg font-semibold text-slate-100">{factoryTotalContracts}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Arbitrator</p>
              <p className="mt-2 break-all text-sm font-semibold text-slate-100">
                {factoryArbitrator || 'Chưa đọc được'}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-400">{factoryStatus}</p>

          {walletError && (
            <p className="mt-4 rounded-2xl border border-red-900/50 bg-red-950/60 px-4 py-3 text-sm text-red-200">
              {walletError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;