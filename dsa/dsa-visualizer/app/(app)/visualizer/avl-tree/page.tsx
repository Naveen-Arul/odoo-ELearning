"use client"

import { AVLTreeVisualizer } from "@/components/visualizer/avl-tree/avl-tree-visualizer"
import Content from "./avl-tree.mdx"

export default function AVLTreePage() {
  return <AVLTreeVisualizer content={<Content />} />
}
