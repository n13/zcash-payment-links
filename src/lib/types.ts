export type Network = "mainnet" | "testnet";

export interface PaymentParams {
  amount: string;
  desc?: string;
  key: string;
}
