"use client"

import { QueueVisualizer } from "@/components/visualizer/queue/queue-visualizer"
import Content from "./queue.mdx"

export default function QueuePage() {
  return <QueueVisualizer content={<Content />} />
}
