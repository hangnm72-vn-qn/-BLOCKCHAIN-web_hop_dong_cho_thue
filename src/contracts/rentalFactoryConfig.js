import { Contract } from 'ethers';
import rentalFactoryAbi from '../assets/smartcontract/ServerRentalFactory.json';
import rentalContractAbi from '../assets/smartcontract/SingleServerRental.json';


// Địa chỉ của RentalFactory đã deploy trên Sepolia.
export const RENTAL_FACTORY_ADDRESS = '0xB7BA323CF8634ED2a51bD6f96034E7e53D728A3a';


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



