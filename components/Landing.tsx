import Navbar from "./Navbar";
import Hero from "./Hero";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import TrySection from "./TrySection";
import Faq from "./Faq";
import Footer from "./Footer";

export default function Landing() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <TrySection />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
