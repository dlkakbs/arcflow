// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ArcPaywallV2.sol";

contract DeployArcPaywallV2 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        ArcPaywallV2 paywall = new ArcPaywallV2();
        vm.stopBroadcast();

        console.log("ArcPaywallV2 deployed:", address(paywall));
    }
}
