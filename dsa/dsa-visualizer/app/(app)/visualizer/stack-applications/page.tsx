"use client"

import { InfixPostfixVisualizer } from "@/components/visualizer/stack-applications/infix-postfix-visualizer"
import Content from "./stack-applications.mdx"

export default function StackApplicationsPage() {
  return <InfixPostfixVisualizer content={<Content />} />
}
