// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title HederaTipSplitter
 * @dev Smart contract for splitting tips with a 5% platform fee
 * @notice This contract handles tip distribution for Ez Crypto Tips platform
 */
contract HederaTipSplitter {
    // Platform wallet that receives the fee
    address public platformWallet;

    // Platform fee percentage (5% = 500 basis points)
    uint256 public constant PLATFORM_FEE_BPS = 500; // 5%
    uint256 public constant BASIS_POINTS = 10000; // 100%

    // Events
    event TipSent(
        address indexed from,
        address indexed waiter,
        uint256 totalAmount,
        uint256 waiterAmount,
        uint256 platformFee,
        string reviewCID // IPFS CID for review data
    );

    event PlatformWalletUpdated(
        address indexed oldWallet,
        address indexed newWallet
    );

    // Modifiers
    modifier onlyPlatform() {
        require(msg.sender == platformWallet, "Only platform can call this");
        _;
    }

    /**
     * @dev Constructor
     * @param _platformWallet Address that will receive platform fees
     */
    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
    }

    /**
     * @dev Send a tip with automatic fee splitting
     * @param waiter Address of the waiter receiving the tip
     * @param reviewCID IPFS CID containing review data (optional, can be empty)
     */
    function sendTip(address payable waiter, string memory reviewCID) external payable {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(waiter != address(0), "Invalid waiter address");

        // Calculate fee
        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / BASIS_POINTS;
        uint256 waiterAmount = msg.value - platformFee;

        // Transfer to waiter
        (bool waiterSuccess, ) = waiter.call{value: waiterAmount}("");
        require(waiterSuccess, "Transfer to waiter failed");

        // Transfer fee to platform
        if (platformFee > 0) {
            (bool platformSuccess, ) = platformWallet.call{value: platformFee}("");
            require(platformSuccess, "Transfer to platform failed");
        }

        emit TipSent(
            msg.sender,
            waiter,
            msg.value,
            waiterAmount,
            platformFee,
            reviewCID
        );
    }

    /**
     * @dev Update platform wallet address
     * @param newPlatformWallet New platform wallet address
     */
    function updatePlatformWallet(address newPlatformWallet) external onlyPlatform {
        require(newPlatformWallet != address(0), "Invalid platform wallet");
        address oldWallet = platformWallet;
        platformWallet = newPlatformWallet;
        emit PlatformWalletUpdated(oldWallet, newPlatformWallet);
    }

    /**
     * @dev Get current platform fee percentage
     * @return Fee in basis points (500 = 5%)
     */
    function getPlatformFeeBPS() external pure returns (uint256) {
        return PLATFORM_FEE_BPS;
    }

    /**
     * @dev Calculate split amounts for a given tip
     * @param tipAmount Total tip amount
     * @return waiterAmount Amount waiter will receive
     * @return platformFee Amount platform will receive
     */
    function calculateSplit(uint256 tipAmount) external pure returns (uint256 waiterAmount, uint256 platformFee) {
        platformFee = (tipAmount * PLATFORM_FEE_BPS) / BASIS_POINTS;
        waiterAmount = tipAmount - platformFee;
    }
}
