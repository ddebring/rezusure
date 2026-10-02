"use client";

import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
  className?: string;
};
export function Logo({
  href = "/",
  className = "",
}: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="REZUSURE."
      className={`flex shrink-0 items-center ${className}`}
    >

        <Image
  src="/rezusure-logo.png"
  alt="REZUSURE."
  width={190}
  height={50}
  priority
  className="h-auto w-[150px] object-contain md:w-[165px]"
/>

    </Link>
  );
}