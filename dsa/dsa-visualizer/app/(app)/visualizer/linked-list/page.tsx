"use client"

import { LinkedListVisualizer } from "@/components/visualizer/linked-list/linked-list-visualizer"
import Content from "./linked-list.mdx"

export default function LinkedListPage() {
  return <LinkedListVisualizer content={<Content />} />
}
