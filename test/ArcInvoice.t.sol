// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ArcInvoice.sol";

contract ArcInvoiceTest is Test {
    ArcInvoice inv;

    address freelancer = makeAddr("freelancer");
    address client     = makeAddr("client");

    uint256 constant AMOUNT = 500 ether; // 500 native USDC

    function setUp() public {
        inv = new ArcInvoice();
        vm.deal(client, 10_000 ether);
    }

    // ─── createInvoice ──────────────────────────────────────────────────

    function test_createInvoice() public {
        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "Logo tasarimi", 0);

        assertEq(id, 0);
        ArcInvoice.Invoice memory i = inv.getInvoice(0);
        assertEq(i.creator, freelancer);
        assertEq(i.amount, AMOUNT);
        assertEq(i.description, "Logo tasarimi");
        assertEq(i.deadline, 0);
        assertEq(uint(i.status), uint(ArcInvoice.Status.Pending));
    }

    function test_createInvoice_revertsOnZeroAmount() public {
        vm.prank(freelancer);
        vm.expectRevert(ArcInvoice.ZeroAmount.selector);
        inv.createInvoice(0, "test", 0);
    }

    function test_myInvoices() public {
        vm.startPrank(freelancer);
        inv.createInvoice(AMOUNT, "Fatura 1", 0);
        inv.createInvoice(AMOUNT, "Fatura 2", 0);
        vm.stopPrank();

        uint256[] memory ids = inv.getMyInvoices(freelancer);
        assertEq(ids.length, 2);
        assertEq(ids[0], 0);
        assertEq(ids[1], 1);
    }

    // ─── payInvoice ─────────────────────────────────────────────────────

    function test_payInvoice() public {
        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "Danismanlik", 0);

        uint256 balanceBefore = freelancer.balance;

        vm.prank(client);
        inv.payInvoice{value: AMOUNT}(id);

        assertEq(freelancer.balance - balanceBefore, AMOUNT);
        assertEq(uint(inv.getInvoice(id).status), uint(ArcInvoice.Status.Paid));
    }

    function test_payInvoice_revertsOnWrongAmount() public {
        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "test", 0);

        vm.prank(client);
        vm.expectRevert(ArcInvoice.WrongAmount.selector);
        inv.payInvoice{value: AMOUNT - 1}(id);
    }

    function test_payInvoice_revertsIfAlreadyPaid() public {
        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "test", 0);

        vm.prank(client);
        inv.payInvoice{value: AMOUNT}(id);

        vm.prank(client);
        vm.expectRevert(ArcInvoice.NotPending.selector);
        inv.payInvoice{value: AMOUNT}(id);
    }

    function test_payInvoice_revertsIfExpired() public {
        uint256 deadline = block.timestamp + 1 days;

        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "test", deadline);

        vm.warp(deadline + 1);

        vm.prank(client);
        vm.expectRevert(ArcInvoice.Expired.selector);
        inv.payInvoice{value: AMOUNT}(id);
    }

    // ─── cancelInvoice ──────────────────────────────────────────────────

    function test_cancelInvoice() public {
        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "test", 0);

        vm.prank(freelancer);
        inv.cancelInvoice(id);

        assertEq(uint(inv.getInvoice(id).status), uint(ArcInvoice.Status.Canceled));
    }

    function test_cancelInvoice_revertsIfNotCreator() public {
        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "test", 0);

        vm.prank(client);
        vm.expectRevert(ArcInvoice.NotCreator.selector);
        inv.cancelInvoice(id);
    }

    function test_cancelInvoice_revertsIfPaid() public {
        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "test", 0);

        vm.prank(client);
        inv.payInvoice{value: AMOUNT}(id);

        vm.prank(freelancer);
        vm.expectRevert(ArcInvoice.NotPending.selector);
        inv.cancelInvoice(id);
    }

    // ─── isExpired ──────────────────────────────────────────────────────

    function test_isExpired_false_whenNoDeadline() public {
        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "test", 0);
        assertFalse(inv.isExpired(id));
    }

    function test_isExpired_true_afterDeadline() public {
        uint256 deadline = block.timestamp + 1 days;
        vm.prank(freelancer);
        uint256 id = inv.createInvoice(AMOUNT, "test", deadline);

        vm.warp(deadline + 1);
        assertTrue(inv.isExpired(id));
    }
}
