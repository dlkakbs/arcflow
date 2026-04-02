import { formatUnits, parseUnits } from "viem";

export const ARC_NATIVE_USDC_DECIMALS = 18;
export const ARC_NATIVE_USDC_SYMBOL = "USDC";

export function parseNativeUsdc(value: string) {
  return parseUnits(value, ARC_NATIVE_USDC_DECIMALS);
}

export function formatNativeUsdc(value: bigint) {
  return formatUnits(value, ARC_NATIVE_USDC_DECIMALS);
}
