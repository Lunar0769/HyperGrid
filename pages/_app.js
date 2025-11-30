import '../styles/globals.css'
import DottedSurface from '../components/DottedSurface'

export default function App({ Component, pageProps }) {
  return (
    <>
      <DottedSurface />
      <Component {...pageProps} />
    </>
  )
}