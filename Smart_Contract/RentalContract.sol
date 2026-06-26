// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Bộ quy chuẩn IERC20 về tính năng bắt buộc phải có của tiền gồm các quyền như chuyển tiền, rút tiền, kiểm tra ví, ủy quyền rút hộ 

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

// SINGLE CONTRACT
    // Gán nhãn cho các trạng thái. Tách 2 enum để phân biệt trạng thái của Tài sản và Dòng tiền/Hợp đồng
    contract SingleServerRental {
    enum ServerStatus {
        Available,      // Máy trống, sẵn sàng cho thuê
        Pending,        // Chờ xác nhận (10 phút thử nghiệm)
        Active,         // Đang hoạt động (đã xác nhận, tiền chuyển cho owner)
        Completed,      // Hoàn thành
        Cancelled,      // Hủy hợp đồng
        Unlisted        // Đã gỡ sản phẩm xuống
    }
    
    enum TransactionStatus {
        Pending,            // Tiền bị giam, chờ xác nhận/phát hiện lỗi
        AwaitingOwnerReview, // Người thuê phát hiện lỗi, chờ người cho thuê kiểm tra
        Active,             // Hợp đồng được xác nhận, tiền đã chuyển owner
        Completed,          // Hoàn tất
        Cancelled           // Hủy
    }
    
    // Tạo bản ghi để ghi nhận các thông tin, dữ liệu. Gộp các thuộc tính thành một đối tượng duy nhất
    // Tạo 2 bản ghi: 1 cái ghi nhận cái thông tin niêm yết, 1 cái ghi nhận dấu vết của dòng tiền 
    struct ServerPackage {
        string configType;              // VD: "GPU RTX 3090"
        uint256 pricePerHour;           // Giá Token/giờ
        address owner;                  // Người cho thuê
        ServerStatus status;            // Trạng thái máy
        uint256 createdAt;              // Thời điểm đăng
        uint256 totalRentals;           // Tổng số hợp đồng hoàn thành
    }
    
    struct RentalContract {
        uint256 id;                     // Mã hợp đồng 
        address renter;                 // Người thuê
        uint256 rentalHours;            // Số giờ thuê
        uint256 totalPrice;             // Tổng giá gốc (tiền bị giam ban đầu)
        uint256 depositAmount;          // Tiền cọc (bị khóa)
        uint256 finalPrice;             // Giá cuối cùng sau thương lượng
        uint256 createdAt;              // Thời điểm bấm nút thuê 
        uint256 startTime;              // Thời điểm hợp đồng được xác nhận
        uint256 endTime;                // Thời điểm hợp đồng kết thúc
        uint256 confirmationDeadline;   // Deadline 10 phút để kiểm tra
        TransactionStatus status;       // Trạng thái của dòng tiền
        bool renterReportedIssue;       // Người thuê có phát hiện lỗi không?
    }
    
    // Biến trạng thái (Ghi nhận vĩnh viễn trên Blockchain)
    
    IERC20 public token;
    address public factory;             // Địa chỉ Factory
    address payable public owner;       // Người cho thuê
    
    ServerPackage public package;
    
    uint256 public nextContractId = 1;
    uint256 public escrowBalance;       // Tổng tiền đang bị giam
    
    mapping(uint256 => RentalContract) public contracts; // Truy vấn nhanh các thông tin về hợp đồng
    mapping(address => uint256[]) public userContracts;
    mapping(address => uint256) public userEscrow;
    
// Hàm thông báo sự kiện 
    // Khi một chiếc máy chủ mới được chủ máy đăng lên sàn
    event PackageCreated(
        string configType,
        uint256 pricePerHour,
        address indexed owner, // Lọc máy theo ví chủ thuê 
        uint256 createdAt
    );

    // Khi trạng thái máy thay đổi (Từ Trống -> Đang thuê -> Hoàn thành)
    event PackageStatusChanged(ServerStatus oldStatus, ServerStatus newStatus);
    
    // Bước 2: Người thuê tạo hợp đồng và nạp tiền
    event RentalCreated(
        uint256 indexed contractId,
        address indexed renter,
        uint256 rentalHours,
        uint256 totalPrice,
        uint256 confirmationDeadline
    );
    
    // Bước 4a: Người thuê xác nhận OK hoặc quá 10 phút -> Tiền tự động chuyển
    event RentalConfirmed(
        uint256 indexed contractId,
        address indexed renter,
        address indexed owner,
        uint256 amount
    );
    
    // Bước 4b: Người thuê phát hiện lỗi
    event IssueReported(
        uint256 indexed contractId,
        address indexed renter,
        string reason
    );
    
    // Bước 4c: Người thuê từ chối giảm giá -> Hoàn 100%
    event RentalCancelled(
        uint256 indexed contractId,
        address indexed renter,
        uint256 refundAmount,
        string reason
    );
    
    // Bước 4c: Người cho thuê hủy do không phải lỗi -> Hoàn 100%
    event RentalCancelledByOwner(
        uint256 indexed contractId,
        address indexed renter,
        uint256 refundAmount,
        string reason
    );
    
    // Bước 5: Cảnh báo sắp hết giờ
    event LowTimeWarning(
        uint256 indexed contractId,
        address indexed renter,
        uint256 minutesRemaining
    );
    
    // Bước 6: Tự động hoàn tất khi hết giờ
    event RentalAutoCompleted(
        uint256 indexed contractId,
        address indexed owner,
        uint256 duration
    );

    // Gỡ hoặc đăng lại lên sàn 
    event PackageUnlisted(address indexed owner, uint256 timestamp);
    event PackageRelisted(address indexed owner, uint256 timestamp);

    // Hàm kiểm tra điều kiện
    // Dấu "_" là vị trí chèn code của hàm chính, kiểu dữ liệu "_contractId" được quy ước để ghi nhận dữ liệu đầu vào vừa nhập
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier onlyRenter(uint256 _contractId) {
        require(msg.sender == contracts[_contractId].renter, "Only renter can call this");
        _;
    }
    
    modifier contractExists(uint256 _contractId) {
        require(contracts[_contractId].id != 0, "Contract does not exist");
        _;
    }
    
    // Hàm khởi tạo (Hàm chỉ chạy 1 lần duy nhất, thiết lập các giá trị ban đầu không thay đổi)
    
    constructor(
        address _tokenAddress,
        address _owner,
        string memory _configType,
        uint256 _pricePerHour
    ) {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_owner != address(0), "Invalid owner address");
        require(_pricePerHour > 0, "Price must be greater than 0");
        
        token = IERC20(_tokenAddress);
        factory = msg.sender;
        owner = payable(_owner);
        
        package = ServerPackage({
            configType: _configType,
            pricePerHour: _pricePerHour,
            owner: _owner,
            status: ServerStatus.Available,
            createdAt: block.timestamp,
            totalRentals: 0
        });
        
        emit PackageCreated(_configType, _pricePerHour, _owner, block.timestamp);
    }
    
// Bước 2: Người thuê tạo hợp đồng và nhận tiền
    function rentServer(uint256 _rentalHours)
        external
        returns (uint256)
    {
    // 1. Kiểm tra tính hợp lệ của biến đầu vào và trạng thái máy 
        require(_rentalHours > 0, "Hours must be greater than 0");
        require(_rentalHours <= 365 * 24, "Rental period too long");
        require(package.status == ServerStatus.Available, "Package not available");
        
        uint256 totalPrice = package.pricePerHour * _rentalHours;
        require(totalPrice > 0, "Total price must be greater than 0");
        
        require(
            token.balanceOf(msg.sender) >= totalPrice,
            "Insufficient balance"
        );
        
    // 2. Thực thi lệnh trừ tiền từ ví của khách hàng
        require(
            token.transferFrom(msg.sender, address(this), totalPrice),
            "Token transfer failed"
        );
        
        uint256 contractId = nextContractId++;
        uint256 confirmationDeadline = block.timestamp + 10 minutes;

    // 3. Khởi tạo và lưu trữ dữ liệu hợp đồng vào Blockchain
        contracts[contractId] = RentalContract({
            id: contractId,
            renter: msg.sender,
            rentalHours: _rentalHours,
            totalPrice: totalPrice,
            depositAmount: totalPrice,
            finalPrice: 0,
            createdAt: block.timestamp,
            startTime: 0,
            endTime: 0,
            confirmationDeadline: confirmationDeadline,
            status: TransactionStatus.Pending,
            renterReportedIssue: false
        });
        
        // Cập nhật trạng thái máy
        package.status = ServerStatus.Pending;

        // Ghi sổ kế toán 
        userContracts[msg.sender].push(contractId);
        escrowBalance += totalPrice;
        userEscrow[msg.sender] += totalPrice;

    // 4. Phát tín hiệu đã giao dịch xong 
        emit RentalCreated(
            contractId,
            msg.sender,
            _rentalHours,
            totalPrice,
            confirmationDeadline
        );
        
        return contractId;
    }
    
// Kịch hoạt hợp đồng và giải phóng ký quỹ
    
    function confirmRental(uint256 _contractId)
        external
        contractExists(_contractId)
        onlyRenter(_contractId)
    {
        RentalContract storage rentalContract = contracts[_contractId];

    // 1. Kiểm tra điều kiện 
        require(
            rentalContract.status == TransactionStatus.Pending,
            "Contract is not in pending state"
        );
        require(
            block.timestamp <= rentalContract.confirmationDeadline,
            "Confirmation deadline passed"
        );
        
    // 2. Cập nhật hợp đồng
        rentalContract.status = TransactionStatus.Active;
        rentalContract.startTime = block.timestamp;
        rentalContract.endTime = block.timestamp + (rentalContract.rentalHours * 1 hours);
        rentalContract.finalPrice = rentalContract.totalPrice;
        
        // Cập nhật máy
        package.status = ServerStatus.Active;

    // 3. Xử lý dòng tiền, xóa nợ ký quỹ và chuyển thẳng tiền về tài khoản người cho thuê 
        escrowBalance -= rentalContract.depositAmount;
        userEscrow[msg.sender] -= rentalContract.depositAmount;
        
        require(
            token.transfer(owner, rentalContract.totalPrice),
            "Payment to owner failed"
        );
        
        package.totalRentals++;
        
        emit RentalConfirmed(
            _contractId,
            msg.sender,
            owner,
            rentalContract.totalPrice
        );
    }
    
// Trường hợp khách thuê không phản hồi (Thời gian quá 10 phút, tiền tự chuyển về tài khoản chủ thuê)
    function autoConfirmAfterDeadline(uint256 _contractId)
        external
        contractExists(_contractId)
    {
        RentalContract storage rentalContract = contracts[_contractId];
        require(
            rentalContract.status == TransactionStatus.Pending,
            "Contract is not in pending state"
        );
        require(
            block.timestamp > rentalContract.confirmationDeadline,
            "Deadline has not passed yet"
        );
        
        // Cập nhật hợp đồng
        rentalContract.status = TransactionStatus.Active;
        rentalContract.startTime = block.timestamp;
        rentalContract.endTime = block.timestamp + (rentalContract.rentalHours * 1 hours);
        rentalContract.finalPrice = rentalContract.totalPrice;
        
        // Cập nhật máy
        package.status = ServerStatus.Active;
        
        // Giải phóng ký quỹ, tiền về chủ  
        escrowBalance -= rentalContract.depositAmount;
        userEscrow[rentalContract.renter] -= rentalContract.depositAmount;
        
        require(
            token.transfer(owner, rentalContract.totalPrice),
            "Payment to owner failed"
        );
        
        package.totalRentals++;
        
        emit RentalConfirmed(
            _contractId,
            rentalContract.renter,
            owner,
            rentalContract.totalPrice
        );
    }
    
// Bước 4b: Người thuê phát hiện lỗi trong 10 phút 
    function reportIssue(uint256 _contractId, string memory _reason)
        external
        contractExists(_contractId)
        onlyRenter(_contractId)
    {
        RentalContract storage rentalContract = contracts[_contractId];

    // 1. Kiểm tra điều kiện thời gian và trạng thái máy 
        require(
            rentalContract.status == TransactionStatus.Pending,
            "Can only report issue during pending period"
        );
        require(
            block.timestamp <= rentalContract.confirmationDeadline,
            "Confirmation deadline passed"
        );
        require(bytes(_reason).length > 0, "Reason cannot be empty");

    // 2. Cập nhật trạng thái máy 
        rentalContract.status = TransactionStatus.AwaitingOwnerReview;
        rentalContract.renterReportedIssue = true;

    // 3. Đưa thông tin cho chủ thuê  
        emit IssueReported(_contractId, msg.sender, _reason);
    }
    
// Trường hợp khách hàng tự hủy NGAY trong lúc chờ xác nhận, tiền hoàn ngay ko cần xác nhận
function cancelByRenter(uint256 _contractId)
    external
    contractExists(_contractId)
    onlyRenter(_contractId)
{
    RentalContract storage rentalContract = contracts[_contractId];
    require(
        rentalContract.status == TransactionStatus.Pending ||
        rentalContract.status == TransactionStatus.AwaitingOwnerReview,
        "Cannot cancel at this stage"
    );

    rentalContract.finalPrice = 0;
    rentalContract.status = TransactionStatus.Cancelled;

    // Giải phóng ký quỹ
    escrowBalance -= rentalContract.depositAmount;
    userEscrow[msg.sender] -= rentalContract.depositAmount;

    // Hoàn lại toàn bộ tiền NGAY, không cần owner duyệt
    require(
        token.transfer(msg.sender, rentalContract.totalPrice),
        "Refund failed"
    );

    package.status = ServerStatus.Available;

    emit RentalCancelled(
        _contractId,
        msg.sender,
        rentalContract.totalPrice,
        "Renter cancelled the rental"
    );
}

// Trường hợp người cho thuê chủ động hủy hợp đồng do lỗi nặng 
    function cancelRentalByOwner(uint256 _contractId, string memory _reason)
        external
        contractExists(_contractId)
        onlyOwner
    {
        RentalContract storage rentalContract = contracts[_contractId];
        require(
            rentalContract.status == TransactionStatus.AwaitingOwnerReview,
            "Contract must be in AwaitingOwnerReview state"
        );
        require(
            block.timestamp <= rentalContract.confirmationDeadline,
            "Confirmation deadline passed"
        );
        require(bytes(_reason).length > 0, "Reason cannot be empty");
        
        rentalContract.finalPrice = 0;
        rentalContract.status = TransactionStatus.Cancelled;
        
        // Giải phòng kí quỹ
        escrowBalance -= rentalContract.depositAmount;
        userEscrow[rentalContract.renter] -= rentalContract.depositAmount;
        
        // Hoàn lại toàn bộ tiền
        require(
            token.transfer(rentalContract.renter, rentalContract.totalPrice),
            "Refund failed"
        );
        
        package.status = ServerStatus.Available;
        
        emit RentalCancelledByOwner(
            _contractId,
            rentalContract.renter,
            rentalContract.totalPrice,
            _reason
        );
    }
    
// Bước 5 và 6: Kết thúc hợp đồng khi hợp đồng được thực hiện 
    
    // Cảnh báo sắp hết hạn 
    function sendLowTimeWarning(uint256 _contractId)
        external
        contractExists(_contractId)
    {
        RentalContract storage rentalContract = contracts[_contractId];
        require(
            rentalContract.status == TransactionStatus.Active,
            "Contract is not active"
        );
        require(block.timestamp < rentalContract.endTime, "Contract already ended");
        
        uint256 minutesRemaining = (rentalContract.endTime - block.timestamp) / 60;
        require(minutesRemaining <= 10, "Not low time yet");
        
        emit LowTimeWarning(_contractId, rentalContract.renter, minutesRemaining);
    }
    
    // Đóng hợp đồng, giải phóng máy chủ 
    function autoCompleteRental(uint256 _contractId)
        external
        contractExists(_contractId)
    {
        RentalContract storage rentalContract = contracts[_contractId];
        require(
            rentalContract.status == TransactionStatus.Active,
            "Contract is not active"
        );
        require(
            block.timestamp >= rentalContract.endTime,
            "Contract has not ended yet"
        );
        
        rentalContract.status = TransactionStatus.Completed;
        
        package.status = ServerStatus.Available;
        
        emit RentalAutoCompleted(
            _contractId,
            owner,
            rentalContract.rentalHours
        );
    }
    
    // ==================== OWNER FUNCTIONS ====================
    
    /**
     * @dev Người cho thuê cập nhật giá
     */
    function updatePrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be greater than 0");
        require(
            package.status == ServerStatus.Available,
            "Can only update when available"
        );
        package.pricePerHour = _newPrice;
    }
    
    /**
     * @dev Người cho thuê tạm dừng máy
     */
    function pausePackage() external onlyOwner {
        require(package.status == ServerStatus.Available, "Package already paused");
        package.status = ServerStatus.Completed;
    }
    
    /**
     * @dev Người cho thuê bật máy lại
     */
    function resumePackage() external onlyOwner {
        require(package.status == ServerStatus.Completed, "Package is not paused");
        package.status = ServerStatus.Available;
    }

    /**
     * @dev Người cho thuê gỡ máy chủ khỏi sàn vĩnh viễn (unlist)
     * Chỉ được gỡ khi không có ai đang thuê (status = Available)
     * Sau khi gỡ, không thể rentServer() được nữa
     */
    function unlistPackage() external onlyOwner {
        require(
            package.status == ServerStatus.Available ||
            package.status == ServerStatus.Completed,
            "Can only unlist when available or paused"
        );
  
        package.status = ServerStatus.Unlisted;

        emit PackageUnlisted(msg.sender, block.timestamp);
    }

    /**
     * @dev Người cho thuê đăng lại máy chủ đã gỡ (nếu muốn)
     */
    function relistPackage() external onlyOwner {
        require(
            package.status == ServerStatus.Unlisted,
            "Package is not unlisted"
        );

        package.status = ServerStatus.Available;

        emit PackageRelisted(msg.sender, block.timestamp);
    }

    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @dev Lấy thông tin gói máy
     */
    function getPackage() external view returns (ServerPackage memory) {
        return package;
    }
    
    /**
     * @dev Lấy thông tin hợp đồng
     */
    function getContract(uint256 _contractId)
        external
        view
        contractExists(_contractId)
        returns (RentalContract memory)
    {
        return contracts[_contractId];
    }
    
    /**
     * @dev Lấy danh sách hợp đồng của một người
     */
    function getContractsByUser(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userContracts[_user];
    }
    
    /**
     * @dev Lấy tiền escrow của một người
     */
    function getUserEscrow(address _user)
        external
        view
        returns (uint256)
    {
        return userEscrow[_user];
    }
    
    /**
     * @dev Lấy thời gian còn lại của hợp đồng (giây)
     */
    function getRemainingTime(uint256 _contractId)
        external
        view
        contractExists(_contractId)
        returns (int256)
    {
        RentalContract storage rentalContract = contracts[_contractId];
        if (rentalContract.status != TransactionStatus.Active) {
            return -1;
        }
        
        if (block.timestamp >= rentalContract.endTime) {
            return 0;
        }
        
        return int256(rentalContract.endTime - block.timestamp);
    }
    
    /**
     * @dev Lấy thời gian còn lại để xác nhận (giây)
     */
    function getRemainingConfirmationTime(uint256 _contractId)
        external
        view
        contractExists(_contractId)
        returns (int256)
    {
        RentalContract storage rentalContract = contracts[_contractId];
        if (
            rentalContract.status != TransactionStatus.Pending &&
            rentalContract.status != TransactionStatus.AwaitingOwnerReview
        ) {
            return -1;
        }
        
        if (block.timestamp >= rentalContract.confirmationDeadline) {
            return 0;
        }
        
        return int256(rentalContract.confirmationDeadline - block.timestamp);
    }
}

// ==================== FACTORY CONTRACT ====================

/**
 * @dev Factory Contract để tạo và quản lý các SingleServerRental
 * Người cho thuê tạo gói máy ở đây
 */
contract ServerRentalFactory {
    
    IERC20 public token;
    
    uint256 public nextPackageId = 1;
    
    // Mapping
    mapping(uint256 => address) public packages;           // packageId => SingleServerRental address
    mapping(address => uint256[]) public ownerPackages;    // owner => list of packageIds
    mapping(address => bool) public isValidPackage;        // SingleServerRental address => is valid
    
    // Events
    event PackageCreated(
        uint256 indexed packageId,
        address indexed owner,
        address indexed contractAddress,
        string configType,
        uint256 pricePerHour
    );
    
    event PackageDeactivated(uint256 indexed packageId);
    
    // Constructor
    constructor(address _tokenAddress) {
        require(_tokenAddress != address(0), "Invalid token address");
        token = IERC20(_tokenAddress);
    }
    
    // ==================== FACTORY FUNCTIONS ====================
    
    /**
     * @dev Người cho thuê tạo gói máy chủ mới
     */
    function createServerPackage(
        string memory _configType,
        uint256 _pricePerHour
    ) external returns (address) {
        require(_pricePerHour > 0, "Price must be greater than 0");
        require(bytes(_configType).length > 0, "Config type cannot be empty");
        
        uint256 packageId = nextPackageId++;
        
        // Tạo Single Contract mới
        SingleServerRental newContract = new SingleServerRental(
            address(token),
            msg.sender,
            _configType,
            _pricePerHour
        );
        
        address contractAddress = address(newContract);
        
        packages[packageId] = contractAddress;
        isValidPackage[contractAddress] = true;
        ownerPackages[msg.sender].push(packageId);
        
        emit PackageCreated(
            packageId,
            msg.sender,
            contractAddress,
            _configType,
            _pricePerHour
        );
        
        return contractAddress;
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @dev Lấy địa chỉ Single Contract từ packageId
     */
    function getPackageAddress(uint256 _packageId)
        external
        view
        returns (address)
    {
        return packages[_packageId];
    }
    
    /**
     * @dev Lấy danh sách gói máy của một chủ
     */
    function getPackagesByOwner(address _owner)
        external
        view
        returns (uint256[] memory)
    {
        return ownerPackages[_owner];
    }
    
    /**
     * @dev Kiểm tra xem địa chỉ có phải Single Contract hợp lệ không
     */
    function isValidSingleContract(address _address)
        external
        view
        returns (bool)
    {
        return isValidPackage[_address];
    }
    
    /**
     * @dev Lấy tổng số gói máy đã tạo
     */
    function getTotalPackages() external view returns (uint256) {
        return nextPackageId - 1;
    }
    
    /**
     * @dev Lấy thông tin chi tiết gói máy từ packageId
     */
    function getPackageInfo(uint256 _packageId)
        external
        view
        returns (
            address contractAddress,
            string memory configType,
            uint256 pricePerHour,
            address owner,
            string memory status,
            uint256 totalRentals
        )
    {
        require(_packageId < nextPackageId, "Package does not exist");
        address addr = packages[_packageId];
        SingleServerRental pkg = SingleServerRental(addr);
        SingleServerRental.ServerPackage memory packageInfo = pkg.getPackage();
        
        string memory statusStr;
        if (uint(packageInfo.status) == 0) statusStr = "Available";
        else if (uint(packageInfo.status) == 1) statusStr = "Pending";
        else if (uint(packageInfo.status) == 2) statusStr = "Active";
        else if (uint(packageInfo.status) == 3) statusStr = "Completed";
        else if (uint(packageInfo.status) == 4) statusStr = "Cancelled";
        else statusStr = "Unlisted";
        
        return (
            addr,
            packageInfo.configType,
            packageInfo.pricePerHour,
            packageInfo.owner,
            statusStr,
            packageInfo.totalRentals
        );
    }
    
    /**
     * @dev Lấy danh sách địa chỉ của tất cả gói máy
     */
    function getAllPackageAddresses()
        external
        view
        returns (address[] memory)
    {
        address[] memory result = new address[](nextPackageId - 1);
        for (uint256 i = 1; i < nextPackageId; i++) {
            result[i - 1] = packages[i];
        }
        return result;
    }
}