'use client';

import { useState, useEffect } from 'react';
import { generateSecret } from '../utils/secrets';
import { connectMetamask, connectBTCWallet } from '../utils/wallets';
import { createOrder } from '../utils/api';
import { ArrowDown } from 'lucide-react';

export default function SwapForm() {
  const [direction, setDirection] = useState<'eth_btc' | 'btc_eth'>('eth_btc');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [price, setPrice] = useState(0);
  const [secretInfo, setSecretInfo] = useState<{ secret: string; hash: string } | null>(null);

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd')
      .then(res => res.json())
      .then(data => {
        const ethUsd = data.ethereum.usd;
        const btcUsd = data.bitcoin.usd;
        setPrice(direction === 'eth_btc' ? ethUsd / btcUsd : btcUsd / ethUsd);
      });
  }, [direction]);

  const handleFlipDirection = () => {
    setDirection(direction === 'eth_btc' ? 'btc_eth' : 'eth_btc');
    setAmount('');
    setSecretInfo(null);
    setWalletAddress('');
  };

  const handleConnect = async () => {
    const address = direction === 'eth_btc'
      ? await connectMetamask()
      : await connectBTCWallet();
    setWalletAddress(address);
  };

  const handleGenerateSecret = () => {
    const secretData = generateSecret();
    const blob = new Blob([secretData.secret], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'swap-secret.txt';
    a.click();
    setSecretInfo(secretData);
  };

  const handleSwap = async () => {
    if (!secretInfo || !walletAddress || !amount) {
      alert('All fields are required');
      return;
    }

    await createOrder({
      type: direction,
      makerAddress: walletAddress,
      hash: secretInfo.hash,
      amountToGive: amount,
      amountToReceive: (parseFloat(amount) * price).toFixed(6),
    });

    alert('Swap created!');
  };

  const sellSymbol = direction === 'eth_btc' ? 'ETH' : 'BTC';
  const buySymbol = direction === 'eth_btc' ? 'BTC' : 'ETH';
  const sellLogo = direction === 'eth_btc' ? '/eth-logo.png' : '/btc-logo.png';
  const buyLogo = direction === 'eth_btc' ? '/btc-logo.png' : '/eth-logo.png';

  const usdEstimate = (token: 'sell' | 'buy') => {
    const amt = parseFloat(amount || '0');
    const value = token === 'sell' ? amt * (direction === 'eth_btc' ? 3864 : 58400) : amt * price * (direction === 'eth_btc' ? 58400 : 3864);
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-2xl shadow-md">
      <div className="bg-white rounded-2xl border p-4 mb-2">
        <p className="text-sm text-gray-500 mb-1">Sell</p>
        <div className="flex items-center justify-between">
          <input
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-transparent text-2xl font-medium w-1/2 focus:outline-none"
          />
          <div className="flex items-center gap-2 rounded-full px-3 py-1 bg-white border shadow-sm">
            <img src={sellLogo} alt={sellSymbol} className="w-5 h-5" />
            <span className="font-semibold">{sellSymbol}</span>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-1">{usdEstimate('sell')}</p>
      </div>

      <div className="flex justify-center my-2">
        <button
          onClick={handleFlipDirection}
          className="bg-white p-2 rounded-full border hover:rotate-180 transition-transform duration-300"
        >
          <ArrowDown className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border p-4 mb-4">
        <p className="text-sm text-gray-500 mb-1">Buy</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-medium">
            {amount ? (parseFloat(amount) * price).toFixed(6) : '0'}
          </span>
          <div className="flex items-center gap-2 rounded-full px-3 py-1 bg-white border shadow-sm">
            <img src={buyLogo} alt={buySymbol} className="w-5 h-5" />
            <span className="font-semibold">{buySymbol}</span>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-1">{usdEstimate('buy')}</p>
      </div>

      {!walletAddress ? (
        <button
          onClick={handleConnect}
          className="w-full bg-pink-100 text-pink-700 font-semibold py-3 rounded-full text-center"
        >
          Connect wallet
        </button>
      ) : (
        <>
          <div className="text-xs text-green-700 font-medium mb-2">
            Connected: {walletAddress}
          </div>

          {!secretInfo && (
            <button
              onClick={handleGenerateSecret}
              className="bg-green-600 text-white px-4 py-2 w-full rounded-full mb-2"
            >
              Generate & Download Secret
            </button>
          )}

          {secretInfo && (
            <>
              <div className="text-sm mb-3">
                <span className="font-medium">Secret Hash:</span><br />
                <code className="text-xs break-all bg-gray-200 p-2 rounded inline-block w-full">
                  {secretInfo.hash}
                </code>
              </div>

              <button
                onClick={handleSwap}
                className="bg-black text-white px-4 py-3 w-full rounded-full"
              >
                Swap
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
