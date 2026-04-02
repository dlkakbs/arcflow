// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ArcPaywall.sol";

contract ArcPaywallTest is Test {
    ArcPaywall paywall;

    uint256 ownerKey = 0xA11CE;
    uint256 clientKey = 0xB0B;

    address owner;
    address client;

    uint256 constant PRICE = 1e15; // 0.001 native USDC
    uint256 constant DEPOSIT = 1 ether; // 1 native USDC

    function setUp() public {
        owner = vm.addr(ownerKey);
        client = vm.addr(clientKey);

        vm.prank(owner);
        paywall = new ArcPaywall(PRICE);

        vm.deal(client, 10 ether);
        vm.deal(owner, 10 ether);
    }

    function _sign(uint256 nonce, uint256 deadline) internal view returns (bytes memory) {
        bytes32 msgHash = keccak256(
            abi.encodePacked(address(paywall), block.chainid, client, nonce, deadline, PRICE)
        );
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(clientKey, ethHash);
        return abi.encodePacked(r, s, v);
    }

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

    function test_withdraw() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        uint256 before = client.balance;
        vm.prank(client);
        paywall.withdraw(DEPOSIT / 2);

        assertEq(client.balance - before, DEPOSIT / 2);
        assertEq(paywall.balanceOf(client), DEPOSIT / 2);
    }

    function test_withdraw_revertsIfInsufficient() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        vm.prank(client);
        vm.expectRevert(ArcPaywall.InsufficientDeposit.selector);
        paywall.withdraw(DEPOSIT + 1);
    }

    function test_redeemBatch() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        address[] memory clients = new address[](3);
        uint256[] memory nonces = new uint256[](3);
        uint256[] memory deadlines = new uint256[](3);
        bytes[] memory signatures = new bytes[](3);

        for (uint256 i = 0; i < 3; i++) {
            clients[i] = client;
            nonces[i] = i;
            deadlines[i] = block.timestamp + 10 minutes;
            signatures[i] = _sign(i, deadlines[i]);
        }

        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        paywall.redeemBatch(clients, nonces, deadlines, signatures);

        assertEq(paywall.balanceOf(client), DEPOSIT - (PRICE * 3));
        assertEq(paywall.nextNonce(client), 3);
        assertEq(owner.balance - ownerBefore, PRICE * 3);
    }

    function test_redeemBatch_skipsExpiredSignatures() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        address[] memory clients = new address[](1);
        uint256[] memory nonces = new uint256[](1);
        uint256[] memory deadlines = new uint256[](1);
        bytes[] memory signatures = new bytes[](1);

        clients[0] = client;
        nonces[0] = 0;
        deadlines[0] = block.timestamp + 1;
        signatures[0] = _sign(0, deadlines[0]);

        vm.warp(block.timestamp + 2);

        vm.prank(owner);
        paywall.redeemBatch(clients, nonces, deadlines, signatures);

        assertEq(paywall.balanceOf(client), DEPOSIT);
        assertEq(paywall.nextNonce(client), 0);
    }

    function test_redeemBatch_skipsInvalidSignature() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        address[] memory clients = new address[](1);
        uint256[] memory nonces = new uint256[](1);
        uint256[] memory deadlines = new uint256[](1);
        bytes[] memory signatures = new bytes[](1);

        clients[0] = client;
        nonces[0] = 0;
        deadlines[0] = block.timestamp + 10 minutes;
        signatures[0] = _sign(1, deadlines[0]); // wrong nonce in signature

        vm.prank(owner);
        paywall.redeemBatch(clients, nonces, deadlines, signatures);

        assertEq(paywall.balanceOf(client), DEPOSIT);
        assertEq(paywall.nextNonce(client), 0);
    }

    function test_requestsRemaining() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();
        assertEq(paywall.requestsRemaining(client), 1000);
    }

    function test_setPrice() public {
        vm.prank(owner);
        paywall.setPrice(2e15);
        assertEq(paywall.pricePerRequest(), 2e15);
    }

    function test_setPrice_revertsIfNotOwner() public {
        vm.prank(client);
        vm.expectRevert(ArcPaywall.NotOwner.selector);
        paywall.setPrice(2e15);
    }

    function test_emergencyWithdraw_afterTimeout() public {
        vm.prank(client);
        paywall.deposit{value: DEPOSIT}();

        vm.warp(block.timestamp + 7 days + 1);

        uint256 before = client.balance;
        vm.prank(client);
        paywall.emergencyWithdraw();

        assertEq(client.balance - before, DEPOSIT);
        assertEq(paywall.balanceOf(client), 0);
    }
}
