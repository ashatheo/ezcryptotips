// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;


contract TipSplitter {
    address public owner;
    uint256 public constant SERVICE_FEE_PERCENT = 5;

    event TipSent(address indexed from, address indexed to, uint256 amount, uint256 fee);
    event FeeWithdrawn(address indexed owner, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev 
     * @param _waiterAddress 
     */
    function sendTip(address payable _waiterAddress) external payable {
        require(msg.value > 0, "Tip amount must be greater than 0");
        require(_waiterAddress != address(0), "Invalid waiter address");

        
        uint256 fee = (msg.value * SERVICE_FEE_PERCENT) / 100;
        uint256 waiterAmount = msg.value - fee;

     
        (bool success, ) = _waiterAddress.call{value: waiterAmount}("");
        require(success, "Transfer to waiter failed");

    
        emit TipSent(msg.sender, _waiterAddress, msg.value, fee);
    }

    /**
     * @dev 
     */
    function withdrawFees() external {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdraw failed");

        emit FeeWithdrawn(owner, balance);
    }
}