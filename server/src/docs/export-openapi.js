/**
 * Exports the OpenAPI document and a Postman collection generated from it:
 *   npm run openapi
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openapi } from './openapi.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(here, '../../docs');
fs.mkdirSync(docsDir, { recursive: true });

const specPath = path.join(docsDir, 'openapi.json');
fs.writeFileSync(specPath, JSON.stringify(openapi, null, 2));
console.log('Wrote', specPath);

const folders = new Map();

for (const [routePath, operations] of Object.entries(openapi.paths)) {
  for (const [method, operation] of Object.entries(operations)) {
    const tag = operation.tags?.[0] || 'General';
    const pathVariables = (routePath.match(/\{([^}]+)\}/g) || []).map((variable) => ({
      key: variable.slice(1, -1),
      value: '',
    }));

    const queryParams = (operation.parameters || [])
      .filter((parameter) => parameter.in === 'query')
      .map((parameter) => ({ key: parameter.name, value: '', disabled: true }));

    const request = {
      method: method.toUpperCase(),
      header: [],
      url: {
        raw: `{{baseUrl}}${routePath}`,
        host: ['{{baseUrl}}'],
        path: routePath.split('/').filter(Boolean),
        variable: pathVariables,
        query: queryParams,
      },
      description: operation.summary || '',
    };

    const requestSchema =
      operation.requestBody?.content?.['application/json']?.schema;
    if (requestSchema) {
      request.header.push({ key: 'Content-Type', value: 'application/json' });
      request.body = {
        mode: 'raw',
        raw: JSON.stringify(sampleFromSchema(requestSchema), null, 2),
        options: { raw: { language: 'json' } },
      };
    }
    if (operation.security?.length) {
      request.auth = { type: 'bearer', bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }] };
    }

    if (!folders.has(tag)) folders.set(tag, []);
    folders.get(tag).push({
      name: operation.summary || `${method.toUpperCase()} ${routePath}`,
      request,
      response: [],
    });
  }
}

function sampleFromSchema(schema) {
  if (!schema || typeof schema !== 'object') return {};
  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    return sampleFromSchema(openapi.components.schemas[name]);
  }
  if (schema.type === 'array') return [sampleFromSchema(schema.items)];
  if (schema.type === 'object' || schema.properties) {
    const result = {};
    for (const [key, value] of Object.entries(schema.properties || {})) {
      result[key] = sampleFromSchema(value);
    }
    return result;
  }
  if (schema.example !== undefined) return schema.example;
  if (schema.enum) return schema.enum[0];
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return false;
  return '';
}

const collection = {
  info: {
    name: 'Reddit Clone API',
    description: openapi.info.description,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'baseUrl', value: 'http://localhost:5000/api' },
    { key: 'accessToken', value: '' },
  ],
  item: [...folders.entries()].map(([name, items]) => ({ name, item: items })),
};

const postmanPath = path.join(docsDir, 'postman_collection.json');
fs.writeFileSync(postmanPath, JSON.stringify(collection, null, 2));
console.log('Wrote', postmanPath);
