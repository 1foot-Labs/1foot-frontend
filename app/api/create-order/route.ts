import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, makerAddress, hash, amountToGive, amountToReceive } = body;

  // Here you can call your backend or perform DB logic
  console.log("Order Created:", body);

  return NextResponse.json({ success: true, orderId: "sample-order-id" });
}
