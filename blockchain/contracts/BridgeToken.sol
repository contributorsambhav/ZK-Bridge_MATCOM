// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BridgeToken (ZeroTrace)
 * @notice ERC20 token deployed on Sepolia as the source asset for the ZeroTrace Bridge.
 * @dev Initial supply is minted to the deployer. This is the "real" token that gets
 *      locked in the SepoliaBridge when bridging to Sonic Blaze.
 */
contract BridgeToken is ERC20, Ownable {
    uint8 private constant _DECIMALS = 18;

    constructor(uint256 initialSupply) ERC20("ZeroTrace", "ZT") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * 10 ** _DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice Mint new tokens (for faucet testing purposes).
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint (in wei).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
