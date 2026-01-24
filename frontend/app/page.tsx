"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white selection:bg-white/20">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 bg-gradient-to-b from-black/50 to-transparent backdrop-blur-sm">
        <div className="text-2xl font-bold tracking-tight">Vence</div>
        <div className="hidden gap-8 text-sm font-medium opacity-90 md:flex">
          <Link href="/work" className="hover:opacity-70 transition-opacity">Work</Link>
          <Link href="/about" className="hover:opacity-70 transition-opacity">About</Link>
          <Link href="/contact" className="hover:opacity-70 transition-opacity">Contact</Link>
        </div>
      </nav>

      {/* Landing Hero */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* Background GIF */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/bg.gif"
            alt=""
            fill
            className="object-cover opacity-60"
            unoptimized
            priority
          />
          {/* Overlay gradient to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
        </div>

        <div className="max-w-[1440px] relative z-10">
          <h1 className="max-w-4xl font-[family-name:var(--font-inter-display)] text-4xl font-light leading-[1.2] tracking-tight text-[#d1d9e6] sm:text-5xl md:text-6xl">
            We transform ideas into visual masterpieces
          </h1>
        </div>
      </section>

      {/* Splitted Hero */}
      <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-12 lg:flex-row">
          {/* Left Content */}
          <div className="flex flex-1 flex-col justify-between gap-16">
            <div className="flex flex-col gap-8">
              <h2 className="font-serif text-4xl font-normal leading-tight text-[#ededed] md:text-5xl lg:text-6xl">
                We don’t follow trends. We create them.
              </h2>
              
              <div className="flex max-w-2xl flex-col gap-6 text-lg font-light leading-relaxed text-[#ededed]/80">
                <p>
                  We are driven by an unwavering commitment to excellence and a passion for innovation. Our approach blends meticulous craftsmanship with a bold vision, allowing us to create content that stands out in a crowded marketplace. Our work is defined by its sophistication, creativity, and ability to push the boundaries of what's possible.
                </p>
                <p>
                  Beyond client-driven projects, we invest in experimental work that challenges the status quo and explores the limitless possibilities of digital media. By constantly pushing the limits of technology and creativity, we not only enhance our skills but also inspire new trends and set new standards in the industry.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  <Image 
                    src="https://framerusercontent.com/images/YVLbyKOl5YT3U2re1orfEdbqbk.webp"
                    alt="Alex Bennet"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-lg font-medium text-[#ededed]">
                  Alex Bennet, Creative Director
                </span>
              </div>
              
              <div>
                <Link 
                  href="/about"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
                >
                  Learn more
                </Link>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative min-h-[500px] flex-1 overflow-hidden rounded-2xl lg:min-h-screen">
            <Image
              src="https://framerusercontent.com/images/KbjJDzXJGXQmextyD2imXP0pn8.webp"
              alt="Visual masterpiece"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* Quote Hero 1 */}
      <section className="flex min-h-[80vh] w-full items-center justify-center bg-[#0a0a0a] px-6 py-24 md:px-12">
        <div className="max-w-4xl text-center">
          <h2 className="font-serif text-3xl font-normal leading-snug text-[#ededed] md:text-5xl lg:text-6xl">
            At Vence, we excel in creating captivating content that not only captures attention but also drives meaningful engagement. We leverages cutting-edge technology and innovative storytelling techniques to produce visually stunning commercials.
          </h2>
        </div>
      </section>

      {/* Selected Work */}
      <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
        <div className="mx-auto max-w-[1440px] flex flex-col gap-12">
          <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-end">
             <div className="max-w-2xl">
               <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-4">Selected Work</h3>
               <p className="text-xl md:text-2xl font-light text-[#ededed]/80">
                 We partner with leading brands to create exceptional, game-changing content. By working closely with some of the most influential names in the industry.
               </p>
             </div>
             <Link href="/work" className="text-white border-b border-white pb-1 hover:opacity-70 transition-opacity">View all work</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Work Card 1 */}
            <div className="group relative flex flex-col gap-4">
               <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-900">
                  {/* Placeholder for work image */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 to-purple-900/20 group-hover:scale-105 transition-transform duration-500" />
               </div>
               <div className="flex justify-between items-start">
                 <div>
                   <h4 className="text-xl font-medium">Architecture</h4>
                   <p className="text-gray-400">Shaping Urban Icons</p>
                 </div>
                 <span className="text-sm text-gray-500">2024</span>
               </div>
            </div>
             {/* Work Card 2 */}
            <div className="group relative flex flex-col gap-4">
               <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-900">
                  {/* Placeholder for work image */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/20 to-teal-900/20 group-hover:scale-105 transition-transform duration-500" />
               </div>
               <div className="flex justify-between items-start">
                 <div>
                   <h4 className="text-xl font-medium">Fashion</h4>
                   <p className="text-gray-400">Redefining Style</p>
                 </div>
                 <span className="text-sm text-gray-500">2024</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
         <div className="mx-auto max-w-[1440px] flex flex-col gap-16">
            <div className="max-w-2xl">
               <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-4">Process</h3>
               <p className="text-xl md:text-2xl font-light text-[#ededed]/80">
                 Our work is guided by three core values that ensure the highest quality and impact in every project we undertake.
               </p>
            </div>

            <div className="flex flex-col gap-8">
               {/* Process 1 */}
               <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row gap-8 md:gap-32">
                  <span className="text-sm font-mono text-gray-500">01</span>
                  <div className="flex-1">
                     <h4 className="text-2xl font-serif mb-4">Research</h4>
                     <p className="text-gray-400 max-w-xl">We start by understanding your market, audience, and goals. This includes competitor analysis, brand audits, and interviews to get a full picture of where you stand.</p>
                  </div>
               </div>
               {/* Process 2 */}
               <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row gap-8 md:gap-32">
                  <span className="text-sm font-mono text-gray-500">02</span>
                  <div className="flex-1">
                     <h4 className="text-2xl font-serif mb-4">Strategy</h4>
                     <p className="text-gray-400 max-w-xl">We define the core of your brand — positioning, messaging, and tone of voice. This becomes the foundation for how your brand behaves and communicates.</p>
                  </div>
               </div>
               {/* Process 3 */}
               <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row gap-8 md:gap-32">
                  <span className="text-sm font-mono text-gray-500">03</span>
                  <div className="flex-1">
                     <h4 className="text-2xl font-serif mb-4">Design</h4>
                     <p className="text-gray-400 max-w-xl">We bring the strategy to life through a full visual identity system. That includes logo, typography, color, imagery, and layout rules.</p>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* FAQ */}
      <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
         <div className="mx-auto max-w-[1440px]">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-12">Q&A</h3>
            <div className="flex flex-col gap-4">
              <details className="group border-b border-white/10 pb-4 cursor-pointer">
                <summary className="flex justify-between items-center text-xl font-medium list-none">
                   <span>How long does a project take?</span>
                   <span className="group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-gray-400">Timelines vary depending on the scope, but typically range from 4-8 weeks for a standard branding project.</p>
              </details>
              <details className="group border-b border-white/10 pb-4 cursor-pointer">
                <summary className="flex justify-between items-center text-xl font-medium list-none">
                   <span>Do you work with startups?</span>
                   <span className="group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-gray-400">Yes, we love working with ambitious startups that are looking to disrupt their industries.</p>
              </details>
               <details className="group border-b border-white/10 pb-4 cursor-pointer">
                <summary className="flex justify-between items-center text-xl font-medium list-none">
                   <span>What are your deliverables?</span>
                   <span className="group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-gray-400">We provide comprehensive brand guidelines, logo files in all formats, and any specific design assets agreed upon in the scope.</p>
              </details>
            </div>
         </div>
      </section>

      {/* Quote Hero 2 */}
      <section className="flex min-h-[60vh] w-full items-center justify-center bg-[#0a0a0a] px-6 py-24 md:px-12">
        <div className="max-w-4xl text-center">
          <h2 className="font-serif text-3xl font-normal leading-snug text-[#ededed] md:text-5xl lg:text-6xl">
            Our success hinges on our ability to innovate boldly and execute with precision. We're committed to setting new standards in creativity and delivering exceptional results that inspire.
          </h2>
        </div>
      </section>

      {/* Expertise */}
      <section className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
         <div className="mx-auto max-w-[1440px]">
             <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-8">Expertise</h3>
             <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
                <p className="text-lg md:text-xl font-light text-[#ededed]/80 flex-1 leading-relaxed">
                   We pride ourselves on our versatility and expertise across various mediums. From striking commercials that capture attention to dynamic ads that drive engagement, our team delivers content that resonates with audiences and leaves a lasting impression. Each project is approached with a deep understanding of our clients' unique needs and goals.
                </p>
                <div className="hidden lg:block w-px bg-white/10 self-stretch" />
                <div className="lg:w-1/4">
                   <Link 
                     href="/about"
                     className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
                   >
                     Read more
                   </Link>
                </div>
             </div>
         </div>
      </section>

      {/* CTA */}
      <section className="relative w-full h-[600px] flex items-center justify-center px-6 text-center overflow-hidden">
         <Image 
           src="https://framerusercontent.com/images/BhlGrMWa8BjbLVs1247F4KgYYA.jpg"
           alt="Background"
           fill
           className="object-cover opacity-60"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
         
         <div className="relative z-10 max-w-3xl flex flex-col gap-10 items-center">
            <blockquote className="font-serif text-3xl md:text-5xl leading-tight">
              "Working with Vence transformed our project — their creativity and detail exceeded our expectations."
            </blockquote>
            
            <div className="flex items-center gap-4">
               <div className="relative h-12 w-12 overflow-hidden rounded-full">
                  <Image 
                    src="https://framerusercontent.com/images/0xbktCoQ1FitPsBfXIm6XgBS0Sk.jpg"
                    alt="Mack Harris"
                    fill
                    className="object-cover"
                  />
               </div>
               <div className="text-left">
                  <div className="font-medium">Mack Harris</div>
                  <div className="text-sm text-gray-400">CEO of NeXT</div>
               </div>
            </div>

            <Link 
               href="/contact"
               className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition-colors hover:bg-gray-200"
             >
               Let's work together
             </Link>
         </div>
      </section>

      {/* Floating Remix Button (Preserved from original request) */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black shadow-lg hover:bg-gray-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
          Remix
        </button>
      </div>
    </div>
  );
}
