"use client"

import { MessageQueueVisualizer } from "@/components/visualizer/queue-applications/message-queue-visualizer"
import Content from "./message-queue.mdx"

export default function MessageQueuePage() {
  return <MessageQueueVisualizer content={<Content />} />
}
