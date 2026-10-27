// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AgentPaymentGateway is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");

    struct AgentConfig {
        uint256 maxSpendPerTx;
        uint256 totalAllowance;
        uint256 spentTotal;
    }

    error ZeroAddress();
    error ZeroAmount();
    error ExceedsPerTxLimit(uint256 requested, uint256 limit);
    error ExceedsAllowance(uint256 requested, uint256 remaining);
    error LimitsNotConfigured();

    event UsdcDeposited(address indexed from, uint256 amount);
    event AgentRegistered(address indexed agent);
    event AgentRevoked(address indexed agent);
    event SpendLimitsSet(address indexed agent, uint256 maxSpendPerTx, uint256 totalAllowance);
    event UsdcWithdrawn(address indexed to, uint256 amount);
    event PaymentExecuted(
        address indexed agent,
        address indexed recipient,
        uint256 amount,
        uint256 remainingAllowance
    );

    mapping(address => AgentConfig) public agentConfigs;

    address public immutable usdcToken;
    IERC20 private immutable _usdc;

    constructor(address usdc_, address initialOwner) {
        if (usdc_ == address(0) || initialOwner == address(0)) {
            revert ZeroAddress();
        }

        usdcToken = usdc_;
        _usdc = IERC20(usdc_);

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(AGENT_ROLE, initialOwner);
    }

    function depositUsdc(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount == 0) {
            revert ZeroAmount();
        }

        _usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit UsdcDeposited(msg.sender, amount);
    }

    function registerAgent(address agent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (agent == address(0)) {
            revert ZeroAddress();
        }

        _grantRole(AGENT_ROLE, agent);
        emit AgentRegistered(agent);
    }

    function revokeAgent(address agent) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (agent == address(0)) {
            revert ZeroAddress();
        }

        _revokeRole(AGENT_ROLE, agent);
        emit AgentRevoked(agent);
    }

    function setSpendLimits(
        address agent,
        uint256 maxSpendPerTx,
        uint256 totalAllowance
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (agent == address(0)) {
            revert ZeroAddress();
        }
        if (maxSpendPerTx == 0 || totalAllowance == 0) {
            revert ZeroAmount();
        }

        agentConfigs[agent].maxSpendPerTx = maxSpendPerTx;
        agentConfigs[agent].totalAllowance = totalAllowance;

        emit SpendLimitsSet(agent, maxSpendPerTx, totalAllowance);
    }

    function withdrawUsdc(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount == 0) {
            revert ZeroAmount();
        }

        _usdc.safeTransfer(msg.sender, amount);
        emit UsdcWithdrawn(msg.sender, amount);
    }

    function executePayment(address recipient, uint256 amount) external onlyRole(AGENT_ROLE) {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        AgentConfig storage config = agentConfigs[msg.sender];

        if (config.maxSpendPerTx == 0 || config.totalAllowance == 0) {
            revert LimitsNotConfigured();
        }
        if (amount > config.maxSpendPerTx) {
            revert ExceedsPerTxLimit(amount, config.maxSpendPerTx);
        }

        uint256 currentSpent = config.spentTotal;
        uint256 totalAllowance = config.totalAllowance;
        uint256 remaining = totalAllowance - currentSpent;

        if (amount > remaining) {
            revert ExceedsAllowance(amount, remaining);
        }

        config.spentTotal = currentSpent + amount;

        _usdc.safeTransfer(recipient, amount);

        emit PaymentExecuted(msg.sender, recipient, amount, remaining - amount);
    }

    function remainingAllowance(address agent) external view returns (uint256) {
        AgentConfig memory config = agentConfigs[agent];
        return config.totalAllowance - config.spentTotal;
    }
}
