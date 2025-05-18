import {promises} from 'fs';
import type {McpServerDescription} from './types.js';

const requestPath = `${process.env.LOCALAPPDATA}/Microsoft/olk/Attachments/request.json`;
const serverDescriptionPath = `${process.env.LOCALAPPDATA}/Microsoft/olk/Attachments/server.json`;

function getResponsePath(requestId: number): string {
    return `${process.env.LOCALAPPDATA}/Microsoft/olk/Attachments/response${requestId}.json`;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

let requestId = getRandomInt(0, 10000000);

// Send a tool request to Monarch by writing it to a request.json file and
// poll for the response in a response.json file.
export async function requestFromMonarch(tool: string, args: any): Promise<string> {
    requestId++;
    const content = {
        tool,
        requestId,
        args
    };
    try {
        await promises.writeFile(requestPath, JSON.stringify(content));
    }
    catch (err) {
        return 'Error writing file: ' + err;
    }
    
    return waitForResponse(requestId);
}

async function tryReadFile(path:string): Promise<any | undefined> {
    let content: any;
    try {
        content = await promises.readFile(path, 'utf8');
    } catch (err) {
        return undefined;
    }
    try {
        return JSON.parse(content);
    } catch (err) {
        throw new Error('Error parsing JSON: ' + content);
    }
}

async function waitForResponse(requestId: number): Promise<any> {
    const responsePath = getResponsePath(requestId);
    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            try {
                const content = await tryReadFile(responsePath);
                if (!content) {
                    return;
                }
                clearInterval(interval);
                if (content.isError) {
                    throw new Error(content.value);
                }
                resolve(content.value);
            } catch (err) {
                clearInterval(interval);
                reject(err);
            }
        }, 100); // Poll for response
    });
}

// Read the Monarch mcp server description from server.json. We poll in case Monarch
// hasn't written the file yet.
export async function readServerDescription(): Promise<McpServerDescription> {
    return new Promise<McpServerDescription>((resolve, reject) => {
        const interval = setInterval(async () => {
            try {
                const content = await tryReadFile(serverDescriptionPath);
                if (content) {
                    clearInterval(interval);
                    resolve(content);
                }
            } catch (err) {
                clearInterval(interval);
                reject(err);    
            }
        }, 100); // Poll for server description
    });
}