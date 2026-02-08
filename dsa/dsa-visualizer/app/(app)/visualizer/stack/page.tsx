"use client"

import { StackVisualizer } from "@/components/visualizer/stack/stack-visualizer"
import Content from "./stack.mdx"

export default function StackPage() {
  return <StackVisualizer content={<Content />} />
}
