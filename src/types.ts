export type McpToolParameter = {
    name: string;
    description: string;
    type: string;
    isOptional?: boolean;
};

export type McpTool = {
    name: string;
    description: string;
    parameters: McpToolParameter[];
};

export type McpServerDescription = {
    name: string;
    version: `${number}.${number}.${number}`;
    tools: McpTool[];
};

