"use client";

import Image from "next/image";

export default function FeaturesSection() {
  const features = [
    {
      title: "Node-Based Editor",
      description: "Visual workflow canvas like Figma",
      image: "/node.png",
    },
    {
      title: "Video Extensions",
      description: "Extend videos seamlessly up to 20x",
      image: "/extention.png",
    },
    {
      title: "Character Consistency",
      description: "Facial vector embedding for same character across videos",
      image: "/consistency.jpg",
    },
  ];

  return (
    <section id="features" className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
      <div className="mx-auto max-w-[1440px] flex flex-col gap-12">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between md:items-end">
          <div className="max-w-2xl">
            <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-4">Platform Features</h3>
            <p className="text-xl md:text-2xl font-light text-[#ededed]/80">
              Everything you need to create professional AI-generated videos. Build workflows, maintain consistency, and generate unlimited content.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group relative flex flex-col gap-4"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-gray-900">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-medium">{feature.title}</h4>
                  <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
