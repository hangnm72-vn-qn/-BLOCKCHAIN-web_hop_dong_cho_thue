import { useEffect, useState } from 'react';
import { BrowserProvider, formatEther } from 'ethers';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0.0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');

  // Lấy số dư ETH của một địa chỉ ví
  const updateWalletData = async (provider, address) => {
    const balance = await provider.getBalance(address);
    setWalletAddress(address);
    setWalletBalance(Number(formatEther(balance)).toFixed(4));
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
        return;
      }

      await updateWalletData(provider, accounts[0]);
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
          />
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 text-center mt-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
            </Routes>
          </main>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;