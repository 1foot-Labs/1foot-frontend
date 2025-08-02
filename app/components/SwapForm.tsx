'use client';

import { useState, useEffect } from 'react';
import { generateSecret } from '../utils/secrets';
import { connectMetamask } from '../utils/wallets';
import axios from 'axios';
import { ArrowDown } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';

export default function SwapForm() {
  const [direction, setDirection] = useState<'eth_btc' | 'btc_eth'>('eth_btc');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [ethUsd, setEthUsd] = useState(0);
  const [btcUsd, setBtcUsd] = useState(0);
  const [price, setPrice] = useState(0);
  const [secretInfo, setSecretInfo] = useState<{ secret: string; sha256: string} | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sourceEscrow, setSourceEscrow] = useState<string | null>(null);
  const [orderAmount, setOrderAmount] = useState<number | null>(null);
  const [hasSentToEscrow, setHasSentToEscrow] = useState(false);
  const [isFunded, setIsFunded] = useState<boolean>(false);
  const [claimSecret, setClaimSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await axios.get(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd'
        );
        const eth = res.data.ethereum.usd;
        const btc = res.data.bitcoin.usd;
        setEthUsd(eth);
        setBtcUsd(btc);
        setPrice(direction === 'eth_btc' ? eth / btc : btc / eth);
      } catch (err) {
        console.error('Failed to fetch prices', err);
        toast.error('Failed to fetch prices');
      }
    };

    fetchPrices();
  }, [direction]);

  const handleFlipDirection = () => {
    setDirection(direction === 'eth_btc' ? 'btc_eth' : 'eth_btc');
    setAmount('');
    setSecretInfo(null);
    setWalletAddress('');
    setOrderId(null);
    setSourceEscrow(null);
    setIsFunded(false);
    setClaimSecret('');
  };

  const handleConnect = async () => {
    try {
      // const address = direction === 'eth_btc'
      //   ? await connectMetamask()
      //   : await connectBTCWallet();
      const address = await connectMetamask()
      setWalletAddress(address);
      toast.success('Wallet connected successfully');
    } catch (err) {
      toast.error('Failed to connect wallet');
    }
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
    toast.success('Secret generated and downloaded');
  };

  const handleSwap = async () => {
    if (!secretInfo || !walletAddress || !amount) {
      toast.error('Please fill all required fields');
      return;
    }
    const pubKey = "022514f3c0d22eac4d45ecc6ed9fb17fa44cebb88d590b79ca834b20a552f9bb67"

    setIsLoading(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/create-order`, {
        type: direction,
        makerEthAddress: walletAddress,
        pubKey: pubKey,
        sha256: secretInfo.sha256,
        amountToGive: amount,
        amountToReceive: (parseFloat(amount) * price).toFixed(6),
      });

      console.log('response ', response)

      setOrderId(response.data._id);
      toast.success('Swap created successfully!');
    } catch (err) {
      toast.error('Failed to create swap');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSourceEscrow = async () => {
    if (!orderId) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/source-escrow/${orderId}`);
      const { sourceEscrowAddress, amount } = res.data;

      if (sourceEscrowAddress) {
        setSourceEscrow(sourceEscrowAddress);
        setOrderAmount(amount);
        toast.success('Escrow address retrieved');
      } else {
        toast.warn('Order not fulfilled yet');
      }
    } catch (err) {
      toast.error('Failed to fetch escrow address');
    }
  };

  const checkStatus = async () => {
    if (!orderId) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/order-funded/${orderId}`);
      if (res.data.funded) {
        setIsFunded(true);
        toast.success('Order is funded and ready to claim');
      } else {
        toast.warn('Order not funded yet');
      }
    } catch (err) {
      toast.error('Failed to check order status');
    }
  };

  const sendToEscrow = async () => {
    if (!sourceEscrow || !orderAmount || !walletAddress) {
      toast.error('Escrow details or wallet address missing');
      return;
    }

    if (direction === 'eth_btc') {
      try {
        const amountInWei = (parseFloat(orderAmount.toString()) * 1e18).toString();
        const txParams = {
          from: walletAddress,
          to: sourceEscrow,
          value: BigInt(amountInWei).toString(16),
        };

        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        });

        toast.success(`Transaction sent! TxHash: ${txHash}`);
        setHasSentToEscrow(true);
      } catch (error: any) {
        toast.error(`Transaction failed: ${error.message}`);
      }
    } else if (direction === 'btc_eth') {
      const btcUri = `bitcoin:${sourceEscrow}?amount=${orderAmount}`;
      window.open(btcUri, '_blank');
      setHasSentToEscrow(true);
      toast.success('BTC payment URI opened');
    }
  };

  const claimFunds = async () => {
    if (!claimSecret || !orderId) {
      toast.error('Please enter secret and ensure order is created');
      return;
    }

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/claim`, {
        orderId,
        secret: claimSecret,
      });
      toast.success('Funds claimed successfully!');
    } catch (e) {
      toast.error('Error claiming funds');
    }
  };

  const sellSymbol = direction === 'eth_btc' ? 'ETH' : 'BTC';
  const buySymbol = direction === 'eth_btc' ? 'BTC' : 'ETH';
  const sellLogo = direction === 'eth_btc' ? '/eth-logo.png' : '/btc-logo.png';
  const buyLogo = direction === 'eth_btc' ? '/btc-logo.png' : '/eth-logo.png';

  const usdEstimate = (token: 'sell' | 'buy') => {
    const amt = parseFloat(amount || '0');
    if (!amt || !ethUsd || !btcUsd || !price) return '$0.00';

    let value = 0;

    if (token === 'sell') {
      value = direction === 'eth_btc' ? amt * ethUsd : amt * btcUsd;
    } else {
      const buyAmt = amt * price;
      value = direction === 'eth_btc' ? buyAmt * btcUsd : buyAmt * ethUsd;
    }

    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-2xl shadow-md">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
      
      {/* Sell Input */}
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

      {/* Direction Flip */}
      <div className="flex justify-center my-2">
        <button
          onClick={handleFlipDirection}
          className="bg-white p-2 rounded-full border hover:rotate-180 transition-transform duration-300"
        >
          <ArrowDown className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Buy Display */}
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

      {/* Wallet Connect & Secret Management */}
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

          {secretInfo && !orderId && (
            <button
              onClick={handleSwap}
              disabled={isLoading}
              className={`px-4 py-3 w-full rounded-full ${
                isLoading 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-black text-white'
              }`}
            >
              {isLoading ? 'Creating Swap...' : 'Swap'}
            </button>
          )}
        </>
      )}

      {/* After Swap: Escrow Step */}
      {orderId && !sourceEscrow && (
        <button
          onClick={fetchSourceEscrow}
          className="mt-4 w-full bg-blue-100 text-blue-800 font-semibold py-2 rounded-full"
        >
          Get Escrow Address
        </button>
      )}

      {sourceEscrow && !hasSentToEscrow && !isFunded && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <p className="text-sm">
            Send <strong>{orderAmount}</strong> {sellSymbol} to:
          </p>
          <code className="block text-xs break-all mt-1">{sourceEscrow}</code>
        </div>
      )}

      {sourceEscrow && !hasSentToEscrow && !isFunded && (
        <button
          onClick={sendToEscrow}
          className="mt-3 w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700"
        >
          Send to Escrow
        </button>
      )}

      {/* Status Check + Claim UI */}
      {sourceEscrow && hasSentToEscrow && !isFunded && (
        <div className="mt-4 p-3 border rounded bg-gray-50">
          <p className="text-sm">
            Deposited <strong>{orderAmount}</strong> {sellSymbol} to:
          </p>
          <code className="block text-xs break-all mt-1">{sourceEscrow}</code>
        </div>
      )}
      {sourceEscrow && hasSentToEscrow && !isFunded && (
        <button
          onClick={checkStatus}
          className="mt-4 w-full bg-yellow-100 text-yellow-800 font-semibold py-2 rounded-full"
        >
          Check Status
        </button>
      )}

      {isFunded && (
        <div className="mt-4">
          <input
            placeholder="Enter secret to claim"
            className="w-full p-2 border rounded mb-2"
            value={claimSecret}
            onChange={(e) => setClaimSecret(e.target.value)}
          />
          <button
            onClick={claimFunds}
            className="w-full bg-purple-600 text-white font-semibold py-2 rounded-full"
          >
            Claim Funds
          </button>
        </div>
      )}
    </div>
  );
}
