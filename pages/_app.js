import '../styles/globals.css'
import DottedSurface from '../components/DottedSurface'
import { Analytics } from '@vercel/analytics/next'

export default function App({ Component, pageProps }) {
  return (
    <>
      <DottedSurface />
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}