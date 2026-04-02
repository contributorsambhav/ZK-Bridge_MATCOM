// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./WrappedToken.sol";

/**
 * @title SonicBridge
 * @notice Bridge contract on Sonic Blaze that mints wrapped MATCOM when tokens
 *         are locked on Sepolia, and burns them when users want to bridge back.
 * @dev Uses nonce-based replay protection. Only the authorized relayer can mint.
 */
contract SonicBridge is Ownable, ReentrancyGuard {
    WrappedToken public immutable wrappedToken;
    address public relayer;
    uint256 public nonce;

    // Track processed nonces from Sepolia to prevent replay
    mapping(uint256 => bool) public processedNonces;

    event TokensMinted(
        address indexed recipient,
        uint256 amount,
        uint256 nonce,
        uint256 timestamp
    );

    event TokensBurned(
        address indexed sender,
        uint256 amount,
        uint256 nonce,
        uint256 timestamp
    );

    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);

    modifier onlyRelayer() {
        require(msg.sender == relayer, "SonicBridge: caller is not the relayer");
        _;
    }

    constructor(address _wrappedToken) Ownable(msg.sender) {
        require(_wrappedToken != address(0), "SonicBridge: token is zero address");
        wrappedToken = WrappedToken(_wrappedToken);
    }

    /**
     * @notice Set or update the relayer address
     * @param _relayer New relayer address
     */
    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "SonicBridge: relayer is zero address");
        address oldRelayer = relayer;
        relayer = _relayer;
        emit RelayerUpdated(oldRelayer, _relayer);
    }

    /**
     * @notice Mint wrapped tokens to a user (called by relayer when tokens are locked on Sepolia)
     * @param to Recipient address
     * @param amount Amount to mint
     * @param _nonce Nonce from the lock event on Sepolia (for replay protection)
     */
    function mintWrapped(
        address to,
        uint256 amount,
        uint256 _nonce
    ) external onlyRelayer nonReentrant {
        require(to != address(0), "SonicBridge: recipient is zero address");
        require(amount > 0, "SonicBridge: amount must be > 0");
        require(!processedNonces[_nonce], "SonicBridge: nonce already processed");

        processedNonces[_nonce] = true;
        wrappedToken.mint(to, amount);

        emit TokensMinted(to, amount, _nonce, block.timestamp);
    }

    /**
     * @notice Burn wrapped tokens to initiate bridging back to Sepolia
     * @param amount Amount of wrapped tokens to burn
     */
    function burnWrapped(uint256 amount) external nonReentrant {
        require(amount > 0, "SonicBridge: amount must be > 0");

        uint256 currentNonce = nonce;
        nonce++;

        wrappedToken.burn(msg.sender, amount);

        emit TokensBurned(msg.sender, amount, currentNonce, block.timestamp);
    }

    /**
     * @notice Get total supply of wrapped tokens
     */
    function getTotalMinted() external view returns (uint256) {
        return wrappedToken.totalSupply();
    }
}
