import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'

export const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: '$GOLDIES Token Tracker on Polygon',
}).use(
  neynar({
    apiKey: 'YOUR_NEYNAR_API_KEY',
    features: ['interactor', 'cast'],
  })
)

const POLYGON_CHAIN_ID = 137

app.frame('/', (c) => {
  const { fid } = c.frameData || {}
  console.log('FID:', fid)

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

  const { fid, address } = c.frameData || {}
  const { displayName, pfpUrl } = c.var.interactor || {}

  console.log('FID:', fid)
  console.log('Address:', address)
  console.log('Display Name:', displayName)
  console.log('Profile Picture URL:', pfpUrl)

  if (!fid && !address) {
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

  // Placeholder values for balance and price
  const balanceNumber = 1000
  const priceUsd = 0.1

  const balanceDisplay = `${balanceNumber.toLocaleString()} $GOLDIES on Polygon`
  const usdValue = balanceNumber * priceUsd
  const usdValueDisplay = `(~$${usdValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FF8B19', padding: '20px', boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '60px', marginBottom: '20px', textAlign: 'center' }}>Your $GOLDIES Balance</h1>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          {pfpUrl ? (
            <img src={pfpUrl} style={{ width: '64px', height: '64px', borderRadius: '50%', marginRight: '10px' }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', marginRight: '10px', backgroundColor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {fid ? `${fid}`.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <p style={{ fontSize: '32px', textAlign: 'center' }}>{displayName || (fid ? `FID: ${fid}` : address)}</p>
        </div>
        <p style={{ fontSize: '42px', textAlign: 'center' }}>{balanceDisplay}</p>
        <p style={{ fontSize: '42px', textAlign: 'center' }}>{usdValueDisplay}</p>
        <p style={{ fontSize: '32px', marginTop: '20px', textAlign: 'center' }}>Address: {address || `FID: ${fid}`}</p>
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
})

export const GET = handle(app)
export const POST = handle(app)