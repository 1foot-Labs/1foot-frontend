import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from '@wagmi/connectors';
import { connect, getAccount } from '@wagmi/core';

// Configure Wagmi with MetaMask (injected) connector
const config = createConfig({
  chains: [mainnet],
  connectors: [injected({ target: 'metaMask' })],
  transports: {
    [mainnet.id]: http(),
  },
});

export async function connectMetamask(): Promise<string> {
  try {
    // Connect to MetaMask
    await connect(config, { connector: injected({ target: 'metaMask' }) });
    
    // Get the connected account
    const account = getAccount(config);
    
    if (!account.address) {
      throw new Error('No accounts found');
    }

    return account.address;
  } catch (error) {
    console.error('MetaMask connection error:', error);
    throw new Error('Failed to connect to MetaMask');
  }
}

export async function connectBTCWallet(): Promise<string> {
  if (!window.unisat) {
    throw new Error('Bitcoin wallet (UniSat) is not installed');
  }

  try {
    const accounts = await window.unisat.requestAccounts();
    
    if (accounts.length === 0) {
      throw new Error('No Bitcoin accounts found');
    }

    return accounts[0];
  } catch (error) {
    console.error('Bitcoin wallet connection error:', error);
    throw new Error('Failed to connect to Bitcoin wallet');
  }
}