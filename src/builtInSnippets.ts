import { Snippet, SnippetFolder } from './snippetManager';

export const builtInFolders: SnippetFolder[] = [
  { id: 'react-folder', name: 'React', parentId: undefined },
  { id: 'nextjs-folder', name: 'Next.js', parentId: undefined },
  { id: 'node-folder', name: 'Node.js', parentId: undefined },
  { id: 'html-folder', name: 'HTML/CSS', parentId: undefined },
  { id: 'typescript-folder', name: 'TypeScript', parentId: undefined },
  { id: 'python-folder', name: 'Python', parentId: undefined },
  { id: 'api-folder', name: 'API Templates', parentId: undefined },
  { id: 'testing-folder', name: 'Testing', parentId: undefined },
];

export const builtInSnippets: Snippet[] = [
  // ============================================
  // REACT TEMPLATES
  // ============================================
  {
    id: 'react-functional-component',
    name: 'React Component',
    description: 'A modern React functional component with TypeScript, props interface, and optional styling',
    tags: ['react', 'component', 'typescript', 'functional'],
    folderId: 'react-folder',
    variables: {
      'ComponentName': 'Button'
    },
    files: [
      {
        filename: '{{ComponentName}}.tsx',
        path: 'src/components/{{ComponentName}}',
        content: `import React from 'react';
import styles from './{{ComponentName}}.module.css';

export interface {{ComponentName}}Props {
  /** Content to display inside the component */
  children?: React.ReactNode;
  /** Additional CSS class name */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * {{ComponentName}} Component
 * 
 * @example
 * <{{ComponentName}} onClick={() => console.log('clicked')}>
 *   Click me
 * </{{ComponentName}}>
 */
export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({
  children,
  className = '',
  onClick,
}) => {
  return (
    <div 
      className={\`\${styles.container} \${className}\`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {children}
    </div>
  );
};

export default {{ComponentName}};
`
      },
      {
        filename: '{{ComponentName}}.module.css',
        path: 'src/components/{{ComponentName}}',
        content: `.container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 8px;
  background-color: #3b82f6;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;
}

.container:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.container:active {
  transform: translateY(0);
}

.container:focus-visible {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}
`
      },
      {
        filename: 'index.ts',
        path: 'src/components/{{ComponentName}}',
        content: `export { {{ComponentName}}, type {{ComponentName}}Props } from './{{ComponentName}}';
export { default } from './{{ComponentName}}';
`
      }
    ]
  },

  {
    id: 'react-context-provider',
    name: 'React Context Provider',
    description: 'A complete React Context with Provider, hook, and TypeScript types',
    tags: ['react', 'context', 'typescript', 'state-management'],
    folderId: 'react-folder',
    variables: {
      'ContextName': 'Theme'
    },
    files: [
      {
        filename: '{{ContextName}}Context.tsx',
        path: 'src/contexts',
        content: `import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Types
interface {{ContextName}}State {
  value: string;
  isLoading: boolean;
}

interface {{ContextName}}Actions {
  setValue: (value: string) => void;
  reset: () => void;
}

type {{ContextName}}ContextType = {{ContextName}}State & {{ContextName}}Actions;

// Initial state
const initialState: {{ContextName}}State = {
  value: '',
  isLoading: false,
};

// Create context
const {{ContextName}}Context = createContext<{{ContextName}}ContextType | undefined>(undefined);

// Provider props
interface {{ContextName}}ProviderProps {
  children: React.ReactNode;
  initialValue?: string;
}

/**
 * {{ContextName}} Provider Component
 * Wrap your app or component tree with this provider to access {{ContextName}} state
 */
export const {{ContextName}}Provider: React.FC<{{ContextName}}ProviderProps> = ({ 
  children,
  initialValue = '',
}) => {
  const [state, setState] = useState<{{ContextName}}State>({
    ...initialState,
    value: initialValue,
  });

  const setValue = useCallback((value: string) => {
    setState(prev => ({ ...prev, value }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const contextValue = useMemo<{{ContextName}}ContextType>(() => ({
    ...state,
    setValue,
    reset,
  }), [state, setValue, reset]);

  return (
    <{{ContextName}}Context.Provider value={contextValue}>
      {children}
    </{{ContextName}}Context.Provider>
  );
};

/**
 * Hook to access {{ContextName}} context
 * Must be used within a {{ContextName}}Provider
 * 
 * @example
 * const { value, setValue } = use{{ContextName}}();
 */
export const use{{ContextName}} = (): {{ContextName}}ContextType => {
  const context = useContext({{ContextName}}Context);
  
  if (context === undefined) {
    throw new Error('use{{ContextName}} must be used within a {{ContextName}}Provider');
  }
  
  return context;
};

export default {{ContextName}}Provider;
`
      }
    ]
  },

  {
    id: 'react-custom-hook',
    name: 'React Custom Hook',
    description: 'A reusable custom React hook with TypeScript',
    tags: ['react', 'hook', 'typescript'],
    folderId: 'react-folder',
    variables: {
      'HookName': 'useLocalStorage'
    },
    files: [
      {
        filename: '{{HookName}}.ts',
        path: 'src/hooks',
        content: `import { useState, useEffect, useCallback } from 'react';

/**
 * {{HookName}} - Custom React Hook
 * 
 * @description Add your hook description here
 * @param initialValue - The initial value
 * @returns The hook state and actions
 * 
 * @example
 * const { value, setValue, reset } = {{HookName}}('default');
 */
export function {{HookName}}<T>(initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Reset to initial value
  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
  }, [initialValue]);

  // Example async operation
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Add your async logic here
      await new Promise(resolve => setTimeout(resolve, 1000));
      // setValue(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup logic here
    };
  }, []);

  return {
    value,
    setValue,
    reset,
    isLoading,
    error,
    fetchData,
  };
}

export default {{HookName}};
`
      },
      {
        filename: 'index.ts',
        path: 'src/hooks',
        content: `export { {{HookName}} } from './{{HookName}}';
`
      }
    ]
  },

  // ============================================
  // NEXT.JS TEMPLATES
  // ============================================
  {
    id: 'nextjs-page',
    name: 'Next.js Page (App Router)',
    description: 'A Next.js 14+ App Router page with metadata and loading state',
    tags: ['nextjs', 'react', 'typescript', 'app-router'],
    folderId: 'nextjs-folder',
    variables: {
      'PageName': 'dashboard',
      'Title': 'Dashboard'
    },
    files: [
      {
        filename: 'page.tsx',
        path: 'app/{{PageName}}',
        content: `import { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: '{{Title}}',
  description: '{{Title}} page description',
};

interface PageProps {
  params: { slug?: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function {{Title}}Page({ params, searchParams }: PageProps) {
  // Fetch data here if needed
  // const data = await fetchData();

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>{{Title}}</h1>
        <p className={styles.description}>
          Welcome to the {{Title}} page
        </p>
        
        <section className={styles.content}>
          {/* Your content here */}
        </section>
      </div>
    </main>
  );
}
`
      },
      {
        filename: 'page.module.css',
        path: 'app/{{PageName}}',
        content: `.main {
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(to bottom, #f8fafc, #e2e8f0);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.description {
  font-size: 1.125rem;
  color: #64748b;
  margin-bottom: 2rem;
}

.content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
`
      },
      {
        filename: 'loading.tsx',
        path: 'app/{{PageName}}',
        content: `export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
        <div className="h-64 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );
}
`
      },
      {
        filename: 'error.tsx',
        path: 'app/{{PageName}}',
        content: `'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Something went wrong!
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
`
      }
    ]
  },

  {
    id: 'nextjs-api-route',
    name: 'Next.js API Route',
    description: 'A Next.js 14+ API route handler with error handling',
    tags: ['nextjs', 'api', 'typescript'],
    folderId: 'nextjs-folder',
    variables: {
      'ResourceName': 'users'
    },
    files: [
      {
        filename: 'route.ts',
        path: 'app/api/{{ResourceName}}',
        content: `import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch all {{ResourceName}}
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Replace with your data fetching logic
    const data: any[] = [];
    
    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total: 0 },
    });
  } catch (error) {
    console.error('GET /api/{{ResourceName}} error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch {{ResourceName}}' },
      { status: 500 }
    );
  }
}

// POST - Create new item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const newItem = {
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { success: true, data: newItem },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/{{ResourceName}} error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
`
      },
      {
        filename: 'route.ts',
        path: 'app/api/{{ResourceName}}/[id]',
        content: `import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: { id: string };
}

// GET - Fetch single item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    // Replace with your data fetching logic
    const item = null;

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

// PUT - Update item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();
    const updatedItem = { id, ...body, updatedAt: new Date().toISOString() };

    return NextResponse.json({ success: true, data: updatedItem });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    // Replace with your deletion logic

    return NextResponse.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
`
      }
    ]
  },

  // ============================================
  // NODE.JS TEMPLATES
  // ============================================
  {
    id: 'express-api-full',
    name: 'Express REST API',
    description: 'A complete Express.js REST API with routes, controller, and middleware',
    tags: ['node', 'express', 'api', 'rest'],
    folderId: 'node-folder',
    variables: {
      'ResourceName': 'products'
    },
    files: [
      {
        filename: '{{ResourceName}}.routes.js',
        path: 'src/routes',
        content: `const express = require('express');
const router = express.Router();
const controller = require('../controllers/{{ResourceName}}.controller');
const { validateRequest } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/{{ResourceName}}
 * @desc    Get all {{ResourceName}}
 * @access  Public
 */
router.get('/', controller.getAll);

/**
 * @route   GET /api/{{ResourceName}}/:id
 * @desc    Get single item by ID
 * @access  Public
 */
router.get('/:id', controller.getById);

/**
 * @route   POST /api/{{ResourceName}}
 * @desc    Create new item
 * @access  Private
 */
router.post('/', authenticate, validateRequest, controller.create);

/**
 * @route   PUT /api/{{ResourceName}}/:id
 * @desc    Update item
 * @access  Private
 */
router.put('/:id', authenticate, validateRequest, controller.update);

/**
 * @route   DELETE /api/{{ResourceName}}/:id
 * @desc    Delete item
 * @access  Private
 */
router.delete('/:id', authenticate, controller.remove);

module.exports = router;
`
      },
      {
        filename: '{{ResourceName}}.controller.js',
        path: 'src/controllers',
        content: `/**
 * {{ResourceName}} Controller
 */

// Get all items
exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Replace with your database logic
    const items = [];
    const total = 0;

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single item
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = null; // Replace with your logic

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// Create new item
exports.create = async (req, res, next) => {
  try {
    const newItem = {
      id: Date.now(),
      ...req.body,
      createdAt: new Date(),
    };

    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Item created successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Update item
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedItem = {
      id,
      ...req.body,
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      data: updatedItem,
      message: 'Item updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete item
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Replace with your deletion logic

    res.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
`
      },
      {
        filename: 'validate.js',
        path: 'src/middleware',
        content: `/**
 * Request validation middleware
 */
exports.validateRequest = (req, res, next) => {
  const errors = [];
  const requiredFields = ['name']; // Customize this

  requiredFields.forEach(field => {
    if (!req.body[field]) {
      errors.push(\`\${field} is required\`);
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};
`
      },
      {
        filename: 'auth.js',
        path: 'src/middleware',
        content: `/**
 * Authentication middleware
 */
exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    // Verify token here (jwt.verify, etc.)
    // req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};
`
      }
    ]
  },

  // ============================================
  // PYTHON TEMPLATES
  // ============================================
  {
    id: 'python-fastapi',
    name: 'FastAPI Endpoint',
    description: 'A FastAPI REST endpoint with Pydantic models',
    tags: ['python', 'fastapi', 'api', 'pydantic'],
    folderId: 'python-folder',
    variables: {
      'ResourceName': 'items'
    },
    files: [
      {
        filename: '{{ResourceName}}.py',
        path: 'app/routers',
        content: `from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

router = APIRouter(
    prefix="/{{ResourceName}}",
    tags=["{{ResourceName}}"],
)

# Pydantic Models
class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class ItemResponse(ItemBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# In-memory storage (replace with database)
db: dict = {}

@router.get("/", response_model=List[ItemResponse])
async def get_all(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    """Get all {{ResourceName}} with pagination."""
    items = list(db.values())
    start = (page - 1) * limit
    return items[start:start + limit]

@router.get("/{item_id}", response_model=ItemResponse)
async def get_by_id(item_id: str):
    """Get a single item by ID."""
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    return db[item_id]

@router.post("/", response_model=ItemResponse, status_code=201)
async def create(item: ItemCreate):
    """Create a new item."""
    item_id = str(uuid.uuid4())
    new_item = {
        "id": item_id,
        "name": item.name,
        "description": item.description,
        "created_at": datetime.utcnow(),
    }
    db[item_id] = new_item
    return new_item

@router.delete("/{item_id}")
async def delete(item_id: str):
    """Delete an item."""
    if item_id not in db:
        raise HTTPException(status_code=404, detail="Item not found")
    del db[item_id]
    return {"message": "Item deleted successfully"}
`
      }
    ]
  },

  {
    id: 'python-class',
    name: 'Python Class',
    description: 'A well-structured Python class with type hints',
    tags: ['python', 'class', 'oop'],
    folderId: 'python-folder',
    variables: {
      'ClassName': 'DataProcessor'
    },
    files: [
      {
        filename: '{{ClassName|snakecase}}.py',
        path: 'src',
        content: `"""{{ClassName}} module."""

from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@dataclass
class {{ClassName}}Config:
    """Configuration for {{ClassName}}."""
    batch_size: int = 100
    timeout: float = 30.0
    debug: bool = False

class {{ClassName}}Error(Exception):
    """Custom exception for {{ClassName}}."""
    pass

class {{ClassName}}:
    """
    {{ClassName}} class for processing data.
    
    Example:
        >>> processor = {{ClassName}}()
        >>> result = processor.process(data)
    """
    
    def __init__(self, config: Optional[{{ClassName}}Config] = None):
        self.config = config or {{ClassName}}Config()
        self._data: List[Any] = []
        self._is_initialized = False
        logger.info(f"{{ClassName}} initialized")
    
    def initialize(self) -> None:
        """Initialize the processor."""
        try:
            self._is_initialized = True
            logger.info("{{ClassName}} ready")
        except Exception as e:
            raise {{ClassName}}Error(f"Init failed: {e}") from e
    
    def process(self, data: List[Any]) -> Dict[str, Any]:
        """Process the input data."""
        if not self._is_initialized:
            self.initialize()
        
        try:
            results = []
            for i in range(0, len(data), self.config.batch_size):
                batch = data[i:i + self.config.batch_size]
                results.extend(self._process_batch(batch))
            
            return {
                "status": "success",
                "count": len(results),
                "results": results,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            raise {{ClassName}}Error(f"Processing failed: {e}") from e
    
    def _process_batch(self, batch: List[Any]) -> List[Any]:
        """Process a single batch."""
        return [item for item in batch]  # Add your logic
    
    def cleanup(self) -> None:
        """Clean up resources."""
        self._data.clear()
        self._is_initialized = False
    
    def __enter__(self):
        self.initialize()
        return self
    
    def __exit__(self, *args):
        self.cleanup()
        return False
`
      }
    ]
  },

  // ============================================
  // HTML/CSS TEMPLATES
  // ============================================
  {
    id: 'html-landing-page',
    name: 'Landing Page',
    description: 'A modern, responsive landing page with hero and features',
    tags: ['html', 'css', 'landing-page', 'responsive'],
    folderId: 'html-folder',
    variables: {
      'ProjectName': 'Awesome App',
      'PrimaryColor': '#6366f1'
    },
    files: [
      {
        filename: 'index.html',
        path: '',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{{ProjectName}} - Your amazing product">
    <title>{{ProjectName}}</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="container">
            <a href="#" class="logo">{{ProjectName}}</a>
            <ul class="nav-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#" class="btn btn-primary">Get Started</a></li>
            </ul>
        </div>
    </nav>

    <!-- Hero Section -->
    <header class="hero">
        <div class="container">
            <h1>Build Something <span class="gradient-text">Amazing</span></h1>
            <p>{{ProjectName}} helps you create beautiful websites faster than ever.</p>
            <div class="hero-cta">
                <a href="#" class="btn btn-primary btn-lg">Get Started Free</a>
                <a href="#" class="btn btn-outline btn-lg">Learn More</a>
            </div>
        </div>
    </header>

    <!-- Features Section -->
    <section id="features" class="features">
        <div class="container">
            <h2>Powerful Features</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <span class="icon">⚡</span>
                    <h3>Lightning Fast</h3>
                    <p>Optimized for speed and performance.</p>
                </div>
                <div class="feature-card">
                    <span class="icon">🎨</span>
                    <h3>Beautiful Design</h3>
                    <p>Modern, clean interfaces.</p>
                </div>
                <div class="feature-card">
                    <span class="icon">📱</span>
                    <h3>Fully Responsive</h3>
                    <p>Looks great on every device.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 {{ProjectName}}. All rights reserved.</p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>
`
      },
      {
        filename: 'styles.css',
        path: '',
        content: `:root {
    --primary: {{PrimaryColor}};
    --primary-dark: color-mix(in srgb, {{PrimaryColor}} 80%, black);
    --gray-100: #f3f4f6;
    --gray-600: #4b5563;
    --gray-900: #111827;
    --white: #ffffff;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    color: var(--gray-600);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
}

/* Buttons */
.btn {
    display: inline-flex;
    padding: 12px 24px;
    font-weight: 600;
    text-decoration: none;
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background: var(--primary);
    color: var(--white);
}

.btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
}

.btn-outline {
    border-color: var(--gray-600);
    color: var(--gray-600);
}

.btn-lg {
    padding: 16px 32px;
}

/* Navbar */
.navbar {
    position: fixed;
    width: 100%;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(10px);
    z-index: 1000;
    padding: 16px 0;
    border-bottom: 1px solid var(--gray-100);
}

.navbar .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    font-size: 24px;
    font-weight: 700;
    color: var(--gray-900);
    text-decoration: none;
}

.nav-links {
    display: flex;
    gap: 32px;
    list-style: none;
    align-items: center;
}

.nav-links a {
    text-decoration: none;
    color: var(--gray-600);
}

/* Hero */
.hero {
    padding: 160px 0 100px;
    text-align: center;
    background: linear-gradient(to bottom, var(--gray-100), var(--white));
}

.hero h1 {
    font-size: 56px;
    color: var(--gray-900);
    margin-bottom: 24px;
}

.gradient-text {
    background: linear-gradient(135deg, var(--primary), #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.hero p {
    font-size: 20px;
    max-width: 600px;
    margin: 0 auto 40px;
}

.hero-cta {
    display: flex;
    gap: 16px;
    justify-content: center;
}

/* Features */
.features {
    padding: 100px 0;
    text-align: center;
}

.features h2 {
    font-size: 40px;
    color: var(--gray-900);
    margin-bottom: 48px;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 32px;
}

.feature-card {
    padding: 32px;
    border: 1px solid var(--gray-100);
    border-radius: 12px;
    transition: all 0.3s;
}

.feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
}

.feature-card .icon {
    font-size: 40px;
    display: block;
    margin-bottom: 16px;
}

.feature-card h3 {
    color: var(--gray-900);
    margin-bottom: 12px;
}

/* Footer */
.footer {
    padding: 40px 0;
    text-align: center;
    background: var(--gray-900);
    color: var(--white);
}

/* Responsive */
@media (max-width: 768px) {
    .hero h1 { font-size: 36px; }
    .hero-cta { flex-direction: column; align-items: center; }
    .nav-links { display: none; }
}
`
      },
      {
        filename: 'script.js',
        path: '',
        content: `// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

console.log('{{ProjectName}} loaded!');
`
      }
    ]
  },

  // ============================================
  // TYPESCRIPT TEMPLATES
  // ============================================
  {
    id: 'typescript-service',
    name: 'TypeScript Service Class',
    description: 'A TypeScript service class with dependency injection',
    tags: ['typescript', 'service', 'class'],
    folderId: 'typescript-folder',
    variables: {
      'ServiceName': 'UserService'
    },
    files: [
      {
        filename: '{{ServiceName}}.ts',
        path: 'src/services',
        content: `/**
 * {{ServiceName}} - Service class for business logic
 */

export interface {{ServiceName}}Config {
    baseUrl?: string;
    timeout?: number;
}

export interface {{ServiceName}}Result<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export class {{ServiceName}} {
    private config: Required<{{ServiceName}}Config>;

    constructor(config: {{ServiceName}}Config = {}) {
        this.config = {
            baseUrl: config.baseUrl ?? '/api',
            timeout: config.timeout ?? 30000,
        };
    }

    async execute<T>(params: Record<string, unknown>): Promise<{{ServiceName}}Result<T>> {
        try {
            this.validateParams(params);
            const result = await this.performOperation<T>(params);
            
            return { success: true, data: result };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    private validateParams(params: Record<string, unknown>): void {
        if (!params || Object.keys(params).length === 0) {
            throw new Error('Parameters are required');
        }
    }

    private async performOperation<T>(params: Record<string, unknown>): Promise<T> {
        // Implement your operation logic here
        return {} as T;
    }
}

export default {{ServiceName}};
`
      }
    ]
  },

  // ============================================
  // TESTING TEMPLATES
  // ============================================
  {
    id: 'jest-test-suite',
    name: 'Jest Test Suite',
    description: 'A Jest test file with common patterns',
    tags: ['testing', 'jest', 'typescript'],
    folderId: 'testing-folder',
    variables: {
      'ModuleName': 'Calculator'
    },
    files: [
      {
        filename: '{{ModuleName}}.test.ts',
        path: 'src/__tests__',
        content: `import { {{ModuleName}} } from '../{{ModuleName}}';

describe('{{ModuleName}}', () => {
    let instance: {{ModuleName}};

    beforeEach(() => {
        instance = new {{ModuleName}}();
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        it('should create an instance', () => {
            expect(instance).toBeDefined();
            expect(instance).toBeInstanceOf({{ModuleName}});
        });
    });

    describe('basic operations', () => {
        it('should perform operation correctly', () => {
            const result = instance.someMethod('input');
            expect(result).toBe('expected');
        });

        it('should handle edge cases', () => {
            expect(() => instance.someMethod('')).toThrow();
        });

        it.each([
            ['input1', 'output1'],
            ['input2', 'output2'],
        ])('should transform %s to %s', (input, expected) => {
            expect(instance.transform(input)).toBe(expected);
        });
    });

    describe('async operations', () => {
        it('should handle async operations', async () => {
            const result = await instance.asyncMethod();
            expect(result).toBeDefined();
        });

        it('should reject on error', async () => {
            await expect(instance.failingMethod()).rejects.toThrow();
        });
    });
});
`
      }
    ]
  },

  // ============================================
  // API TEMPLATES
  // ============================================
  {
    id: 'graphql-resolver',
    name: 'GraphQL Resolver',
    description: 'A GraphQL resolver with TypeScript types',
    tags: ['graphql', 'api', 'typescript'],
    folderId: 'api-folder',
    variables: {
      'TypeName': 'User'
    },
    files: [
      {
        filename: '{{TypeName}}.resolvers.ts',
        path: 'src/graphql/resolvers',
        content: `import { Resolvers } from '../generated/types';

// Types
interface {{TypeName}} {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
}

interface Create{{TypeName}}Input {
    name: string;
    email: string;
}

// Mock data (replace with database)
const {{TypeName|lowercase}}s: {{TypeName}}[] = [];

export const {{TypeName|lowercase}}Resolvers: Resolvers = {
    Query: {
        {{TypeName|lowercase}}s: async (_, { limit = 10, offset = 0 }) => {
            return {{TypeName|lowercase}}s.slice(offset, offset + limit);
        },
        
        {{TypeName|lowercase}}: async (_, { id }) => {
            return {{TypeName|lowercase}}s.find(u => u.id === id) || null;
        },
    },
    
    Mutation: {
        create{{TypeName}}: async (_, { input }: { input: Create{{TypeName}}Input }) => {
            const new{{TypeName}}: {{TypeName}} = {
                id: crypto.randomUUID(),
                ...input,
                createdAt: new Date(),
            };
            {{TypeName|lowercase}}s.push(new{{TypeName}});
            return new{{TypeName}};
        },
        
        delete{{TypeName}}: async (_, { id }) => {
            const index = {{TypeName|lowercase}}s.findIndex(u => u.id === id);
            if (index === -1) return false;
            {{TypeName|lowercase}}s.splice(index, 1);
            return true;
        },
    },
};
`
      },
      {
        filename: '{{TypeName}}.typeDefs.ts',
        path: 'src/graphql/typeDefs',
        content: `import { gql } from 'graphql-tag';

export const {{TypeName|lowercase}}TypeDefs = gql\`
    type {{TypeName}} {
        id: ID!
        name: String!
        email: String!
        createdAt: DateTime!
    }

    input Create{{TypeName}}Input {
        name: String!
        email: String!
    }

    extend type Query {
        {{TypeName|lowercase}}s(limit: Int, offset: Int): [{{TypeName}}!]!
        {{TypeName|lowercase}}(id: ID!): {{TypeName}}
    }

    extend type Mutation {
        create{{TypeName}}(input: Create{{TypeName}}Input!): {{TypeName}}!
        delete{{TypeName}}(id: ID!): Boolean!
    }
\`;
`
      }
    ]
  },

  {
    id: 'prisma-model',
    name: 'Prisma Model & Service',
    description: 'A Prisma model with CRUD service',
    tags: ['prisma', 'database', 'typescript'],
    folderId: 'api-folder',
    variables: {
      'ModelName': 'Post'
    },
    files: [
      {
        filename: '{{ModelName|lowercase}}.prisma',
        path: 'prisma/models',
        content: `// Add this to your schema.prisma file

model {{ModelName}} {
    id        String   @id @default(cuid())
    title     String
    content   String?
    published Boolean  @default(false)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    
    // Relations
    // authorId  String
    // author    User     @relation(fields: [authorId], references: [id])
    
    @@map("{{ModelName|lowercase}}s")
}
`
      },
      {
        filename: '{{ModelName|lowercase}}.service.ts',
        path: 'src/services',
        content: `import { PrismaClient, {{ModelName}} } from '@prisma/client';

const prisma = new PrismaClient();

export interface Create{{ModelName}}Input {
    title: string;
    content?: string;
}

export interface Update{{ModelName}}Input {
    title?: string;
    content?: string;
    published?: boolean;
}

export class {{ModelName}}Service {
    async findAll(params: {
        skip?: number;
        take?: number;
        where?: { published?: boolean };
    } = {}): Promise<{{ModelName}}[]> {
        return prisma.{{ModelName|lowercase}}.findMany({
            skip: params.skip,
            take: params.take ?? 10,
            where: params.where,
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string): Promise<{{ModelName}} | null> {
        return prisma.{{ModelName|lowercase}}.findUnique({ where: { id } });
    }

    async create(data: Create{{ModelName}}Input): Promise<{{ModelName}}> {
        return prisma.{{ModelName|lowercase}}.create({ data });
    }

    async update(id: string, data: Update{{ModelName}}Input): Promise<{{ModelName}}> {
        return prisma.{{ModelName|lowercase}}.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<{{ModelName}}> {
        return prisma.{{ModelName|lowercase}}.delete({ where: { id } });
    }

    async publish(id: string): Promise<{{ModelName}}> {
        return this.update(id, { published: true });
    }
}

export default new {{ModelName}}Service();
`
      }
    ]
  },
];
