// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title  ArcPaywall
/// @notice Arc Testnet'te native USDC ile per-request ödeme.
///         Client önceden USDC yatırır, her request için off-chain imzalar.
///         Agent owner imzaları toplu olarak on-chain redeem eder.
///
///  Flow:
///    Client  → deposit()                     USDC yatır
///    Client  → her request için off-chain sign (zincire gitmez, gas yok)
///    Owner   → redeemBatch(...)              toplu redeem, tek tx

contract ArcPaywall {

    address public owner;
    uint256 public pricePerRequest;

    mapping(address => uint256) public deposits;
    mapping(bytes32 => bool)    public usedNonces;

    event Deposited(address indexed client, uint256 amount);
    event Withdrawn(address indexed client, uint256 amount);
    event RequestPaid(address indexed client, bytes32 nonce, uint256 amount);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);

    error NotOwner();
    error ZeroDeposit();
    error NonceUsed();
    error InvalidSignature();
    error InsufficientDeposit();
    error NothingToWithdraw();

    constructor(uint256 _pricePerRequest) {
        owner = msg.sender;
        pricePerRequest = _pricePerRequest;
    }

    // ─── Client: USDC yatır ───────────────────────────────────────────────

    function deposit() external payable {
        if (msg.value == 0) revert ZeroDeposit();
        deposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    // ─── Client: Kullanılmayan bakiyeyi geri çek ──────────────────────────

    function withdraw(uint256 amount) external {
        if (deposits[msg.sender] < amount) revert InsufficientDeposit();
        if (amount == 0) revert NothingToWithdraw();
        deposits[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }

    // ─── Owner: Tekli redeem ──────────────────────────────────────────────

    function redeemPayment(
        address client,
        bytes32 nonce,
        bytes calldata signature
    ) external {
        if (msg.sender != owner)          revert NotOwner();
        if (usedNonces[nonce])            revert NonceUsed();
        if (deposits[client] < pricePerRequest) revert InsufficientDeposit();

        _verifySignature(client, nonce, signature);

        usedNonces[nonce] = true;
        deposits[client] -= pricePerRequest;
        payable(owner).transfer(pricePerRequest);

        emit RequestPaid(client, nonce, pricePerRequest);
    }

    // ─── Owner: Toplu redeem (gas tasarrufu) ──────────────────────────────

    function redeemBatch(
        address[] calldata clients,
        bytes32[] calldata nonces,
        bytes[]   calldata signatures
    ) external {
        if (msg.sender != owner) revert NotOwner();

        uint256 totalEarned;

        for (uint256 i = 0; i < clients.length; i++) {
            if (usedNonces[nonces[i]])                   continue;
            if (deposits[clients[i]] < pricePerRequest)  continue;

            bytes32 msgHash = keccak256(abi.encodePacked(clients[i], nonces[i], pricePerRequest));
            bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
            if (_recover(ethHash, signatures[i]) != clients[i]) continue;

            usedNonces[nonces[i]] = true;
            deposits[clients[i]] -= pricePerRequest;
            totalEarned += pricePerRequest;

            emit RequestPaid(clients[i], nonces[i], pricePerRequest);
        }

        if (totalEarned > 0) payable(owner).transfer(totalEarned);
    }

    // ─── Owner: Fiyat güncelle ────────────────────────────────────────────

    function setPrice(uint256 newPrice) external {
        if (msg.sender != owner) revert NotOwner();
        emit PriceUpdated(pricePerRequest, newPrice);
        pricePerRequest = newPrice;
    }

    // ─── View ─────────────────────────────────────────────────────────────

    function balanceOf(address client) external view returns (uint256) {
        return deposits[client];
    }

    function requestsRemaining(address client) external view returns (uint256) {
        if (pricePerRequest == 0) return 0;
        return deposits[client] / pricePerRequest;
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _verifySignature(address client, bytes32 nonce, bytes calldata signature) internal view {
        bytes32 msgHash = keccak256(abi.encodePacked(client, nonce, pricePerRequest));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
        if (_recover(ethHash, signature) != client) revert InvalidSignature();
    }

    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Bad sig length");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        return ecrecover(hash, v, r, s);
    }
}
