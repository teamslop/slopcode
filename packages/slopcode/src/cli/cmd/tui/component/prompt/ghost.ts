export function ghostRemainder(input: string, suggestion: string) {
  if (!input) return
  const lhs = input.toLocaleLowerCase()
  const rhs = suggestion.toLocaleLowerCase()
  if (!rhs.startsWith(lhs)) return
  return suggestion.slice(input.length)
}
