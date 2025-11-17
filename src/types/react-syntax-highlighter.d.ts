declare module 'react-syntax-highlighter' {
  import { Component } from 'react';
  
  export interface SyntaxHighlighterProps {
    language?: string;
    style?: any;
    customStyle?: React.CSSProperties;
    codeTagProps?: {
      style?: React.CSSProperties;
      [key: string]: any;
    };
    lineNumberStyle?: React.CSSProperties;
    showLineNumbers?: boolean;
    startingLineNumber?: number;
    wrapLines?: boolean;
    wrapLongLines?: boolean;
    children?: string;
    [key: string]: any;
  }
  
  export class Prism extends Component<SyntaxHighlighterProps> {}
  
  export const PrismAsync: any;
  export const PrismAsyncLight: any;
  export const PrismLight: any;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const nightOwl: any;
  export const vscDarkPlus: any;
  export const vs: any;
  [key: string]: any;
}

