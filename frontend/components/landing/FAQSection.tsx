"use client";

import { useState } from "react";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "How does video generation work?",
      answer: "Axel uses a node-based workflow where you connect image nodes, prompt nodes, and video nodes on a visual canvas. When you connect a prompt to an image, our system generates a video using Google Veo 3.1, maintaining character consistency through face embeddings.",
    },
    {
      question: "What video formats are supported?",
      answer: "We support 720p, 1080p, and 4K resolutions. Videos can be generated in 4, 6, or 8 second durations. Extensions are available in 720p and can be chained up to 20 times.",
    },
    {
      question: "Can I extend existing videos?",
      answer: "Yes! You can extend any generated video up to 20 times. Each extension seamlessly continues from where the previous video ended, maintaining visual consistency and character appearance.",
    },
    {
      question: "How long does generation take?",
      answer: "Video generation typically takes between 10 seconds to 6 minutes, depending on the resolution and complexity. You'll see real-time progress updates through our WebSocket connection.",
    },
    {
      question: "Is there character consistency?",
      answer: "Absolutely. When you upload a face image, our system extracts facial embeddings using advanced AI. These embeddings ensure the same character appears consistently across all generated videos, maintaining their appearance, features, and identity.",
    },
  ];

  return (
    <section id="faq" className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
      <div className="mx-auto max-w-[1440px]">
        <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-12">Q&A</h3>
        <div className="flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="border-b border-white/10 pb-4 cursor-pointer"
              onClick={() => handleToggle(index)}
            >
              <div className="flex justify-between items-center text-xl font-medium">
                <span>{faq.question}</span>
                <span 
                  className={`transition-transform duration-500 ease-out ${
                    openIndex === index ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </div>
              <div
                className="overflow-hidden transition-all duration-500 ease-out"
                style={{
                  maxHeight: openIndex === index ? "1000px" : "0px",
                  opacity: openIndex === index ? 1 : 0,
                }}
              >
                <p className="mt-4 text-gray-400">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
