// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ArcFlow.sol";

contract ArcFlowTest is Test {
    ArcFlow flow;

    address payer     = makeAddr("payer");
    address recipient = makeAddr("recipient");

    // Aylık 1000 native USDC → saniye başına rate
    // 1000e18 / 2_592_000 ≈ 385_802_469_135_802 wei/saniye
    uint256 constant RATE    = 385_802_469_135_802;
    uint256 constant DEPOSIT = 1000 ether; // 1000 native USDC

    function setUp() public {
        flow = new ArcFlow();
        vm.deal(payer, 10_000 ether); // payer'a test native USDC ver
    }

    // ─── createStream ───────────────────────────────────────────────────

    function test_createStream() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        assertEq(id, 0);
        (address p, address r, uint256 rate,, uint256 deposit,,bool active) = flow.streams(0);
        assertEq(p, payer);
        assertEq(r, recipient);
        assertEq(rate, RATE);
        assertEq(deposit, DEPOSIT);
        assertTrue(active);
    }

    function test_createStream_revertsOnZeroDeposit() public {
        vm.prank(payer);
        vm.expectRevert(ArcFlow.ZeroDeposit.selector);
        flow.createStream{value: 0}(recipient, RATE);
    }

    function test_createStream_revertsOnZeroRate() public {
        vm.prank(payer);
        vm.expectRevert(ArcFlow.ZeroRate.selector);
        flow.createStream{value: DEPOSIT}(recipient, 0);
    }

    // ─── withdrawable ───────────────────────────────────────────────────

    function test_withdrawable_afterOneDay() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        // 1 gün ilerlet
        vm.warp(block.timestamp + 86400);

        uint256 amount = flow.withdrawable(id);
        // RATE * 86400 ≈ 33.333333333333292800 native USDC
        assertApproxEqAbs(amount, 33_333_333_333_333_292_800, 1000);
    }

    function test_withdrawable_capsAtDeposit() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        // 100 gün ilerlet (deposit yetmez)
        vm.warp(block.timestamp + 100 days);

        uint256 amount = flow.withdrawable(id);
        assertEq(amount, DEPOSIT); // deposit'ten fazla olamaz
    }

    // ─── withdraw ───────────────────────────────────────────────────────

    function test_withdraw() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        vm.warp(block.timestamp + 86400); // 1 gün

        uint256 expected = flow.withdrawable(id);
        uint256 balanceBefore = recipient.balance;

        vm.prank(recipient);
        flow.withdraw(id);

        assertEq(recipient.balance - balanceBefore, expected);
    }

    function test_withdraw_twice() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        vm.warp(block.timestamp + 86400);
        vm.prank(recipient);
        flow.withdraw(id);

        // İkinci çekim: hemen ardından withdrawable = 0
        vm.expectRevert(ArcFlow.NothingToWithdraw.selector);
        vm.prank(recipient);
        flow.withdraw(id);
    }

    function test_withdraw_revertsIfNotRecipient() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        vm.warp(block.timestamp + 86400);
        vm.expectRevert(ArcFlow.NotRecipient.selector);
        vm.prank(payer); // yanlış kişi
        flow.withdraw(id);
    }

    // ─── cancelStream ───────────────────────────────────────────────────

    function test_cancelStream() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        vm.warp(block.timestamp + 86400); // 1 gün geçti

        uint256 recipientExpected = flow.withdrawable(id);
        uint256 payerExpected     = DEPOSIT - recipientExpected;

        uint256 payerBefore     = payer.balance;
        uint256 recipientBefore = recipient.balance;

        vm.prank(payer);
        flow.cancelStream(id);

        assertEq(payer.balance - payerBefore, payerExpected);
        assertEq(recipient.balance - recipientBefore, recipientExpected);

        (,,,,,, bool active) = flow.streams(id);
        assertFalse(active);
    }

    function test_cancelStream_revertsIfNotPayer() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        vm.expectRevert(ArcFlow.NotPayer.selector);
        vm.prank(recipient);
        flow.cancelStream(id);
    }

    // ─── topUp ──────────────────────────────────────────────────────────

    function test_topUp() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        vm.prank(payer);
        flow.topUp{value: 500 ether}(id);

        (,,,, uint256 deposit,,) = flow.streams(id);
        assertEq(deposit, DEPOSIT + 500 ether);
    }

    // ─── remainingTime ──────────────────────────────────────────────────

    function test_remainingTime() public {
        vm.prank(payer);
        uint256 id = flow.createStream{value: DEPOSIT}(recipient, RATE);

        uint256 remaining = flow.remainingTime(id);
        // 1000e18 / RATE ≈ 2_592_000 saniye ≈ 30 gün
        assertApproxEqAbs(remaining, 2_597_402, 10000);
    }

    // ─── monthlyToRate helper ────────────────────────────────────────────

    function test_monthlyToRate() public view {
        uint256 rate = flow.monthlyToRate(1000 ether);
        assertEq(rate, uint256(1000 ether) / 2_592_000);
    }
}
