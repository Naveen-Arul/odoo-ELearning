"use client"

import { HuffmanVisualizer } from "@/components/visualizer/huffman/huffman-visualizer"
import Content from "./huffman.mdx"

export default function HuffmanPage() {
  return <HuffmanVisualizer content={<Content />} />
}
