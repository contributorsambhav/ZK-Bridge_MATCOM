// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SepoliaBridge
 * @notice Bridge contract on Sepolia that locks ZeroTrace tokens for bridging to Sonic Blaze
 *         and releases them when bridging back.
 * @dev Uses a nonce-based replay protection system. Only the authorized relayer can
 *      call releaseTokens().
 */
contract SepoliaBridge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public relayer;
    uint256 public nonce;

    // Track processed nonces to prevent replay
    mapping(uint256 => bool) public processedNonces;

    event TokensLocked(
        address indexed sender,
        uint256 amount,
        uint256 nonce,
        uint256 timestamp
    );

    event TokensReleased(
        address indexed recipient,
        uint256 amount,
        uint256 nonce,
        uint256 timestamp
    );

    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);

    modifier onlyRelayer() {
        require(msg.sender == relayer, "SepoliaBridge: caller is not the relayer");
        _;
    }

    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "SepoliaBridge: token is zero address");
        token = IERC20(_token);
    }

    /**
     * @notice Set or update the relayer address
     * @param _relayer New relayer address
     */
    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "SepoliaBridge: relayer is zero address");
        address oldRelayer = relayer;
        relayer = _relayer;
        emit RelayerUpdated(oldRelayer, _relayer);
    }

    /**
     * @notice Lock tokens in the bridge to initiate a cross-chain transfer to Sonic Blaze
     * @param amount Amount of tokens to lock
     */
    function lockTokens(uint256 amount) external nonReentrant {
        require(amount > 0, "SepoliaBridge: amount must be > 0");

        token.safeTransferFrom(msg.sender, address(this), amount);

        uint256 currentNonce = nonce;
        nonce++;

        emit TokensLocked(msg.sender, amount, currentNonce, block.timestamp);
    }

    /**
     * @notice Release tokens back to a user (called by relayer when tokens are burned on Sonic)
     * @param to Recipient address
     * @param amount Amount of tokens to release
     * @param _nonce Nonce from the burn event on Sonic (for replay protection)
     */
    function releaseTokens(
        address to,
        uint256 amount,
        uint256 _nonce
    ) external onlyRelayer nonReentrant {
        require(to != address(0), "SepoliaBridge: recipient is zero address");
        require(amount > 0, "SepoliaBridge: amount must be > 0");
        require(!processedNonces[_nonce], "SepoliaBridge: nonce already processed");

        processedNonces[_nonce] = true;
        token.safeTransfer(to, amount);

        emit TokensReleased(to, amount, _nonce, block.timestamp);
    }

    /**
     * @notice Get the bridge's token balance (locked tokens)
     */
    function getLockedBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
