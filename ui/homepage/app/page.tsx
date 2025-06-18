import Hero from '@components/Hero'
import Features from '@components/Features'
import OpenSource from '@components/OpenSource'
import DownloadSection from '@components/DownloadSection'
import Footer from '@components/Footer'
import NavBar from '@components/NavBar'

export default function Page() {
  return (
    <>
      <NavBar />
      <main className="pt-24">
        <Hero />
        <Features />
        <OpenSource />
        <DownloadSection />
      </main>
      <Footer />
    </>
  )
}
