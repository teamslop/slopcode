import { findHeredocEnd, parseHeredoc } from "./heredoc"
import { resolveCodeLanguage } from "./language"
import type { RichSegment } from "./types"

export function segmentRichText(input: string) {
  const text = input.replace(/\r\n?/g, "\n")
  const lines = text.split("\n")
  const segments = [] as RichSegment[]
  const prose = [] as string[]
  let i = 0

  const flush = () => {
    if (!prose.length) return
    pushSegments(segments, segmentPlain(prose.join("\n")))
    prose.length = 0
  }

  while (i < lines.length) {
    const line = lines[i]
    const match = line.match(/^```([^\s`]*)\s*$/)
    if (!match) {
      prose.push(line)
      i++
      continue
    }

    flush()
    const body = [] as string[]
    const language = resolveCodeLanguage(match[1])
    const start = i
    i++

    while (i < lines.length && !/^```\s*$/.test(lines[i]!)) {
      body.push(lines[i]!)
      i++
    }

    if (i >= lines.length) {
      push(segments, {
        kind: "markdown",
        text: lines.slice(start).join("\n"),
      })
      break
    }

    i++
    push(segments, {
      kind: "code",
      filetype: language,
      text: body.join("\n"),
    })
  }

  flush()
  return segments
}

export function segmentsToMarkdown(segments: RichSegment[]) {
  return segments
    .map((segment) => {
      if (segment.kind === "markdown") return segment.text
      if (segment.kind === "plain") return `\`\`\`text\n${segment.text}\n\`\`\``
      return `\`\`\`${segment.filetype}\n${segment.text}\n\`\`\``
    })
    .filter(Boolean)
    .join("\n\n")
}

function segmentPlain(text: string) {
  const lines = text.split("\n")
  const segments = [] as RichSegment[]
  const prose = [] as string[]
  let i = 0

  const flush = () => {
    if (!prose.length) return
    push(segments, {
      kind: "markdown",
      text: prose.join("\n"),
    })
    prose.length = 0
  }

  while (i < lines.length) {
    if (!isTranscriptStart(lines[i]!)) {
      prose.push(lines[i]!)
      i++
      continue
    }

    flush()
    const result = consumeTranscript(lines, i)
    pushSegments(segments, result.segments)
    i = result.next
  }

  flush()
  return segments
}

function consumeTranscript(lines: string[], start: number) {
  const segments = [] as RichSegment[]
  let i = start

  while (i < lines.length) {
    const line = lines[i]!

    if (line.startsWith("$ ") || line.startsWith("# ")) {
      push(segments, {
        kind: "code",
        filetype: "bash",
        text: line,
      })

      const heredoc = parseHeredoc(line)
      i++
      if (!heredoc) continue

      const end = findHeredocEnd(lines, i, heredoc.marker)
      if (end === undefined) {
        push(segments, {
          kind: "code",
          filetype: heredoc.filetype,
          text: lines
            .slice(i)
            .map((item) => (heredoc.stripTabs ? item.replace(/^\t/, "") : item))
            .join("\n"),
        })
        return { next: lines.length, segments }
      }

      const body = lines
        .slice(i, end)
        .map((item) => (heredoc.stripTabs ? item.replace(/^\t/, "") : item))
        .join("\n")
      if (body) {
        push(segments, {
          kind: "code",
          filetype: heredoc.filetype,
          text: body,
        })
      }
      push(segments, {
        kind: "code",
        filetype: "bash",
        text: lines[end]!,
      })
      i = end + 1
      continue
    }

    if (line === "" && endsTranscript(lines, i)) break

    const output = [] as string[]
    while (i < lines.length) {
      const current = lines[i]!
      if (current.startsWith("$ ") || current.startsWith("# ")) break
      if (current === "" && endsTranscript(lines, i)) break
      output.push(current)
      i++
    }

    if (output.length) {
      push(segments, {
        kind: "plain",
        text: output.join("\n"),
      })
    }
  }

  return { next: i, segments }
}

function endsTranscript(lines: string[], index: number) {
  for (let i = index + 1; i < lines.length; i++) {
    const line = lines[i]!
    if (!line.trim()) continue
    return !line.startsWith("$") && !line.startsWith("#")
  }
  return true
}

function isTranscriptStart(line: string) {
  return line.startsWith("$ ")
}

function pushSegments(target: RichSegment[], segments: RichSegment[]) {
  for (const segment of segments) push(target, segment)
}

function push(target: RichSegment[], next: RichSegment) {
  if (!next.text) return
  const prev = target.at(-1)
  if (!prev) {
    target.push(next)
    return
  }
  if (prev.kind !== next.kind) {
    target.push(next)
    return
  }
  if (prev.kind === "code" && next.kind === "code" && prev.filetype !== next.filetype) {
    target.push(next)
    return
  }
  prev.text += `\n${next.text}`
}
