import { Button, Frog } from 'frog'
import { neynar } from 'frog/middlewares'
import { handle } from 'frog/vercel'

export const app = new Frog({
  title: '$GOLDIES Token Tracker on Polygon',
  imageOptions: { width: 1200, height: 630 },
})
.use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
)

app.frame('/', (c) => {
  console.log('interactor: ', c.var.interactor)

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

app.frame('/check', (c) => {
  const { displayName, pfpUrl, fid, custodyAddress } = c.var.interactor || {}
  console.log('interactor: ', c.var.interactor)

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
              {fid ? `${fid}`.toString().charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <p style={{ fontSize: '32px', textAlign: 'center' }}>{displayName || (fid ? `FID: ${fid}` : 'Unknown User')}</p>
        </div>
        <p style={{ fontSize: '42px', textAlign: 'center' }}>{balanceDisplay}</p>
        <p style={{ fontSize: '42px', textAlign: 'center' }}>{usdValueDisplay}</p>
        <p style={{ fontSize: '32px', marginTop: '20px', textAlign: 'center' }}>Address: {custodyAddress || 'N/A'}</p>
        <p style={{ fontSize: '32px', marginTop: '10px', textAlign: 'center' }}>Network: Polygon (Chain ID: 137)</p>
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