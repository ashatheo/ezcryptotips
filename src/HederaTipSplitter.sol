// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HederaTipSplitter
 * @dev Smart contract for Hedera network to collect tips with 5% service fee
 * Compatible with Hedera Smart Contract Service (HSCS)
 */
contract HederaTipSplitter {
    address public owner;
    uint256 public constant SERVICE_FEE_PERCENT = 5;
    uint256 public totalFeesCollected;
    uint256 public totalTipsSent;

    event TipSent(
        address indexed from,
        address indexed to,
        uint256 totalAmount,
        uint256 waiterAmount,
        uint256 fee,
        uint256 rating,
        string reviewText,
        uint256 timestamp
    );

    event FeeWithdrawn(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Send tip to waiter with automatic 5% fee deduction
     * @param _waiterAddress Address of the waiter receiving the tip
     * @param _rating Star rating (1-5, or 0 for no rating)
     * @param _reviewText Optional review text
     */
    function sendTipWithReview(
        address payable _waiterAddress,
        uint256 _rating,
        string memory _reviewText
    ) external payable {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(_waiterAddress != address(0), "Invalid waiter address");
        require(_waiterAddress != address(this), "Cannot tip the contract");
        require(_rating <= 5, "Rating must be between 0 and 5");

        // Calculate fee (5%) and waiter amount (95%)
        uint256 fee = (msg.value * SERVICE_FEE_PERCENT) / 100;
        uint256 waiterAmount = msg.value - fee;

        // Update statistics
        totalFeesCollected += fee;
        totalTipsSent += waiterAmount;

        // Transfer to waiter (95%)
        (bool success, ) = _waiterAddress.call{value: waiterAmount}("");
        require(success, "Transfer to waiter failed");

        // Emit event for blockchain record
        emit TipSent(
            msg.sender,
            _waiterAddress,
            msg.value,
            waiterAmount,
            fee,
            _rating,
            _reviewText,
            block.timestamp
        );
    }

    /**
     * @dev Withdraw accumulated fees (owner only)
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdraw failed");

        emit FeeWithdrawn(owner, balance, block.timestamp);
    }

    /**
     * @dev Withdraw specific amount of fees (owner only)
     * @param _amount Amount to withdraw in tinybars
     */
    function withdrawFeesAmount(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= _amount, "Insufficient balance");

        (bool success, ) = owner.call{value: _amount}("");
        require(success, "Withdraw failed");

        emit FeeWithdrawn(owner, _amount, block.timestamp);
    }

    /**
     * @dev Get contract balance (accumulated fees)
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get total fees collected
     */
    function getTotalFeesCollected() external view returns (uint256) {
        return totalFeesCollected;
    }

    /**
     * @dev Get total tips sent to waiters
     */
    function getTotalTipsSent() external view returns (uint256) {
        return totalTipsSent;
    }

    /**
     * @dev Transfer ownership to new address
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid new owner address");
        owner = _newOwner;
    }

    /**
     * @dev Fallback function to reject direct transfers
     */
    receive() external payable {
        revert("Use sendTipWithReview function to send tips");
    }
}
