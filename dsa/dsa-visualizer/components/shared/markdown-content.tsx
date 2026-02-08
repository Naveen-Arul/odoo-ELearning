"use client"

import ReactMarkdown from "react-markdown"
import { MDXProvider } from '@mdx-js/react'

interface MarkdownContentProps {
  content: React.ReactNode | string
}

const components = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3 text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xl font-semibold mb-2 text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc pl-6 mb-4 text-muted-foreground">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal pl-6 mb-4 text-muted-foreground">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="mb-1">{children}</li>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="mb-4 rounded-lg border border-border bg-card/50 px-4 py-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  a: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href} className="text-primary hover:underline">
      {children}
    </a>
  ),
  code: ({ children }: { children: React.ReactNode }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg border border-border bg-card p-4 text-sm">
      {children}
    </pre>
  ),
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="mb-4 w-full overflow-x-auto rounded-lg border-2 border-black dark:border-white">
      <table className="w-full text-left text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-muted/50 text-foreground">{children}</thead>
  ),
  tbody: ({ children }: { children: React.ReactNode }) => (
    <tbody className="divide-y-2 divide-black/30 dark:divide-white/50">{children}</tbody>
  ),
  tr: ({ children }: { children: React.ReactNode }) => (
    <tr className="hover:bg-muted/30">{children}</tr>
  ),
  th: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={`px-6 py-3 font-semibold border-r-2 border-black/40 dark:border-white/60 last:border-r-0 ${className ?? ""}`}>
      {children}
    </th>
  ),
  td: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={`px-6 py-3 text-muted-foreground border-r-2 border-black/20 dark:border-white/40 last:border-r-0 ${className ?? ""}`}>
      {children}
    </td>
  ),
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose prose-invert max-w-none">
      <MDXProvider components={components}>
        {typeof content === 'string' ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          content
        )}
      </MDXProvider>
    </div>
  )
}
