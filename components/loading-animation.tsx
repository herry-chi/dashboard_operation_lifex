"use client"

import React from "react"
import Image from "next/image"

interface LoadingAnimationProps {
  message?: string
}

export function LoadingAnimation({ message = "Loading..." }: LoadingAnimationProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo with simple fade animation */}
        <div className="mb-8">
          <div className="animate-pulse">
            <Image
              src="/lifex_logo.png"
              alt="LifeX Logo"
              width={300}
              height={120}
              className="mx-auto"
              priority
            />
          </div>
        </div>
        
        {/* Simple loading text */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">
            {message}
          </h2>
          
          {/* Simple loading dots */}
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}