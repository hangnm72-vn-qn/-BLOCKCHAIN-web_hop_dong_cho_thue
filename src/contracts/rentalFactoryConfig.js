import { Contract } from 'ethers';
import rentalFactoryAbi from '../assets/smartcontract/RentalFactory.abi.json';
import rentalContractAbi from '../assets/smartcontract/RentalContract.abi.json';

// Địa chỉ của RentalFactory đã deploy trên Sepolia.
export const RENTAL_FACTORY_ADDRESS = '0x79B32d251CA4205c00630706F3BF73C840C6AAf4';

// Sepolia có chainId là 11155111.
export const SEPOLIA_CHAIN_ID = 11155111n;

// Tạo instance hợp đồng để code React có thể gọi các hàm đọc/ghi trên blockchain.
export function createRentalFactoryContract(providerOrSigner) {
  return new Contract(RENTAL_FACTORY_ADDRESS, rentalFactoryAbi, providerOrSigner);
}

// Tạo instance của SingleServerRental (RentalContract) từ địa chỉ contract
export function createSingleContract(contractAddress, providerOrSigner) {
  return new Contract(contractAddress, rentalContractAbi, providerOrSigner);
}
