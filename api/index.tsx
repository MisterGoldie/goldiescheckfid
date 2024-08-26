import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { ethers } from 'ethers'
import fetch from 'node-fetch'

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$GOLDIES Token Tracker on Polygon',
})

const GOLDIES_TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e'
const ALCHEMY_POLYGON_URL = 'https://polygon-mainnet.g.alchemy.com/v2/pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'
const POLYGON_CHAIN_ID = 137

const ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

async function getGoldiesBalance(addressOrFid: string): Promise<string> {
  if (addressOrFid.startsWith('fid:')) {
    console.log('FID provided instead of address. Unable to fetch balance.')
    return '0'
  }

  try {
    console.log('Fetching balance for address:', addressOrFid)
    const provider = new ethers.JsonRpcProvider(ALCHEMY_POLYGON_URL, POLYGON_CHAIN_ID)
    console.log('Provider created')

    const contract = new ethers.Contract(GOLDIES_TOKEN_ADDRESS, ABI, provider)
    console.log('Contract instance created')
    
    const latestBlock = await provider.getBlockNumber()
    console.log('Latest block number:', latestBlock)

    console.log('Calling balanceOf...')
    const balance = await contract.balanceOf(addressOrFid, { blockTag: latestBlock })
    console.log('Raw balance:', balance.toString())

    console.log('Fetching decimals...')
    const decimals = await contract.decimals()
    console.log('Decimals:', decimals)
    
    const formattedBalance = ethers.formatUnits(balance, decimals)
    console.log('Formatted balance:', formattedBalance)
    return formattedBalance
  } catch (error) {
    console.error('Detailed error in getGoldiesBalance:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}

async function getGoldiesUsdPrice(): Promise<number> {
  try {
    console.log('Fetching $GOLDIES price from DEX Screener...')
    const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/polygon/0x19976577bb2fa3174b4ae4cf55e6795dde730135')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json()
    console.log('DEX Screener API response:', JSON.stringify(data, null, 2))

    if (data.pair && data.pair.priceUsd) {
      const priceUsd = parseFloat(data.pair.priceUsd)
      console.log('Fetched $GOLDIES price in USD:', priceUsd)
      return priceUsd
    } else {
      console.error('Invalid or missing price data in DEX Screener response:', data)
      throw new Error('Invalid price data received from DEX Screener')
    }
  } catch (error) {
    console.error('Error in getGoldiesUsdPrice:', error)
    throw error
  }
}

app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%', 
        height: '100%', 
        backgroundImage: 'url(https://amaranth-adequate-condor-278.mypinata.cloud/ipfs/QmVfEoPSGHFGByQoGxUUwPq2qzE4uKXT7CSKVaigPANmjZ)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '20px', 
        boxSizing: 'border-box' 
      }}>
        <h1 style={{ 
          fontSize: '60px', 
          marginBottom: '20px', 
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>$GOLDIES Balance Checker</h1>
        <p style={{ 
          fontSize: '36px', 
          marginBottom: '20px', 
          textAlign: 'center',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}>Click to check your $GOLDIES balance</p>
      </div>
    ),
    intents: [
      <Button action="/check">Check Balance</Button>,
    ]
  })
})

app.frame('/check', async (c) => {
  console.log('Full frameData:', JSON.stringify(c.frameData, null, 2))
  
  const address = c.frameData?.address || (c.frameData?.fid ? `fid:${c.frameData.fid}` : undefined)
  console.log('Retrieved address or identifier:', address)

  if (!address) {
    console.log('No address or FID found for the user.')
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error</h1>
          <p style={{ fontSize: '36px', textAlign: 'center' }}>Unable to retrieve your wallet address or Farcaster ID. Please ensure you have a connected wallet or valid Farcaster profile.</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>
      ]
    })
  }

  try {
    console.log('Fetching balance and price for address:', address)
    const balance = await getGoldiesBalance(address)
    const priceUsd = await getGoldiesUsdPrice()

    const balanceNumber = parseFloat(balance)
    const balanceDisplay = balanceNumber === 0 
      ? "You don't have any $GOLDIES tokens on Polygon yet!"
      : `${balanceNumber.toLocaleString()} $GOLDIES on Polygon`
    
    const usdValue = balanceNumber * priceUsd
    const usdValueDisplay = `(~$${usdValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`

    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center' }}>Your $GOLDIES Balance</h1>
          <p style={{ fontSize: '42px', textAlign: 'center' }}>{balanceDisplay}</p>
          <p style={{ fontSize: '42px', textAlign: 'center' }}>{usdValueDisplay}</p>
          <p style={{ fontSize: '32px', marginTop: '20px', textAlign: 'center' }}>Address: {address}</p>
          <p style={{ fontSize: '32px', marginTop: '10px', textAlign: 'center' }}>Network: Polygon (Chain ID: {POLYGON_CHAIN_ID})</p>
          <p style={{ fontSize: '26px', marginTop: '10px', textAlign: 'center' }}>Price: ${priceUsd.toFixed(8)} USD</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button.Link href="https://polygonscan.com/token/0x3150e01c36ad3af80ba16c1836efcd967e96776e">Polygonscan</Button.Link>,
        <Button action="/check">Refresh</Button>,
      ]
    })
  } catch (error) {
    console.error('Error in balance check:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error</h1>
          <p style={{ fontSize: '36px', textAlign: 'center' }}>Unable to fetch balance or price. Please try again.</p>
          <p style={{ fontSize: '24px', textAlign: 'center' }}>Error details: {errorMessage}</p>
        </div>
      ),
      intents: [
        <Button action="/">Back</Button>,
        <Button action="/check">Retry</Button>
      ]
    })
  }
})

export const GET = handle(app)
export const POST = handle(app)