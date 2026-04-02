// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WrappedToken (Wrapped MATCOM)
 * @notice Wrapped ERC20 token on Sonic Blaze representing bridged MATCOM tokens.
 * @dev Only the bridge contract can mint/burn these tokens.
 */
contract WrappedToken is ERC20, Ownable {
    uint8 private constant _DECIMALS = 18;
    address public bridge;

    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);

    modifier onlyBridge() {
        require(msg.sender == bridge, "WrappedToken: caller is not the bridge");
        _;
    }

    constructor() ERC20("Wrapped MATCOM", "wMCM") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice Set the bridge contract address (only bridge can mint/burn)
     * @param _bridge Address of the SonicBridge contract
     */
    function setBridge(address _bridge) external onlyOwner {
        require(_bridge != address(0), "WrappedToken: bridge is zero address");
        address oldBridge = bridge;
        bridge = _bridge;
        emit BridgeUpdated(oldBridge, _bridge);
    }

    /**
     * @notice Mint wrapped tokens (called by bridge when tokens are locked on Sepolia)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyBridge {
        _mint(to, amount);
    }

    /**
     * @notice Burn wrapped tokens (called by bridge when user wants to bridge back)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyBridge {
        _burn(from, amount);
    }
}
