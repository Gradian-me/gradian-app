declare module 'swagger-ui-react' {
  import { Component } from 'react';

  export interface SwaggerUIProps {
    url?: string;
    spec?: any;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelRendering?: 'example' | 'model' | 'schema';
    defaultModelsExpandDepth?: number;
    persistAuthorization?: boolean;
    showExtensions?: boolean;
    [key: string]: any;
  }

  export default class SwaggerUI extends Component<SwaggerUIProps> {}
}

