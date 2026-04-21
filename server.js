const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Data file paths
const TESTS_FILE = '/data/tests.json';
const RESULTS_FILE = '/data/results.json';

// Ensure data directory exists
const ensureDataDir = async () => {
  try {
    await fs.mkdir('/data', { recursive: true });
  } catch (error) {
    console.log('Data directory already exists');
  }
};

// Initialize data files with sample data if they don't exist
const initializeData = async () => {
  await ensureDataDir();
  
  try {
    await fs.access(TESTS_FILE);
  } catch {
    const sampleTests = [
      {
        id: uuidv4(),
        title: 'JavaScript Basics',
        description: 'Test your knowledge of JavaScript fundamentals including variables, functions, and data types.',
        questions: [
          {
            id: uuidv4(),
            text: 'What is the correct way to declare a variable in JavaScript?',
            options: ['var myVar;', 'variable myVar;', 'v myVar;', 'declare myVar;'],
            correctAnswer: 0
          },
          {
            id: uuidv4(),
            text: 'Which of the following is NOT a JavaScript data type?',
            options: ['String', 'Boolean', 'Integer', 'Object'],
            correctAnswer: 2
          },
          {
            id: uuidv4(),
            text: 'How do you create a function in JavaScript?',
            options: ['function = myFunction() {}', 'function myFunction() {}', 'create myFunction() {}', 'def myFunction() {}'],
            correctAnswer: 1
          }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        title: 'React Fundamentals',
        description: 'Assess your understanding of React components, state, and props.',
        questions: [
          {
            id: uuidv4(),
            text: 'What is JSX?',
            options: ['A JavaScript library', 'A syntax extension for JavaScript', 'A database', 'A testing framework'],
            correctAnswer: 1
          },
          {
            id: uuidv4(),
            text: 'How do you pass data from parent to child component?',
            options: ['Through state', 'Through props', 'Through context', 'Through refs'],
            correctAnswer: 1
          }
        ],
        createdAt: new Date().toISOString()
      }
    ];
    await fs.writeFile(TESTS_FILE, JSON.stringify(sampleTests, null, 2));
    console.log('Sample tests initialized');
  }
  
  try {
    await fs.access(RESULTS_FILE);
  } catch {
    await fs.writeFile(RESULTS_FILE, JSON.stringify([], null, 2));
    console.log('Results file initialized');
  }
};

// Helper functions
const readJsonFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
};

const writeJsonFile = async (filePath, data) => {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    throw error;
  }
};

// Routes

// Get all tests
app.get('/api/tests', async (req, res) => {
  try {
    const tests = await readJsonFile(TESTS_FILE);
    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// Get specific test by ID
app.get('/api/tests/:id', async (req, res) => {
  try {
    const tests = await readJsonFile(TESTS_FILE);
    const test = tests.find(t => t.id === req.params.id);
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    
    res.json(test);
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// Create new test
app.post('/api/tests', async (req, res) => {
  try {
    const { title, description, questions } = req.body;
    
    if (!title || !description || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const tests = await readJsonFile(TESTS_FILE);
    
    const newTest = {
      id: uuidv4(),
      title,
      description,
      questions: questions.map(q => ({
        ...q,
        id: q.id || uuidv4()
      })),
      createdAt: new Date().toISOString()
    };
    
    tests.push(newTest);
    await writeJsonFile(TESTS_FILE, tests);
    
    console.log(`Created test: ${title}`);
    res.status(201).json(newTest);
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
});

// Get all results
app.get('/api/results', async (req, res) => {
  try {
    const results = await readJsonFile(RESULTS_FILE);
    // Sort by completion date (newest first)
    results.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Submit test result
app.post('/api/results', async (req, res) => {
  try {
    const { testId, testTitle, score, totalQuestions } = req.body;
    
    if (testId === undefined || testTitle === undefined || score === undefined || totalQuestions === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const results = await readJsonFile(RESULTS_FILE);
    
    const newResult = {
      id: uuidv4(),
      testId,
      testTitle,
      score,
      totalQuestions,
      completedAt: new Date().toISOString()
    };
    
    results.push(newResult);
    await writeJsonFile(RESULTS_FILE, results);
    
    console.log(`Test result saved: ${testTitle} - ${score}/${totalQuestions}`);
    res.status(201).json(newResult);
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(500).json({ error: 'Failed to save result' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    await initializeData();
    app.listen(PORT, () => {
      console.log(`Test API server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();