import { Contract } from 'ethers';
import rentalFactoryAbi from '../../Smart_Contract/RentalFactory.abi.json';

// Địa chỉ của RentalFactory đã deploy trên Sepolia.
export const RENTAL_FACTORY_ADDRESS = '0x4E6629288b612C37F100EF61257C4DE071b7fac2';

// Sepolia có chainId là 11155111.
export const SEPOLIA_CHAIN_ID = 11155111n;

// Tạo instance hợp đồng để code React có thể gọi các hàm đọc/ghi trên blockchain.
export function createRentalFactoryContract(providerOrSigner) {
  return new Contract(RENTAL_FACTORY_ADDRESS, rentalFactoryAbi, providerOrSigner);
}
