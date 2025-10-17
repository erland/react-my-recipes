export function fullName(...args: unknown[]): string {
  return args.filter(Boolean).join(" ");
}