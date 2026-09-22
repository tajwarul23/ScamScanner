import Cta from "@/components/Cta/cta";
import Footer from "@/components/Footer/footer";
import Hero1 from "@/components/Hero/hero1";
import HowItWorks from "@/components/Hero/how-it-wokrs";
import WhatsInside from "@/components/Hero/whats-inside";




export default function Home() {
  return (
   <>
    <main className="flex-1">
     <Hero1/>
     <HowItWorks/>
     <WhatsInside/>
     <Cta/>
    </main>
    <Footer/>
   </>
  );
}
