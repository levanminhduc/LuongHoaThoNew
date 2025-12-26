declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  interface SwaggerRequest {
    url: string;
    method: string;
    body?: unknown;
    headers: Record<string, string>;
    [key: string]: unknown;
  }

  interface SwaggerResponse {
    url: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: unknown;
    [key: string]: unknown;
  }

  interface SwaggerUIProps {
    url?: string;
    spec?: object;
    docExpansion?: "list" | "full" | "none";
    defaultModelsExpandDepth?: number;
    displayRequestDuration?: boolean;
    filter?: boolean | string;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    requestInterceptor?: (req: SwaggerRequest) => SwaggerRequest;
    responseInterceptor?: (res: SwaggerResponse) => SwaggerResponse;
    onComplete?: () => void;
    presets?: unknown[];
    plugins?: unknown[];
    supportedSubmitMethods?: string[];
    deepLinking?: boolean;
    showMutatedRequest?: boolean;
    defaultModelExpandDepth?: number;
    defaultModelRendering?: "example" | "model";
    displayOperationId?: boolean;
    tryItOutEnabled?: boolean;
    validatorUrl?: string | null;
    withCredentials?: boolean;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
  export type { SwaggerUIProps, SwaggerRequest, SwaggerResponse };
}

declare module "swagger-jsdoc" {
  interface SwaggerDefinition {
    openapi?: string;
    swagger?: string;
    info: {
      title: string;
      version: string;
      description?: string;
      termsOfService?: string;
      contact?: {
        name?: string;
        url?: string;
        email?: string;
      };
      license?: {
        name: string;
        url?: string;
      };
    };
    host?: string;
    basePath?: string;
    schemes?: string[];
    consumes?: string[];
    produces?: string[];
    servers?: Array<{
      url: string;
      description?: string;
      variables?: Record<
        string,
        {
          default: string;
          description?: string;
          enum?: string[];
        }
      >;
    }>;
    tags?: Array<{
      name: string;
      description?: string;
      externalDocs?: {
        description?: string;
        url: string;
      };
    }>;
    externalDocs?: {
      description?: string;
      url: string;
    };
    components?: {
      schemas?: Record<string, unknown>;
      responses?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
      examples?: Record<string, unknown>;
      requestBodies?: Record<string, unknown>;
      headers?: Record<string, unknown>;
      securitySchemes?: Record<string, unknown>;
      links?: Record<string, unknown>;
      callbacks?: Record<string, unknown>;
    };
    security?: Array<Record<string, string[]>>;
    paths?: Record<string, unknown>;
    definitions?: Record<string, unknown>;
    securityDefinitions?: Record<string, unknown>;
  }

  interface Options {
    definition?: SwaggerDefinition;
    swaggerDefinition?: SwaggerDefinition;
    apis: string[];
    failOnErrors?: boolean;
  }

  function swaggerJsdoc(options: Options): object;
  export = swaggerJsdoc;
  export { Options, SwaggerDefinition };
}
