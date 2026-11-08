import Navbar from "./Navbar";
import Hero from "./Hero";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import CtaBanner from "./CtaBanner";
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
        <CtaBanner />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
