import { Contract } from 'ethers';
import rentalFactoryAbi from '../assets/smartcontract/RentalFactory.abi.json';
import rentalContractAbi from '../assets/smartcontract/RentalContract.abi.json';

// Địa chỉ contract factory được lấy từ file .env để dễ đổi giữa các môi trường.
// Vite chỉ expose những biến có tiền tố VITE_ qua import.meta.env.
export const RENTAL_FACTORY_ADDRESS = import.meta.env.VITE_RENTAL_FACTORY_ADDRESS;

// Trả về ethers.Contract của factory để gọi các hàm như createRentalContract(...).
export const getRentalFactoryContract = (providerOrSigner) => {
  if (!RENTAL_FACTORY_ADDRESS) {
    throw new Error('Thiếu VITE_RENTAL_FACTORY_ADDRESS trong file .env.');
  }

  return new Contract(RENTAL_FACTORY_ADDRESS, rentalFactoryAbi, providerOrSigner);
};

// Trả về ethers.Contract của một rental contract cụ thể khi đã có địa chỉ instance.
// Hàm này dùng cho chặng sau, khi factory tạo ra contract con mới trên chain.
export const getRentalContract = (contractAddress, providerOrSigner) => {
  return new Contract(contractAddress, rentalContractAbi, providerOrSigner);
};

export { rentalFactoryAbi, rentalContractAbi };
