// ESM shim for "immutable" so that libraries like swagger-ui-react
// can safely do `import x from "immutable"` even though the real
// package only exposes named exports.

import * as ImmutableNS from "immutable-real";

// Default export: entire namespace, so default-import usage works.
export default ImmutableNS;

// Re-export named exports (`Map`, `List`, etc.) so any existing
// named-import usage continues to behave as expected.
export * from "immutable-real";

