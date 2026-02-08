"use client"

import { DijkstraVisualizer } from "@/components/visualizer/dijkstra/dijkstra-visualizer"
import Content from "./dijkstra.mdx"

export default function DijkstraPage() {
  return <DijkstraVisualizer content={<Content />} />
}
