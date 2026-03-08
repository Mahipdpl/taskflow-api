// src/config/swagger.js
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'TaskFlow API',
    version: '1.0.0',
    description: `
## TaskFlow REST API

Scalable REST API with JWT Authentication and Role-Based Access Control.

### Authentication
Use **Bearer Token** authentication. Obtain tokens via \`/api/v1/auth/login\`.

### Roles
- **user** — Can manage their own tasks
- **admin** — Can manage all tasks and users

### Rate Limiting
- Auth endpoints: 10 requests / 15 minutes
- General API: 100 requests / 15 minutes
    `,
    contact: { name: 'TaskFlow API', email: 'dev@taskflow.dev' },
  },
  servers: [
    { url: 'http://localhost:5000/api/v1', description: 'Development' },
    { url: 'https://api.taskflow.dev/api/v1', description: 'Production' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token from /auth/login',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id:         { type: 'string', format: 'uuid' },
          name:       { type: 'string', example: 'Jane Doe' },
          email:      { type: 'string', format: 'email' },
          role:       { type: 'string', enum: ['user', 'admin'] },
          is_active:  { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          title:       { type: 'string', example: 'Build API' },
          description: { type: 'string' },
          status:      { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
          due_date:    { type: 'string', format: 'date', nullable: true },
          user_id:     { type: 'string', format: 'uuid' },
          created_at:  { type: 'string', format: 'date-time' },
          updated_at:  { type: 'string', format: 'date-time' },
        },
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken:  { type: 'string', description: 'Short-lived JWT (15 min)' },
          refreshToken: { type: 'string', description: 'Long-lived refresh token (7 days)' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success:   { type: 'boolean', example: false },
          message:   { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ValidationError: {
        allOf: [
          { $ref: '#/components/schemas/Error' },
          {
            type: 'object',
            properties: {
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field:   { type: 'string' },
                    message: { type: 'string' },
                    value:   { type: 'string' },
                  },
                },
              },
            },
          },
        ],
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name:     { type: 'string', example: 'Jane Doe' },
                  email:    { type: 'string', format: 'email', example: 'jane@example.com' },
                  password: { type: 'string', example: 'Secret123', description: 'Min 8 chars, uppercase + lowercase + number' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        user:   { $ref: '#/components/schemas/User' },
                        accessToken:  { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          409: { description: 'Email already registered' },
          422: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'admin@taskflow.dev' },
                  password: { type: 'string', example: 'Admin@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Tokens refreshed' }, 401: { description: 'Invalid refresh token' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Profile data' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'List tasks',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page',     in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit',    in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status',   in: 'query', schema: { type: 'string', enum: ['todo', 'in_progress', 'done'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
        ],
        responses: { 200: { description: 'Task list with pagination' } },
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a task',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title:       { type: 'string', example: 'Implement auth' },
                  description: { type: 'string' },
                  status:      { type: 'string', enum: ['todo', 'in_progress', 'done'], default: 'todo' },
                  priority:    { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
                  due_date:    { type: 'string', format: 'date', example: '2025-12-31' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Task created' }, 422: { description: 'Validation error' } },
      },
    },
    '/tasks/{id}': {
      get: {
        tags: ['Tasks'], summary: 'Get a task by ID', security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Task data' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      put: {
        tags: ['Tasks'], summary: 'Update a task', security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title:       { type: 'string' },
                  description: { type: 'string' },
                  status:      { type: 'string', enum: ['todo', 'in_progress', 'done'] },
                  priority:    { type: 'string', enum: ['low', 'medium', 'high'] },
                  due_date:    { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Task updated' } },
      },
      delete: {
        tags: ['Tasks'], summary: 'Delete a task', security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Task deleted' } },
      },
    },
    '/users': {
      get: {
        tags: ['Users (Admin)'], summary: 'List all users (admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page',  in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'role',  in: 'query', schema: { type: 'string', enum: ['user', 'admin'] } },
        ],
        responses: { 200: { description: 'User list' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
  },
};

module.exports = swaggerDefinition;
