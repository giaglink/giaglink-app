"use client";

import Image from "next/image";
import placeholderImages from '@/app/lib/placeholder-images.json';

export function BackgroundImage() {
  const { authBackground } = placeholderImages;

  return (
    <div className="fixed inset-0 -z-10">
      <Image
        src={authBackground.src}
        alt="Background"
        fill
        className="object-cover"
        quality={80}
        priority
        data-ai-hint="glowing earth"
      />
      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
}
