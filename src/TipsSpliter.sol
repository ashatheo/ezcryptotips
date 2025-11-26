// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TipSplitter
 * @dev Contract for automatic tip splitting in EVM networks (e.g., Hedera EVM).
 * Accepts payment, records a review, sends 95% to the waiter, and keeps 5% as a service fee.
 */
contract TipSplitter {
    address public owner;
    uint256 public constant SERVICE_FEE_PERCENT = 5;

    // The event includes reviewText, which is permanently recorded in the transaction history.
    event TipSent(address indexed from, address indexed to, uint256 amount, uint256 fee, string reviewText);
    event FeeWithdrawn(address indexed owner, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Main function to send the tip and review.
     * @param _waiterAddress The waiter's wallet address (0x...)
     * @param _reviewText The customer's review text. Recorded on-chain via the event.
     */
    function sendTipAndReview(address payable _waiterAddress, string memory _reviewText) external payable {
        require(msg.value > 0, "Tip amount must be greater than 0", "The tip amount must be greater than 0.");
        require(_waiterAddress != address(0), "Invalid waiter address", "Invalid waiter address provided.");

        // Calculate the service fee
        uint256 fee = (msg.value * SERVICE_FEE_PERCENT) / 100;
        uint256 waiterAmount = msg.value - fee;

        // Send the share to the waiter
        (bool success, ) = _waiterAddress.call{value: waiterAmount}("");
        require(success, "Transfer to waiter failed", "Failed to transfer funds to the waiter.");

        // The fee remains in the contract balance.
        // The review is recorded in the TipSent event.
        emit TipSent(msg.sender, _waiterAddress, msg.value, fee, _reviewText);
    }

    /**
     * @dev The service owner withdraws accumulated fees.
     */
    function withdrawFees() external {
        require(msg.sender == owner, "Only owner can withdraw", "Only the owner can withdraw fees.");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw", "No fees accumulated yet.");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdraw failed", "Fee withdrawal failed.");

        emit FeeWithdrawn(owner, balance);
    }
}