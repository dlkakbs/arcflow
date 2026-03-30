// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ArcPaywall.sol";

contract ArcPaywallTest is Test {
    ArcPaywall paywall;

    uint256 ownerKey  = 0xA11CE;
    uint256 clientKey = 0xB0B;

    address owner;
    address client;

    uint256 constant PRICE   = 1000;   // 0.001 USDC
    uint256 constant DEPOSIT = 100000; // 0.1 USDC (100 request)

    function setUp() public {
        owner  = vm.addr(ownerKey);
        client = vm.addr(clientKey);

        vm.prank(owner);
        paywall = new ArcPaywall(PRICE);

        vm.deal(client, 1_000_000);
        vm.deal(owner,  1_000_000);
    }

    // ─── deposit ────────────────────────────────────────────────────────

    function test_deposit() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();
        assertEq(paywall.balanceOf(client), DEPOSIT);
    }

    function test_deposit_revertsOnZero() public {
        vm.prank(client);
        vm.expectRevert(ArcPaywall.ZeroDeposit.selector);
        paywall.deposit{value: 0}();
    }

    // ─── withdraw ───────────────────────────────────────────────────────

    function test_withdraw() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        uint256 before = client.balance;
        vm.prank(client);
        paywall.withdraw(DEPOSIT);

        assertEq(client.balance - before, DEPOSIT);
        assertEq(paywall.balanceOf(client), 0);
    }

    function test_withdraw_revertsIfInsufficient() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        vm.prank(client);
        vm.expectRevert(ArcPaywall.InsufficientDeposit.selector);
        paywall.withdraw(DEPOSIT + 1);
    }

    // ─── redeemPayment ──────────────────────────────────────────────────

    function _sign(bytes32 nonce) internal view returns (bytes memory) {
        bytes32 msgHash = keccak256(abi.encodePacked(client, nonce, PRICE));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(clientKey, ethHash);
        return abi.encodePacked(r, s, v);
    }

    function test_redeemPayment() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        bytes32 nonce = keccak256("request-1");
        bytes memory sig = _sign(nonce);

        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        paywall.redeemPayment(client, nonce, sig);

        assertEq(paywall.balanceOf(client), DEPOSIT - PRICE);
        assertEq(owner.balance - ownerBefore, PRICE);
    }

    function test_redeemPayment_revertsOnReplay() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        bytes32 nonce = keccak256("request-1");
        bytes memory sig = _sign(nonce);

        vm.prank(owner);
        paywall.redeemPayment(client, nonce, sig);

        vm.prank(owner);
        vm.expectRevert(ArcPaywall.NonceUsed.selector);
        paywall.redeemPayment(client, nonce, sig);
    }

    function test_redeemPayment_revertsOnBadSig() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        bytes32 nonce = keccak256("request-1");
        bytes memory badSig = _sign(keccak256("different-nonce")); // yanlış nonce ile imza

        vm.prank(owner);
        vm.expectRevert(ArcPaywall.InvalidSignature.selector);
        paywall.redeemPayment(client, nonce, badSig);
    }

    function test_redeemPayment_revertsIfNotOwner() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        bytes32 nonce = keccak256("request-1");
        bytes memory sig = _sign(nonce);

        vm.prank(client);
        vm.expectRevert(ArcPaywall.NotOwner.selector);
        paywall.redeemPayment(client, nonce, sig);
    }

    // ─── redeemBatch ────────────────────────────────────────────────────

    function test_redeemBatch() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        bytes32[] memory nonces = new bytes32[](3);
        nonces[0] = keccak256("req-1");
        nonces[1] = keccak256("req-2");
        nonces[2] = keccak256("req-3");

        address[] memory clients    = new address[](3);
        bytes[]   memory signatures = new bytes[](3);

        for (uint256 i = 0; i < 3; i++) {
            clients[i]    = client;
            signatures[i] = _sign(nonces[i]);
        }

        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        paywall.redeemBatch(clients, nonces, signatures);

        assertEq(paywall.balanceOf(client), DEPOSIT - PRICE * 3);
        assertEq(owner.balance - ownerBefore, PRICE * 3);
    }

    function test_redeemBatch_skipsUsedNonces() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        bytes32 nonce = keccak256("req-1");
        bytes memory sig = _sign(nonce);

        // Önce tekli redeem
        vm.prank(owner);
        paywall.redeemPayment(client, nonce, sig);

        // Batch'te aynı nonce var — skip edilmeli
        address[] memory clients    = new address[](1);
        bytes32[] memory nonces     = new bytes32[](1);
        bytes[]   memory signatures = new bytes[](1);
        clients[0] = client; nonces[0] = nonce; signatures[0] = sig;

        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        paywall.redeemBatch(clients, nonces, signatures);

        assertEq(owner.balance, ownerBefore); // ek ödeme yok
    }

    // ─── requestsRemaining ──────────────────────────────────────────────

    function test_requestsRemaining() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();
        assertEq(paywall.requestsRemaining(client), DEPOSIT / PRICE);
    }

    // ─── setPrice ───────────────────────────────────────────────────────

    function test_setPrice() public {
        vm.prank(owner);
        paywall.setPrice(2000);
        assertEq(paywall.pricePerRequest(), 2000);
    }

    function test_setPrice_revertsIfNotOwner() public {
        vm.prank(client);
        vm.expectRevert(ArcPaywall.NotOwner.selector);
        paywall.setPrice(2000);
    }
}
