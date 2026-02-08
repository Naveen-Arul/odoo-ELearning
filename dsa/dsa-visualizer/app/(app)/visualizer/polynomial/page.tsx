"use client"

import { PolynomialVisualizer } from "@/components/visualizer/polynomial/polynomial-visualizer"
import Content from "./polynomial.mdx"

export default function PolynomialPage() {
  return <PolynomialVisualizer content={<Content />} />
}
