import axios from 'axios';

export async function createOrder(order: {
  type: 'eth_btc' | 'btc_eth';
  makerAddress: string;
  hash: string;
  amountToGive: string;
  amountToReceive: string;
}) {
  return axios.post('/api/create-order', order);
}
