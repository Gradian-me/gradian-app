declare module 'rehype-katex' {
  import { Plugin } from 'unified';
  import { Root } from 'hast';

  interface RehypeKatexOptions {
    throwOnError?: boolean;
    errorColor?: string;
    macros?: Record<string, string>;
    colorIsTextColor?: boolean;
    fleqn?: boolean;
    leqno?: boolean;
  }

  const rehypeKatex: Plugin<[RehypeKatexOptions?], Root>;
  export default rehypeKatex;
}


