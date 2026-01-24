"use client";

export default function ProcessSection() {
  const steps = [
    {
      number: "01",
      title: "Upload & Analyze",
      description: "Upload a face image and our AI extracts embeddings to ensure character consistency across all your videos. The system analyzes facial features and stores them for future use.",
    },
    {
      number: "02",
      title: "Create & Enhance",
      description: "Write your video prompt and let our AI enhance it with visual details, camera angles, and temporal descriptions. Get suggestions to improve your prompt for better results.",
    },
    {
      number: "03",
      title: "Generate & Extend",
      description: "Generate videos using Google Veo 3.1 in 720p, 1080p, or 4K. Extend your videos seamlessly up to 20 times, maintaining consistency and quality throughout.",
    },
  ];

  return (
    <section id="process" className="w-full bg-[#0a0a0a] px-6 py-24 md:px-12">
      <div className="mx-auto max-w-[1440px] flex flex-col gap-16">
        <div className="max-w-2xl">
          <h3 className="text-sm font-medium uppercase tracking-wider text-gray-400 mb-4">How It Works</h3>
          <p className="text-xl md:text-2xl font-light text-[#ededed]/80">
            Our platform guides you through three simple steps to create professional AI-generated videos with character consistency.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {steps.map((step) => (
            <div key={step.number} className="border-t border-white/10 pt-8 flex flex-col md:flex-row gap-8 md:gap-32">
              <span className="text-sm font-mono text-gray-500">{step.number}</span>
              <div className="flex-1">
                <h4 className="text-2xl font-serif mb-4">{step.title}</h4>
                <p className="text-gray-400 max-w-xl">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
