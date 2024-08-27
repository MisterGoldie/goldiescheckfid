import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { ethers } from 'ethers'
import fetch from 'node-fetch'
import { neynar } from 'frog/middlewares'
import { pinata } from 'frog/hubs'

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$GOLDIES Token Tracker on Polygon',
  hub: pinata(),
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
)

const GOLDIES_TOKEN_ADDRESS = '0x3150E01c36ad3Af80bA16C1836eFCD967E96776e'
const ALCHEMY_POLYGON_URL = 'https://polygon-mainnet.g.alchemy.com/v2/pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'
const ALCHEMY_MAINNET_URL = 'https://eth-mainnet.g.alchemy.com/v2/pe-VGWmYoLZ0RjSXwviVMNIDLGwgfkao'
const POLYGON_CHAIN_ID = 137
const NEYNAR_API_URL = 'https://api.neynar.com/v2/farcaster'
const NEYNAR_API_KEY = 'NEYNAR_FROG_FM'
const FALLBACK_PRICE = 0.00007442 // Fallback price if unable to fetch

const ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

async function resolveAddress(input: string): Promise<string> {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  if (ethers.isAddress(input)) {
    return input;
  }

  if (input.endsWith('.eth')) {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_MAINNET_URL);
    try {
      const address = await provider.resolveName(input);
      if (address) {
        return address;
      }
    } catch (error) {
      console.error('Error resolving ENS name:', error);
    }
  }

  throw new Error('Invalid address or ENS name');
}

async function getGoldiesBalance(address: string): Promise<string> {
  try {
    console.log('Fetching balance for address:', address)
    const provider = new ethers.JsonRpcProvider(ALCHEMY_POLYGON_URL, POLYGON_CHAIN_ID)
    const contract = new ethers.Contract(GOLDIES_TOKEN_ADDRESS, ABI, provider)

    const balance = await contract.balanceOf(address)
    const decimals = await contract.decimals()

    const formattedBalance = ethers.formatUnits(balance, decimals)
    console.log('Fetched balance:', formattedBalance)
    return formattedBalance
  } catch (error) {
    console.error('Error in getGoldiesBalance:', error)
    return 'Error: Unable to fetch balance'
  }
}

async function getGoldiesUsdPrice(): Promise<number> {
  try {
    console.log('Fetching $GOLDIES price from DEX Screener...')
    const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/polygon/0x19976577bb2fa3174b4ae4cf55e6795dde730135')
    const data = await response.json()
    console.log('DEX Screener API response:', JSON.stringify(data, null, 2))

    if (data.pair && data.pair.priceUsd) {
      const priceUsd = parseFloat(data.pair.priceUsd)
      console.log('Fetched $GOLDIES price in USD:', priceUsd)
      return priceUsd
    } else {
      console.error('Invalid price data received from DEX Screener')
      return FALLBACK_PRICE
    }
  } catch (error) {
    console.error('Error in getGoldiesUsdPrice:', error)
    return FALLBACK_PRICE
  }
}

async function getConnectedAddress(fid: number): Promise<string | null> {
  try {
    const response = await fetch(`${NEYNAR_API_URL}/user?fid=${fid}`, {
      headers: {
        'api_key': NEYNAR_API_KEY
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.result.user.custody_address || null;
  } catch (error) {
    console.error('Error fetching connected address:', error);
    return null;
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
  
  const { fid } = c.frameData || {}
  const { displayName, pfpUrl } = c.var.interactor || {}

  console.log('FID:', fid)
  console.log('Display Name:', displayName)
  console.log('Profile Picture URL:', pfpUrl)

  let balanceDisplay = "Unable to fetch balance"
  let usdValueDisplay = ""
  let priceUsd = 0

  try {
    if (!fid) {
      throw new Error('No FID found for the user.')
    }

    const connectedAddress = await getConnectedAddress(fid);
    if (!connectedAddress) {
      throw new Error('Unable to fetch connected Ethereum address');
    }
    console.log('Connected Ethereum address:', connectedAddress);

    const resolvedAddress = await resolveAddress(connectedAddress);
    console.log('Resolved address:', resolvedAddress);

    console.log('Fetching balance and price')
    const balance = await getGoldiesBalance(resolvedAddress)
    priceUsd = await getGoldiesUsdPrice()

    if (balance === '0.0') {
      balanceDisplay = "You don't have any $GOLDIES tokens on Polygon yet!"
    } else if (!balance.startsWith('Error')) {
      const balanceNumber = parseFloat(balance)
      balanceDisplay = `${balanceNumber.toLocaleString()} $GOLDIES on Polygon`

      const usdValue = balanceNumber * priceUsd
      console.log('Calculated USD value:', usdValue)
      usdValueDisplay = `(~$${usdValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`
    } else {
      balanceDisplay = balance
      usdValueDisplay = "Unable to calculate USD value"
    }
  } catch (error) {
    console.error('Error in balance check:', error)
    balanceDisplay = "Error fetching balance"
    usdValueDisplay = "Unable to calculate USD value"
  }

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center' }}>Your $GOLDIES Balance</h1>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          {pfpUrl ? (
            <img 
              src={pfpUrl} 
              alt="Profile" 
              style={{ width: '64px', height: '64px', borderRadius: '50%', marginRight: '10px' }}
            />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <p style={{ fontSize: '32px', textAlign: 'center' }}>{displayName || `FID: ${fid}`}</p>
        </div>
        <p style={{ fontSize: '32px', textAlign: 'center' }}>{balanceDisplay}</p>
        <p style={{ fontSize: '28px', textAlign: 'center', marginTop: '10px' }}>{usdValueDisplay}</p>
      </div>
    ),
    intents: [
      <Button action="https://polygonscan.com/token/0x3150e01c36ad3af80ba16c1836efcd967e96776e">View on PolygonScan</Button>,
    ]
  })
})

export default handle(app)
