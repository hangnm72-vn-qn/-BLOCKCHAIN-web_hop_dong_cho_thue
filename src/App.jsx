import { useEffect, useState } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Dashboard from './pages/Dashboard';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createRentalFactoryContract, SEPOLIA_CHAIN_ID } from './contracts/rentalFactoryConfig';

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0.0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [factoryTotalContracts, setFactoryTotalContracts] = useState('0');
  const [factoryToken, setFactoryToken] = useState('');
  const [factoryStatus, setFactoryStatus] = useState('Chưa kết nối contract');
  const [role, setRole] = useState('renter'); // Mặc định ban đầu là 'renter'

  // Lấy số dư ETH của một địa chỉ ví
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
        setFactoryToken('');
        setWalletError('Vui lòng chuyển MetaMask sang mạng Sepolia để đọc Smart Contract.');
        return;
      }

      const rentalFactoryContract = createRentalFactoryContract(provider);

      const [totalContracts, tokenAddress] = await Promise.all([
        rentalFactoryContract.getTotalPackages(),
        rentalFactoryContract.token(),
      ]);

      setFactoryTotalContracts(totalContracts.toString());
      setFactoryToken(tokenAddress);
      setFactoryStatus('Đã kết nối RentalFactory trên Sepolia');
      setWalletError('');
    } catch (error) {
      setFactoryStatus('Không đọc được dữ liệu contract');
      setFactoryTotalContracts('0');
      setFactoryToken('');
      setWalletError(error instanceof Error ? error.message : 'Không thể đọc Smart Contract.');
    }
  };

  // Kích hoạt MetaMask để xin quyền kết nối
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

  // Lắng nghe sự kiện đổi ví từ MetaMask
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
        setFactoryToken('');
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
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        <div>
          <Navbar
            onConnectWallet={connectWallet}
            walletAddress={walletAddress}
            walletBalance={walletBalance}
            isConnecting={isConnecting}
            currentRole={role}
            onChangeRole={setRole}
          />
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 text-center mt-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/dashboard" element={<Dashboard currentRole={role} />} />
            </Routes>
          </main>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;