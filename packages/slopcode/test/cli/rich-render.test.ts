import { describe, expect, test } from "bun:test"
import { segmentRichText, segmentsToMarkdown } from "../../src/cli/render/segment"

const sample = `$ curl -sSf "http://127.0.0.1:8000/health"
# Tests file upload endpoint with settings
$ python3 - <<'PY'
import json, time, urllib.request
print("hello")
PY
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>`

describe("rich render segmentation", () => {
  test("detects heredoc code inside shell transcripts", () => {
    const segments = segmentRichText(sample)
    expect(segments).toEqual([
      {
        kind: "code",
        filetype: "bash",
        text: `$ curl -sSf "http://127.0.0.1:8000/health"
# Tests file upload endpoint with settings
$ python3 - <<'PY'`,
      },
      {
        kind: "code",
        filetype: "python",
        text: 'import json, time, urllib.request\nprint("hello")',
      },
      {
        kind: "code",
        filetype: "bash",
        text: "PY",
      },
      {
        kind: "plain",
        text: `Traceback (most recent call last):
  File "<stdin>", line 1, in <module>`,
      },
    ])
  })

  test("preserves fenced code languages in markdown export", () => {
    const markdown = segmentsToMarkdown(segmentRichText(sample))
    expect(markdown).toContain("```bash")
    expect(markdown).toContain("```python")
    expect(markdown).toContain("```text")
  })
})
