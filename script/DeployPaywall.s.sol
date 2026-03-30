// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ArcPaywall.sol";

contract DeployArcPaywall is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        // 0.001 USDC = 1000 (6 decimal, native Arc USDC)
        uint256 pricePerRequest = 1000;

        vm.startBroadcast(deployerKey);
        ArcPaywall paywall = new ArcPaywall(pricePerRequest);
        vm.stopBroadcast();

        console.log("ArcPaywall deployed:", address(paywall));
        console.log("Price per request:", pricePerRequest);
    }
}
