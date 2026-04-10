// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ArcPaywallV2
/// @notice Per-request payments with onchain service ownership and provider claimable earnings.
contract ArcPaywallV2 {
    struct Service {
        address owner;
        uint256 pricePerRequest;
        bool active;
    }

    uint256 public constant MAX_DEPOSIT = 10 ether;
    uint256 public constant OWNER_TIMEOUT = 7 days;

    address public owner;
    uint256 public lastOwnerAction;
    uint256 public serviceCount;

    mapping(address => uint256) public deposits;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => Service) public services;
    mapping(address => uint256) public claimable;
    mapping(address => bytes32[]) private ownerServices;

    event Deposited(address indexed client, uint256 amount);
    event Withdrawn(address indexed client, uint256 amount);
    event ServiceRegistered(bytes32 indexed serviceId, address indexed provider, uint256 pricePerRequest);
    event ServicePriceUpdated(bytes32 indexed serviceId, uint256 oldPrice, uint256 newPrice);
    event ServiceStatusUpdated(bytes32 indexed serviceId, bool active);
    event RequestPaid(bytes32 indexed serviceId, address indexed client, uint256 nonce, uint256 amount);
    event ProviderWithdrawal(address indexed provider, uint256 amount);
    event EscapeWithdraw(address indexed client, uint256 amount);

    error NotOwner();
    error NotServiceOwner();
    error ZeroDeposit();
    error DepositExceedsMax();
    error NothingToWithdraw();
    error OwnerStillActive();
    error ServiceAlreadyExists();
    error ServiceNotFound();
    error ServiceInactive();
    error InvalidServiceOwner();
    error InvalidPrice();
    error ArrayLengthMismatch();
    error InsufficientDeposit();

    constructor() {
        owner = msg.sender;
        lastOwnerAction = block.timestamp;
    }

    function deposit() external payable {
        if (msg.value == 0) revert ZeroDeposit();
        if (deposits[msg.sender] + msg.value > MAX_DEPOSIT) revert DepositExceedsMax();
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0) revert NothingToWithdraw();
        if (deposits[msg.sender] < amount) revert InsufficientDeposit();
        deposits[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    function emergencyWithdraw() external {
        if (block.timestamp < lastOwnerAction + OWNER_TIMEOUT) revert OwnerStillActive();
        uint256 amount = deposits[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        deposits[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit EscapeWithdraw(msg.sender, amount);
    }

    function registerService(bytes32 serviceId, uint256 pricePerRequest) external {
        if (serviceId == bytes32(0)) revert ServiceNotFound();
        if (pricePerRequest == 0) revert InvalidPrice();
        Service storage existing = services[serviceId];
        if (existing.owner != address(0)) revert ServiceAlreadyExists();

        services[serviceId] = Service({
            owner: msg.sender,
            pricePerRequest: pricePerRequest,
            active: true
        });
        ownerServices[msg.sender].push(serviceId);
        serviceCount++;

        emit ServiceRegistered(serviceId, msg.sender, pricePerRequest);
    }

    function updateServicePrice(bytes32 serviceId, uint256 newPrice) external {
        if (newPrice == 0) revert InvalidPrice();
        Service storage service = services[serviceId];
        if (service.owner == address(0)) revert ServiceNotFound();
        if (service.owner != msg.sender) revert NotServiceOwner();

        uint256 oldPrice = service.pricePerRequest;
        service.pricePerRequest = newPrice;
        emit ServicePriceUpdated(serviceId, oldPrice, newPrice);
    }

    function setServiceActive(bytes32 serviceId, bool active) external {
        Service storage service = services[serviceId];
        if (service.owner == address(0)) revert ServiceNotFound();
        if (service.owner != msg.sender) revert NotServiceOwner();

        service.active = active;
        emit ServiceStatusUpdated(serviceId, active);
    }

    function redeemBatch(
        bytes32[] calldata serviceIds,
        address[] calldata clients,
        uint256[] calldata clientNonces,
        uint256[] calldata deadlines,
        bytes[] calldata signatures
    ) external {
        if (msg.sender != owner) revert NotOwner();
        lastOwnerAction = block.timestamp;

        uint256 len = clients.length;
        if (
            serviceIds.length != len ||
            clientNonces.length != len ||
            deadlines.length != len ||
            signatures.length != len
        ) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < len; i++) {
            _redeemSingle(serviceIds[i], clients[i], clientNonces[i], deadlines[i], signatures[i]);
        }
    }

    function withdrawProviderEarnings() external {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        claimable[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit ProviderWithdrawal(msg.sender, amount);
    }

    function getService(bytes32 serviceId) external view returns (Service memory) {
        return services[serviceId];
    }

    function getOwnerServices(address provider) external view returns (bytes32[] memory) {
        return ownerServices[provider];
    }

    function balanceOf(address client) external view returns (uint256) {
        return deposits[client];
    }

    function nextNonce(address client) external view returns (uint256) {
        return nonces[client];
    }

    function requestsRemaining(address client, bytes32 serviceId) external view returns (uint256) {
        Service memory service = services[serviceId];
        if (service.owner == address(0) || service.pricePerRequest == 0) return 0;
        return deposits[client] / service.pricePerRequest;
    }

    function _redeemSingle(
        bytes32 serviceId,
        address client,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        Service memory service = services[serviceId];
        if (service.owner == address(0)) return;
        if (!service.active) return;
        if (block.timestamp > deadline) return;

        uint256 price = service.pricePerRequest;
        if (nonce != nonces[client]) return;
        if (deposits[client] < price) return;

        bytes32 msgHash = keccak256(
            abi.encodePacked(address(this), block.chainid, serviceId, client, nonce, deadline, price)
        );
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
        if (_recover(ethHash, signature) != client) return;

        nonces[client]++;
        deposits[client] -= price;
        claimable[service.owner] += price;

        emit RequestPaid(serviceId, client, nonce, price);
    }

    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Bad sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        return ecrecover(hash, v, r, s);
    }
}
